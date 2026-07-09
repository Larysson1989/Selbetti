"""
nexus_client.py
================
Cliente Python para a API Nexus (Nexcore Tecnologia) - ncall/api/v1

Cobre os grupos de endpoints da documentação "API Integração Nexus":
Agentes, Campanhas, Chat, Contatos, Diversos, Email, Extensão, Feriados,
Filas, Integração, Nexus, Protocolo, Relatórios, Restrição, Tabulações.

Uso básico:
    from nexus_client import NexusClient

    client = NexusClient(base_url="http://IP.NEXUS", token="SEU_TOKEN")
    resp = client.agentes.consulta_estado("1234")
    print(resp)

Configuração recomendada via variáveis de ambiente (arquivo .env):
    NEXUS_BASE_URL=http://IP.DO.SEU.NEXUS
    NEXUS_TOKEN=seu_token_aqui

Autor: gerado para uso interno / dashboard de consumo de dados Nexus.
"""

from __future__ import annotations

import base64
import json
import os
import time
import logging
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger("nexus_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class NexusAPIError(Exception):
    """Erro retornado pela API Nexus (status=false ou HTTP 4xx/5xx)."""

    def __init__(self, message: str, http_status: Optional[int] = None, payload: Optional[dict] = None):
        super().__init__(message)
        self.http_status = http_status
        self.payload = payload or {}


class _BaseSession:
    """
    Wrapper de baixo nível sobre requests.Session, cuidando de:
    - Header Token
    - Content-Type padrão
    - Retentativas (retry) em falhas de rede / 5xx
    - Tratamento de erro padronizado (status=false)
    """

    def __init__(self, base_url: str, token: str, timeout: int = 30, max_retries: int = 3):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

        self.session = requests.Session()
        retries = Retry(
            total=max_retries,
            backoff_factor=1.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _headers(self, content_type: str = "application/json") -> dict:
        headers = {"Token": self.token}
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def _url(self, path: str) -> str:
        path = path.lstrip("/")
        return f"{self.base_url}/{path}"

    def request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json_body: Optional[dict] = None,
        data: Optional[dict] = None,
        files: Optional[dict] = None,
        content_type: str = "application/json",
        raw: bool = False,
    ) -> Any:
        """
        Executa a requisição HTTP e trata o padrão de resposta da API Nexus.
        Se raw=True, retorna a Response inteira (útil para downloads binários).
        """
        url = self._url(path)
        headers = self._headers(content_type=content_type if not files else None)

        logger.debug("Chamando %s %s", method, url)

        resp = self.session.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=json_body if (json_body is not None and not files and not data) else None,
            data=data if (data is not None or files is not None) else None,
            files=files,
            timeout=self.timeout,
        )

        if raw:
            return resp

        # Alguns endpoints da Nexus retornam texto puro (não JSON), ex: getop.php
        try:
            payload = resp.json()
        except ValueError:
            if resp.ok:
                return resp.text
            raise NexusAPIError(
                f"Resposta não-JSON e HTTP {resp.status_code}: {resp.text[:300]}",
                http_status=resp.status_code,
            )

        # Padrão da Nexus: {"status": true/false, "message": "...", "response": ...}
        if isinstance(payload, dict) and payload.get("status") is False:
            raise NexusAPIError(
                payload.get("message", "Erro desconhecido na API Nexus"),
                http_status=resp.status_code,
                payload=payload,
            )

        if not resp.ok:
            raise NexusAPIError(
                f"HTTP {resp.status_code} ao chamar {url}",
                http_status=resp.status_code,
                payload=payload if isinstance(payload, dict) else {},
            )

        return payload

    def get(self, path: str, params: Optional[dict] = None) -> Any:
        return self.request("GET", path, params=params)

    def post(self, path: str, json_body: Optional[dict] = None, params: Optional[dict] = None) -> Any:
        return self.request("POST", path, json_body=json_body, params=params)

    def post_multipart(self, path: str, data: Optional[dict] = None, files: Optional[dict] = None) -> Any:
        return self.request("POST", path, data=data, files=files)


# --------------------------------------------------------------------------
# Grupos de endpoints (namespaces), espelhando as seções da documentação
# --------------------------------------------------------------------------

class AgentesAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def agendamento_por_campo(self, ramal_ou_login: str, id_externo: int, campo_mailing: int,
                               campo_valor: str, data_hora: str, numero: Optional[int] = None) -> dict:
        body = {"idExterno": id_externo, "campoMailing": campo_mailing,
                "campoValor": campo_valor, "dataHora": data_hora}
        if numero is not None:
            body["numero"] = numero
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/agendamentoPorCampo", body)

    def agendamento(self, ramal_ou_login: str, id_alvo: int, data_hora: str,
                     numero: Optional[int] = None) -> dict:
        body = {"idAlvo": id_alvo, "dataHora": data_hora}
        if numero is not None:
            body["numero"] = numero
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/agendamento", body)

    def altera_estado(self, ramal_ou_login: str, id_estado: int) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/alteraEstado", {"idEstado": id_estado})

    def associa(self, ramal_ou_login: str, id_externo: int) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/associa", {"idExterno": id_externo})

    def busca_modelos_mensagem(self, ramal: int, id_fila: int, id_campanha: int) -> dict:
        body = {"ramal": ramal, "idFila": id_fila, "idCampanha": id_campanha}
        return self.s.post("/ncall/api/v1/chat/buscaModelosMensagem", body)

    def coleta_dados(self, ramal_ou_login: str, piloto_ura: int) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/coletaDados", {"pilotoURA": piloto_ura})

    def consulta_estado(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/consultaEstado")

    def consulta_motivo_pausa(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/consultaMotivoPausa")

    def desassocia(self, ramal_ou_login: str, id_externo: int) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/desassocia", {"idExterno": id_externo})

    def desliga(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/desliga")

    def disca(self, ramal_ou_login: str, destino: int, uniqueid: bool = True, auto_answer: bool = True) -> dict:
        body = {"destino": destino, "uniqueid": uniqueid, "autoAnswer": auto_answer}
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/disca", body)

    def envia_email(self, protocolo: str, id_externo: int, destino: str, assunto: str,
                     corpo_html: str, cc: str = "", cco: str = "", nome_origem: str = "",
                     email_origem: str = "", anexos: Optional[dict] = None) -> dict:
        """corpo_html: texto puro HTML (será convertido para base64 automaticamente)."""
        data = {
            "idExterno": id_externo,
            "destino": destino,
            "assunto": assunto,
            "corpo": base64.b64encode(corpo_html.encode("utf-8")).decode("ascii"),
            "cc": cc,
            "cco": cco,
            "nomeOrigem": nome_origem,
            "emailOrigem": email_origem,
        }
        return self.s.post_multipart(f"/ncall/api/v1/agentes/{protocolo}/enviaEmail", data=data, files=anexos)

    def enviar_modelo_mensagem(self, login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{login}/enviarModeloMensagem")

    def fila(self, ramal_ou_login: str, **extra_params) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/fila", extra_params or {})

    def login_unico(self, username: str) -> dict:
        return self.s.post("/ncall/api/v1/auth/login-unico", {"username": username})

    def login(self, ramal_ou_login: str, pa: Optional[str] = None) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/login", {"pa": pa} if pa else {})

    def logoff(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/logoff")

    def mute(self, ramal_ou_login: str, estado: int) -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/mute", {"estado": estado})

    def pas_disponiveis(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/pasDisponiveis")

    def pausas_disponiveis(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/pausasDisponiveis")

    def pin(self, login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{login}/pin")

    def status(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/status")

    def teste_chamada(self, ramal_ou_login: str) -> dict:
        return self.s.get(f"/ncall/api/v1/agentes/{ramal_ou_login}/testeChamada")

    def transfere(self, ramal_ou_login: str, destino: int, tipo: str = "cega") -> dict:
        return self.s.post(f"/ncall/api/v1/agentes/{ramal_ou_login}/transfere",
                            {"destino": destino, "tipo": tipo})


class CampanhasAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def adiciona_contato(self, id_externo: int, campos: dict, pular_bls: int = 0,
                          remove_char_especiais: int = 0) -> dict:
        body = {"pularBLS": pular_bls, "campos": campos, "removeCharEspeciais": remove_char_especiais}
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/addContato", body)

    def adiciona_telefone_contato(self, id_externo: int, contatos: list) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/addTelefoneContato", params={"_body": json.dumps(contatos)})

    def adiciona(self, id_externo: int, nome: str, tipo_integracao: int, tipo_camp: int) -> dict:
        body = {"nome": nome, "tipoIntegracao": tipo_integracao, "tipoCamp": tipo_camp}
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/add", body)

    def agentes_logados(self, id_externo: int, apenas_disponiveis: int = 0) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/agentesLogados",
                            {"apenasDisponiveis": apenas_disponiveis})

    def agentes(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/agentes")

    def altera_grupo_rota(self, id_externo: int, id_grupo: int) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/alteraGrupoRota", {"idGrupo": id_grupo})

    def alvos_restantes(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/alvosRestantes")

    def ativar(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/ativar")

    def deletar(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/del")

    def desativa_alvo_por_campo(self, id: int, file_type: str = "JSON", **extra) -> dict:
        body = {"id": id, "fileType": file_type, **extra}
        return self.s.post("/ncall/api/v1/campanhas/desativaAlvoPorCampo", body)

    def desativa_alvos_do_mailing(self, id_externo: int, campo_mailing: int, campo_valor: str) -> dict:
        body = {"campoMailing": campo_mailing, "campoValor": campo_valor}
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/desativaAlvosDoMailing", body)

    def desativa_contato_chat(self, id_externo: int, alvo: Any) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/desativaContatoChat", {"alvo": alvo})

    def desativa_contato_mailing(self, id: int) -> dict:
        return self.s.post("/ncall/api/v1/campanhas/desativaContatoMailing", {"id": id})

    def edita(self, id_externo: int, json_dados: dict) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/edit", {"jsonDados": json_dados})

    def lista_dados(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/listaDados")

    def lista_tabulacoes(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/listaTabulacoes")

    def lista(self) -> dict:
        return self.s.get("/ncall/api/v1/campanhas/lista")

    def mailing_edita_dados(self, id_externo: int, contatos: list) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/mailingEditaDados", params={"_body": json.dumps(contatos)})

    def pausar(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/campanhas/{id_externo}/pausar")

    def remove_agente(self, id_externo: int, ramal: int) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/removeAgente", {"ramal": ramal})

    def remove_numero_mailing(self, id_externo: int, numero: int) -> dict:
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/removeNumeroMailing", {"numero": numero})

    def tabula_discador_por_campo(self, id_externo: int, campo_mailing: int, campo_valor: str,
                                   id_tabulacao: int, id_status: int) -> dict:
        body = {"campoMailing": campo_mailing, "campoValor": campo_valor,
                "idTabulacao": id_tabulacao, "idStatus": id_status}
        return self.s.post(f"/ncall/api/v1/campanhas/{id_externo}/tabulaDiscadorPorCampo", body)


class ChatAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def envia_modelo_mensagem(self, destino: str, id_fila: Optional[int] = None, id_modelo: Optional[int] = None,
                               id_campanha: Optional[int] = None, variaveis: Optional[list] = None,
                               id_canal: Optional[int] = None, elementname: Optional[str] = None,
                               data_disparo: Optional[str] = None) -> dict:
        body: dict = {"destino": destino}
        if id_fila is not None:
            body["idFila"] = id_fila
        if id_modelo is not None:
            body["idModelo"] = id_modelo
        if id_campanha is not None:
            body["idCampanha"] = id_campanha
        if variaveis is not None:
            body["variaveis"] = variaveis
        if id_canal is not None:
            body["idCanal"] = id_canal
        if elementname is not None:
            body["elementname"] = elementname
        if data_disparo is not None:
            body["dataDisparo"] = data_disparo
        return self.s.post("/ncall/api/v1/chat/enviaModeloMensagem", body)

    def lista_modelos_mensagem(self, id_hsm: Optional[int] = None, id_fila: Optional[int] = None,
                                id_campanha: Optional[int] = None, id_canal: Optional[int] = None) -> dict:
        params = {k: v for k, v in {"idHsm": id_hsm, "idFila": id_fila,
                                     "idCampanha": id_campanha, "idCanal": id_canal}.items() if v is not None}
        return self.s.get("/ncall/api/v1/chat/listaModelosMensagem", params=params)

    def listar_filas(self) -> dict:
        return self.s.get("/ncall/api/v1/chat/filas")

    def mensagens(self, protocolos: list) -> dict:
        return self.s.post("/ncall/api/v1/chat/mensagens", {"protocolos": protocolos})

    def consulta_status_mensagem(self, id_mensagem: list) -> dict:
        return self.s.post("/ncall/api/v1/chat/consultaStatusMensagem", {"idMensagem": id_mensagem})


class ContatosAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def add_contato(self, **params) -> dict:
        return self.s.post("/ncall/api/v1/contatos/addContato", params)

    def set_contato_old(self, **params) -> dict:
        return self.s.post("/ncall/api/v1/contatos/setContatoOld", params)

    def buscar(self, id_agente: Optional[int] = None, status: Optional[str] = None,
               pagina: int = 1, limite: int = 10) -> dict:
        params = {"pagina": pagina, "limite": limite}
        if id_agente is not None:
            params["idAgente"] = id_agente
        if status is not None:
            params["status"] = status
        return self.s.post("/ncall/api/v1/contato/buscar", params)

    def gerenciar(self, payload: dict) -> dict:
        """payload já deve conter 'nomeAcao' (novoContato, editarContato, mudarStatusContatos, buscarContato)."""
        return self.s.post("/ncall/api/v1/contatos/contato", payload)

    def importar(self, contatos: list, substituir_nome_contato: Optional[bool] = None) -> dict:
        params = {}
        if substituir_nome_contato is not None:
            params["substituirNomeContato"] = str(substituir_nome_contato).lower()
        return self.s.post("/ncall/api/v1/contatos/importarContatos", contatos) if not params else \
            self.s.request("POST", "/ncall/api/v1/contatos/importarContatos", json_body=contatos, params=params)

    def eventos_externos(self, id_ext: str, descricao: Any) -> dict:
        return self.s.post(f"/ncall/api/v1/contatos/{id_ext}/eventos", {"descricao": descricao})


class FilasAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def add_agente(self, id_externo: int, ramal: int) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/addAgente", {"ramal": ramal})

    def add_pa(self, id_externo: int, login: str, novo: int = 1, descricao: str = "",
               senha: str = "", nat: int = 0) -> dict:
        body = {"login": login, "novo": novo, "descricao": descricao, "senha": senha, "nat": nat}
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/addPA", body)

    def agentes(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/filas/{id_externo}/agentes")

    def altera_pa(self, id_externo: int, login_pa: str, login: str, descricao: str,
                   senha: str, nat: int) -> dict:
        body = {"loginPA": login_pa, "login": login, "descricao": descricao, "senha": senha, "nat": nat}
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/alteraPA", body)

    def altera_status(self, id_externo: int, status: int) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/alteraStatus", {"status": status})

    def altera_url(self, id_externo: int, tipo_url: str, url: str, request: int = 0) -> dict:
        body = {"tipoUrl": tipo_url, "url": url, "request": request}
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/alteraURL", body)

    def associa_pa(self, id_externo: int, login_pas: dict) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/associaPA", {"loginPAs": login_pas})

    def get_conf_filas(self, filtro: Optional[list] = None, colunas_retorno: Optional[list] = None) -> dict:
        body = {"filtro": filtro or [], "colunasRetorno": colunas_retorno or []}
        return self.s.post("/ncall/api/v1/filas/getConfFilas", body)

    def detalhes_pausa(self, id_pausa: int) -> dict:
        return self.s.get(f"/ncall/api/v1/filas/pausas/{id_pausa}/detalhes")

    def edit_agente(self, id_externo: int, ramal_ou_login: str, json_dados: dict) -> dict:
        body = {"ramalOuLogin": ramal_ou_login, "jsonDados": json_dados}
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/editAgente", body)

    def lista_dados_agente(self, id_externo: int, ramal_ou_login: str) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/listaDadosAgente", {"ramalOuLogin": ramal_ou_login})

    def lista_pas(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/filas/{id_externo}/listaPAs")

    def lista_pausas_disponiveis(self, id_externo: int) -> dict:
        return self.s.get(f"/ncall/api/v1/filas/{id_externo}/listaPausasDisponiveis")

    def lista(self) -> dict:
        return self.s.get("/ncall/api/v1/filas/lista")

    def pausa_associa(self, id_externo: int, id_pausa: int) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/pausaAssocia", {"idPausa": id_pausa})

    def pausa_desassocia(self, id_externo: int, id_pausa: int) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/pausaDesassocia", {"idPausa": id_pausa})

    def remove_pa(self, id_externo: int, login: str) -> dict:
        return self.s.post(f"/ncall/api/v1/filas/{id_externo}/removePA", {"login": login})


class ExtensaoAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def get_agent_config(self, **params) -> dict:
        return self.s.get("/ncall/api/v1/extensao/getAgentConfig", params=params)

    def get_parametros(self, **params) -> dict:
        return self.s.get("/ncall/api/v1/extensao/getParametros", params=params)

    def get_agent_pause(self, **params) -> dict:
        return self.s.get("/ncall/api/v1/extensao/getAgentPause", params=params)

    def get_server_status(self) -> dict:
        return self.s.get("/ncall/api/v1/extensao/getServerStatus")

    def get_agent_status(self, **params) -> dict:
        """Ex: ramal='1000,1001', login='agente01,agente02', email=..., matricula=..."""
        return self.s.get("/ncall/api/v1/extensao/getAgentStatus", params=params)


class NexusAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def click2call(self, tipo_origem: str, numero_origem: int, numero_destino: int, **extra) -> dict:
        body = {"tipoOrigem": tipo_origem, "numeroOrigem": numero_origem, "numeroDestino": numero_destino, **extra}
        return self.s.post("/ncall/api/v1/nexus/click2call", body)

    def grupo_rota(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/grupoRota")

    def lista_pas(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/listaPAs")

    def lista_status_agente(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/listaStatusAgente")

    def lista_status_discador(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/listaStatusDiscador")

    def parametros_telefonia(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/parametrosTelefonia")

    def ramais_agentes(self, apenas_logados: int = 1) -> dict:
        return self.s.post("/ncall/api/v1/nexus/ramaisAgentes", {"apenasLogados": apenas_logados})

    def ramais(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/ramais")

    def status_discador(self) -> dict:
        return self.s.get("/ncall/api/v1/nexus/statusDiscador")

    def tabula_discador(self, id_alvo: str, id_tabulacao: int, id_status: int, **extra) -> dict:
        body = {"idAlvo": id_alvo, "idTabulacao": id_tabulacao, "idStatus": id_status, **extra}
        return self.s.post("/ncall/api/v1/nexus/tabulaDiscador", body)

    def ws_ping(self, xtra: str = "") -> dict:
        return self.s.post("/ncall/api/v1/nexus/wsPing", {"xtra": xtra})

    def status_call_center(self) -> Any:
        """Resumo em tempo real de Agentes/Filas (statusCC.php) - fora do padrão /ncall/api/v1."""
        return self.s.get("/ncall/servicos/statusCC.php")


class RelatoriosAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def campanha(self, id_mailing: int, tipo_relatorio: str = "resumo") -> dict:
        body = {"filtros": {"idMailing": id_mailing, "tipoRelatorio": tipo_relatorio}}
        return self.s.post("/ncall/api/v1/relatorios/campanha", body)

    def discador(self, id_externo: int, data_ini: str, data_fim: str) -> dict:
        return self.s.post(f"/ncall/api/v1/relatorios/{id_externo}/discador",
                            {"dataIni": data_ini, "dataFim": data_fim})

    def gravacoes(self, data_inicio: str, data_fim: str, telefone: Optional[str] = None,
                  fila: Optional[str] = None) -> dict:
        filtros = {"datainicio": data_inicio, "datafim": data_fim}
        if telefone:
            filtros["telefone"] = telefone
        if fila:
            filtros["fila"] = fila
        return self.s.post("/ncall/api/v1/relatorios/gravacoes", {"filtros": filtros})

    def login_logoff(self, id_externo: int, data_ini: str, data_fim: str, todos_os_registros: int = 0) -> dict:
        body = {"dataIni": data_ini, "dataFim": data_fim, "todosOsRegistros": todos_os_registros}
        return self.s.post(f"/ncall/api/v1/relatorios/{id_externo}/loginLogoff", body)

    def pausas(self, id_externo: int, data_ini: str, data_fim: str) -> dict:
        return self.s.post(f"/ncall/api/v1/relatorios/{id_externo}/pausas",
                            {"dataIni": data_ini, "dataFim": data_fim})

    def pesquisa_satisfacao(self, data_inicio: str, data_fim: str, telefone: Optional[str] = None,
                             identificador: Optional[str] = None) -> dict:
        filtros = {"datainicio": data_inicio, "datafim": data_fim}
        if telefone:
            filtros["telefone"] = telefone
        if identificador:
            filtros["identificador"] = identificador
        return self.s.post("/ncall/api/v1/relatorios/pesquisadesatisfacao", {"filtros": filtros})

    def tabulacoes(self, data_inicio: str, data_fim: str, telefone: Optional[str] = None) -> dict:
        filtros = {"datainicio": data_inicio, "datafim": data_fim}
        if telefone:
            filtros["telefone"] = telefone
        return self.s.post("/ncall/api/v1/relatorios/tabulacoes", {"filtros": filtros})


class EmailAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def mensagens(self, protocolo: str, pagina: int = 1, quantidade: int = 10,
                  data_inicial: Optional[str] = None, data_final: Optional[str] = None) -> dict:
        params = {"protocolo": protocolo, "pagina": pagina, "quantidade": quantidade}
        if data_inicial:
            params["dataInicial"] = data_inicial
        if data_final:
            params["dataFinal"] = data_final
        return self.s.get("/ncall/api/v1/email/mensagens", params=params)


class DiversosAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def manual_integrador_url(self) -> str:
        return self.s._url("/ncall/api/v1/diversos/Manual_do_Integrador.pdf")


class FeriadosAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def get_feriados(self, **params) -> dict:
        return self.s.get("/ncall/api/v1/feriados/getFeriados", params=params)


class ProtocoloAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def status_protocolo(self, protocolo: int, canal: Optional[int] = None) -> dict:
        params = {"protocolo": protocolo}
        if canal is not None:
            params["canal"] = canal
        return self.s.get("/ncall/api/v1/protocolo/getStatusProtocolo", params=params)


class RestricaoAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def gerenciar(self, id_grupo: int, adicionar: Optional[list] = None, remover: Optional[list] = None) -> dict:
        body = {"acao": "gerenciar", "adicionar": adicionar or [], "remover": remover or []}
        return self.s.post(f"/ncall/api/v1/restricao/{id_grupo}/restricao", body)

    def consultar(self, id_grupo: int, valores: list) -> dict:
        body = {"acao": "consultar", "valores": valores}
        return self.s.post(f"/ncall/api/v1/restricao/{id_grupo}/restricao", body)


class TabulacoesAPI:
    def __init__(self, s: _BaseSession):
        self.s = s

    def get_tabulacoes(self, **params) -> dict:
        return self.s.post("/ncall/api/v1/tabulacoes/getTabulacoes", params)


# --------------------------------------------------------------------------
# Cliente principal
# --------------------------------------------------------------------------

class NexusClient:
    """
    Ponto de entrada único para toda a API Nexus.

    client = NexusClient(base_url="http://IP.NEXUS", token="xxxx")
    client.agentes.status("1234")
    client.filas.lista()
    client.relatorios.tabulacoes("2026/07/01 00:00:00", "2026/07/09 23:59:59")
    client.nexus.status_call_center()
    """

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None,
                 timeout: int = 30, max_retries: int = 3):
        base_url = base_url or os.getenv("NEXUS_BASE_URL")
        token = token or os.getenv("NEXUS_TOKEN")

        if not base_url or not token:
            raise ValueError(
                "base_url e token são obrigatórios. Informe diretamente ou defina as "
                "variáveis de ambiente NEXUS_BASE_URL e NEXUS_TOKEN (ex.: em um arquivo .env)."
            )

        self._session = _BaseSession(base_url=base_url, token=token, timeout=timeout, max_retries=max_retries)

        self.agentes = AgentesAPI(self._session)
        self.campanhas = CampanhasAPI(self._session)
        self.chat = ChatAPI(self._session)
        self.contatos = ContatosAPI(self._session)
        self.filas = FilasAPI(self._session)
        self.extensao = ExtensaoAPI(self._session)
        self.nexus = NexusAPI(self._session)
        self.relatorios = RelatoriosAPI(self._session)
        self.email = EmailAPI(self._session)
        self.diversos = DiversosAPI(self._session)
        self.feriados = FeriadosAPI(self._session)
        self.protocolo = ProtocoloAPI(self._session)
        self.restricao = RestricaoAPI(self._session)
        self.tabulacoes = TabulacoesAPI(self._session)

    def raw(self, method: str, path: str, **kwargs) -> Any:
        """Escape hatch: chama qualquer endpoint não coberto explicitamente acima."""
        return self._session.request(method, path, **kwargs)
