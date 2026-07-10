"""
registry.py
===========
Lista central de todos os "tipos de coleta/relatório" que o dashboard.py
sabe buscar na API Nexus, junto com utilitários para carregar/salvar a
seleção do usuário (quais estão ativos) em relatorios_config.json.

Para adicionar um novo tipo de coleta no futuro, basta adicionar um item
aqui em REPORT_REGISTRY — ele já aparece automaticamente no menu de
seleção (selecionar_relatorios.py).
"""

import json
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "relatorios_config.json"

# id: identificador único (também usado como nome da aba no Excel quando aplicável)
# label: texto mostrado no menu de seleção
# categoria: agrupamento visual no menu
# lento: True = endpoint historicamente demorado; some por padrão até o usuário ativar
REPORT_REGISTRY = [
    {"id": "status_call_center", "label": "Status Call Center (tempo real: agentes/filas)", "categoria": "Tempo Real"},
    {"id": "ramais", "label": "Lista de Ramais", "categoria": "Tempo Real"},
    {"id": "status_discador", "label": "Status do Discador", "categoria": "Tempo Real"},

    {"id": "filas_lista", "label": "Lista de Filas (voz)", "categoria": "Filas"},
    {"id": "chat_filas", "label": "Lista de Filas (chat)", "categoria": "Filas"},

    {"id": "campanhas_lista", "label": "Lista de Campanhas", "categoria": "Campanhas"},
    {"id": "campanhas_alvos_restantes", "label": "Alvos restantes por Campanha", "categoria": "Campanhas"},

    {"id": "relatorio_tabulacoes", "label": "Relatório de Tabulações (exige telefone específico - veja README)",
     "categoria": "Relatórios", "lento": False},
    {"id": "relatorio_gravacoes", "label": "Relatório de Gravações", "categoria": "Relatórios", "lento": True},
    {"id": "relatorio_satisfacao", "label": "Pesquisa de Satisfação (Voz)", "categoria": "Relatórios", "lento": True},

    {"id": "relatorio_discador_campanha", "label": "Discador por Campanha (1 aba por campanha)",
     "categoria": "Relatórios por Campanha"},
    {"id": "relatorio_pausas_campanha", "label": "Pausas por Campanha (1 aba por campanha)",
     "categoria": "Relatórios por Campanha"},
    {"id": "relatorio_login_logoff_campanha", "label": "Login/Logoff por Campanha (1 aba por campanha)",
     "categoria": "Relatórios por Campanha"},
]

_IDS = {item["id"] for item in REPORT_REGISTRY}


def default_config() -> dict:
    """Por padrão, tudo ativo, exceto os itens marcados como 'lento' (endpoints que já
    demonstraram demorar/travar) — esses ficam desativados até o usuário ligar explicitamente."""
    return {item["id"]: not item.get("lento", False) for item in REPORT_REGISTRY}


def load_config() -> dict:
    """Carrega a seleção salva em relatorios_config.json. Se o arquivo não existir,
    usa (e não salva ainda) a configuração padrão. Itens novos do registry que não
    existiam na hora em que o arquivo foi salvo entram com o valor padrão deles."""
    config = default_config()
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            saved = json.load(f)
        config.update({k: v for k, v in saved.items() if k in _IDS})
    return config


def save_config(config: dict) -> None:
    ordenado = {item["id"]: bool(config.get(item["id"], True)) for item in REPORT_REGISTRY}
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(ordenado, f, indent=2, ensure_ascii=False)
