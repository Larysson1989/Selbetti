"""
dashboard.py
============
Coleta dados de várias frentes da API Nexus (filas, agentes, campanhas,
tabulações, pesquisa de satisfação, chat) e consolida tudo em um único
arquivo Excel (dashboard_nexus_AAAAMMDD_HHMM.xlsx), com uma aba por tema.

Quais relatórios são coletados é controlado por relatorios_config.json
(gerado/editado com "python selecionar_relatorios.py"). Se o arquivo não
existir ainda, roda com a seleção padrão (tudo ativo, exceto os endpoints
historicamente lentos — veja registry.py).

Como rodar:
    1. Configure o arquivo .env (copie de .env.example) com:
         NEXUS_BASE_URL=http://IP.DO.SEU.NEXUS
         NEXUS_TOKEN=seu_token
    2. (Opcional, mas recomendado) Escolha o que coletar:
         python selecionar_relatorios.py
    3. python dashboard.py
       (opcional) python dashboard.py --dias 7
       (opcional) python dashboard.py --data-ini 2026-07-01 --data-fim 2026-07-09
       (opcional) python dashboard.py --selecionar   # abre o menu antes de rodar

O script é tolerante a falhas: se um endpoint específico falhar (ex.: você
não usa Chat, ou uma campanha não existe), ele registra o erro na aba
"_erros" e continua coletando o resto — não interrompe o dashboard inteiro.
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from dotenv import load_dotenv

from nexus_client import NexusClient, NexusAPIError
from registry import load_config

logger = logging.getLogger("dashboard")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def _to_df(data: Any) -> pd.DataFrame:
    """Normaliza respostas variadas (list, dict de dicts, dict simples) para DataFrame."""
    if data is None:
        return pd.DataFrame()
    if isinstance(data, list):
        return pd.json_normalize(data)
    if isinstance(data, dict):
        if data and all(isinstance(v, dict) for v in data.values()):
            df = pd.json_normalize(list(data.values()))
            df.insert(0, "chave", list(data.keys()))
            return df
        return pd.json_normalize([data])
    return pd.DataFrame([{"valor": data}])


class DashboardBuilder:
    def __init__(self, client: NexusClient, config: Optional[dict] = None):
        self.client = client
        self.config = config if config is not None else load_config()
        self.sheets: dict = {}
        self.erros: list = []

    def _ativo(self, report_id: str) -> bool:
        return bool(self.config.get(report_id, True))

    def _pulado(self, nome_aba: str):
        logger.info("Pulando (desativado na seleção): %s", nome_aba)

    def _coletar(self, nome_aba: str, func, *args, **kwargs):
        """Executa uma chamada da API e guarda o resultado (ou o erro) de forma segura."""
        logger.info("Coletando: %s", nome_aba)
        try:
            resultado = func(*args, **kwargs)
            payload = resultado.get("response", resultado) if isinstance(resultado, dict) else resultado
            df = _to_df(payload)
            if df.empty:
                df = pd.DataFrame([{"info": "Sem dados retornados"}])
            self.sheets[nome_aba] = df
        except NexusAPIError as e:
            logger.warning("Falhou [%s]: %s", nome_aba, e)
            self.erros.append({"aba": nome_aba, "erro": str(e), "http_status": e.http_status})
        except Exception as e:  # noqa: BLE001
            logger.warning("Falhou [%s] (erro inesperado): %s", nome_aba, e)
            self.erros.append({"aba": nome_aba, "erro": str(e), "http_status": None})

    # ---- Blocos de coleta ---------------------------------------------

    def coletar_status_tempo_real(self):
        if self._ativo("status_call_center"):
            self._coletar("status_call_center", self.client.nexus.status_call_center)
        else:
            self._pulado("status_call_center")

        if self._ativo("ramais"):
            self._coletar("ramais", self.client.nexus.ramais)
        else:
            self._pulado("ramais")

        if self._ativo("status_discador"):
            self._coletar("status_discador", self.client.nexus.status_discador)
        else:
            self._pulado("status_discador")

    def coletar_filas(self):
        if self._ativo("filas_lista"):
            self._coletar("filas_lista", self.client.filas.lista)
        else:
            self._pulado("filas_lista")

        if self._ativo("chat_filas"):
            self._coletar("chat_filas", self.client.chat.listar_filas)
        else:
            self._pulado("chat_filas")

    def coletar_campanhas(self):
        if self._ativo("campanhas_lista"):
            self._coletar("campanhas_lista", self.client.campanhas.lista)
        else:
            self._pulado("campanhas_lista")

        if not self._ativo("campanhas_alvos_restantes"):
            self._pulado("campanhas_alvos_restantes")
            return

        try:
            campanhas_resp = self.client.campanhas.lista()
            campanhas = campanhas_resp.get("response", [])
            linhas_alvos = []
            for camp in campanhas:
                id_int = camp.get("idintegracao")
                if id_int is None:
                    continue
                try:
                    r = self.client.campanhas.alvos_restantes(id_int)
                    dados = r.get("response", {})
                    linhas_alvos.append({
                        "idintegracao": id_int,
                        "nome": camp.get("nome"),
                        "restantes": dados.get("restantes"),
                        "agendamentos": dados.get("agendamentos"),
                    })
                except NexusAPIError as e:
                    self.erros.append({"aba": f"alvos_restantes[{id_int}]", "erro": str(e),
                                        "http_status": e.http_status})
            if linhas_alvos:
                self.sheets["campanhas_alvos_restantes"] = pd.DataFrame(linhas_alvos)
        except Exception as e:  # noqa: BLE001
            self.erros.append({"aba": "campanhas_alvos_restantes", "erro": str(e), "http_status": None})

    def coletar_relatorios(self, data_ini: str, data_fim: str,
                            data_ini_fmt2: str, data_fim_fmt2: str,
                            telefone_tabulacoes: Optional[str] = None):
        """
        data_ini/data_fim: formato YYYY-MM-DD (usado por relatórios de campanha/pausas)
        data_ini_fmt2/data_fim_fmt2: formato YYYY/MM/DD HH:MM:SS (usado por tabulações/gravações/satisfação)
        telefone_tabulacoes: número (DDD+NUMERO) exigido pelo relatório de tabulações nesta
                              instalação da Nexus. Sem ele, o relatório é pulado automaticamente
                              (não faz sentido tentar - o servidor sempre rejeita sem um número válido).
        """
        if self._ativo("relatorio_tabulacoes"):
            if telefone_tabulacoes:
                self._coletar("relatorio_tabulacoes", self.client.relatorios.tabulacoes,
                               data_ini_fmt2, data_fim_fmt2, telefone_tabulacoes)
            else:
                logger.info(
                    "Pulando relatorio_tabulacoes: esta instalação exige um telefone específico "
                    "(DDD+NUMERO). Use --telefone-tabulacoes 4133221336 ou defina "
                    "NEXUS_TELEFONE_TABULACOES no .env para ativar esta coleta."
                )
        else:
            self._pulado("relatorio_tabulacoes")

        if self._ativo("relatorio_gravacoes"):
            self._coletar("relatorio_gravacoes", self.client.relatorios.gravacoes,
                           data_ini_fmt2, data_fim_fmt2)
        else:
            self._pulado("relatorio_gravacoes")

        if self._ativo("relatorio_satisfacao"):
            self._coletar("relatorio_satisfacao", self.client.relatorios.pesquisa_satisfacao,
                           data_ini_fmt2, data_fim_fmt2)
        else:
            self._pulado("relatorio_satisfacao")

        precisa_campanhas = any(self._ativo(x) for x in (
            "relatorio_discador_campanha",
            "relatorio_pausas_campanha",
            "relatorio_login_logoff_campanha",
        ))
        if not precisa_campanhas:
            return

        try:
            campanhas_resp = self.client.campanhas.lista()
            campanhas = campanhas_resp.get("response", [])
            if not campanhas:
                logger.info("Nenhuma campanha retornada por campanhas.lista() - pulando relatórios por campanha.")
            for camp in campanhas:
                id_int = camp.get("idintegracao")
                if id_int is None:
                    continue
                if self._ativo("relatorio_discador_campanha"):
                    self._coletar(f"discador_{id_int}", self.client.relatorios.discador,
                                   id_int, data_ini, data_fim)
                if self._ativo("relatorio_pausas_campanha"):
                    self._coletar(f"pausas_{id_int}", self.client.relatorios.pausas,
                                   id_int, data_ini, data_fim)
                if self._ativo("relatorio_login_logoff_campanha"):
                    self._coletar(f"loginlogoff_{id_int}", self.client.relatorios.login_logoff,
                                   id_int, data_ini, data_fim)
        except Exception as e:  # noqa: BLE001
            self.erros.append({"aba": "relatorios_por_campanha", "erro": str(e), "http_status": None})

    def finalizar(self) -> pd.DataFrame:
        df_erros = pd.DataFrame(self.erros) if self.erros else pd.DataFrame([{"info": "Nenhum erro"}])
        self.sheets["_erros"] = df_erros
        return df_erros

    def exportar_excel(self, caminho: Path):
        with pd.ExcelWriter(caminho, engine="openpyxl") as writer:
            resumo = pd.DataFrame([
                {"aba": nome, "linhas": len(df)} for nome, df in self.sheets.items()
            ])
            resumo.to_excel(writer, sheet_name="_resumo", index=False)

            for nome, df in self.sheets.items():
                aba = nome[:31]  # limite do Excel para nome de aba
                df.to_excel(writer, sheet_name=aba, index=False)
        logger.info("Dashboard exportado para: %s", caminho.resolve())


def main():
    parser = argparse.ArgumentParser(description="Gera dashboard consolidado da API Nexus.")
    parser.add_argument("--dias", type=int, default=1, help="Quantidade de dias para trás nos relatórios (default: 1)")
    parser.add_argument("--data-ini", type=str, default=None, help="Data inicial (YYYY-MM-DD)")
    parser.add_argument("--data-fim", type=str, default=None, help="Data final (YYYY-MM-DD)")
    parser.add_argument("--saida", type=str, default=None, help="Caminho do arquivo Excel de saída")
    parser.add_argument("--selecionar", action="store_true",
                         help="Abre o menu interativo de seleção de relatórios antes de rodar")
    parser.add_argument("--telefone-tabulacoes", type=str, default=None,
                         help="Número (DDDNUMERO) exigido pelo relatório de tabulações nesta instalação. "
                              "Também pode ser definido via NEXUS_TELEFONE_TABULACOES no .env")
    args = parser.parse_args()

    load_dotenv()

    if args.selecionar:
        import selecionar_relatorios
        selecionar_relatorios.main()

    config = load_config()

    try:
        client = NexusClient()
    except ValueError as e:
        logger.error(str(e))
        sys.exit(1)

    if args.data_fim:
        data_fim_dt = datetime.strptime(args.data_fim, "%Y-%m-%d")
    else:
        data_fim_dt = datetime.now()

    if args.data_ini:
        data_ini_dt = datetime.strptime(args.data_ini, "%Y-%m-%d")
    else:
        data_ini_dt = data_fim_dt - timedelta(days=args.dias)

    data_ini = data_ini_dt.strftime("%Y-%m-%d")
    data_fim = data_fim_dt.strftime("%Y-%m-%d")
    data_ini_fmt2 = data_ini_dt.strftime("%Y/%m/%d 00:00:00")
    data_fim_fmt2 = data_fim_dt.strftime("%Y/%m/%d 23:59:59")

    logger.info("Período do relatório: %s até %s", data_ini, data_fim)

    builder = DashboardBuilder(client, config=config)
    builder.coletar_status_tempo_real()
    builder.coletar_filas()
    builder.coletar_campanhas()

    telefone_tabulacoes = args.telefone_tabulacoes or os.getenv("NEXUS_TELEFONE_TABULACOES")
    builder.coletar_relatorios(data_ini, data_fim, data_ini_fmt2, data_fim_fmt2,
                                telefone_tabulacoes=telefone_tabulacoes)
    builder.finalizar()

    if args.saida:
        saida = Path(args.saida)
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        saida = Path(f"dashboard_nexus_{timestamp}.xlsx")

    builder.exportar_excel(saida)


if __name__ == "__main__":
    main()
