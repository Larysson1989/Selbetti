"""
diag_raw.py
===========
Script 100% independente (não importa nexus_client.py, não usa retry,
não usa nenhuma camada de abstração) — só pra garantir que estamos vendo
EXATAMENTE o que o servidor Nexus responde, byte a byte, sem qualquer
chance de cache de arquivo antigo ou lógica escondendo a mensagem real.

Uso:
    python diag_raw.py
"""

import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

base_url = os.getenv("NEXUS_BASE_URL", "").rstrip("/")
token = os.getenv("NEXUS_TOKEN", "")

url = base_url + "/ncall/api/v1/relatorios/tabulacoes"
headers = {"Token": token, "Content-Type": "application/json"}

from datetime import datetime, timedelta
hoje = datetime.now()
ontem = hoje - timedelta(days=1)
data_ini = ontem.strftime("%Y/%m/%d 00:00:00")
data_fim = hoje.strftime("%Y/%m/%d 23:59:59")

testes = [
    ("DDD só (41)", {"telefone": "41"}),
    ("Um dígito (4)", {"telefone": "4"}),
    ("Vazio", {"telefone": ""}),
    ("Número completo de exemplo", {"telefone": "4133221336"}),
]

for nome, extra in testes:
    body = {"filtros": {"datainicio": data_ini, "datafim": data_fim, **extra}}
    print("\n" + "=" * 70)
    print(f"Teste: {nome}")
    print(f"URL: {url}")
    print(f"Body enviado: {json.dumps(body, ensure_ascii=False)}")
    print("-" * 70)

    resp = requests.post(url, headers=headers, json=body, timeout=30)

    print(f"HTTP status: {resp.status_code}")
    print(f"Content-Type da resposta: {resp.headers.get('Content-Type')}")
    print(f"Corpo COMPLETO e cru da resposta:")
    print(resp.text)
