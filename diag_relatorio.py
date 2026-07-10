"""
diag_relatorio.py
==================
Ferramenta de diagnóstico para descobrir a regra exata do campo "telefone"
no relatório de tabulações da API Nexus (já sabemos que precisa ser
não-vazio; agora vamos descobrir se aceita busca parcial/DDD ou exige
número completo).

Uso:
    python diag_relatorio.py
"""

import json
from datetime import datetime, timedelta

from dotenv import load_dotenv
from nexus_client import NexusClient, NexusAPIError

load_dotenv()
client = NexusClient()

hoje = datetime.now()
ontem = hoje - timedelta(days=1)

data_ini = ontem.strftime("%Y/%m/%d 00:00:00")
data_fim = hoje.strftime("%Y/%m/%d 23:59:59")


def testar(nome: str, path: str, body: dict):
    print("\n" + "=" * 70)
    print(f"Testando: {nome}")
    print(f"Body: {json.dumps(body, ensure_ascii=False)}")
    print("-" * 70)
    try:
        resp = client.raw("POST", path, json_body=body)
        qtd = len(resp.get("response", [])) if isinstance(resp.get("response"), list) else "?"
        print(f"✅ SUCESSO — registros retornados: {qtd}")
        if qtd not in (0, "?"):
            print(json.dumps(resp["response"][:2], ensure_ascii=False, indent=2))
    except NexusAPIError as e:
        print(f"❌ FALHOU: {e} (http_status={e.http_status})")
        if e.payload:
            print(f"   Payload completo do erro: {json.dumps(e.payload, ensure_ascii=False)}")


print("#" * 70)
print("# Testando variações do campo 'telefone' em relatorio_tabulacoes")
print("#" * 70)

testar("DDD só (41)", "/ncall/api/v1/relatorios/tabulacoes",
       {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": "41"}})

testar("Um dígito (4)", "/ncall/api/v1/relatorios/tabulacoes",
       {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": "4"}})

testar("Espaço em branco", "/ncall/api/v1/relatorios/tabulacoes",
       {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": " "}})

testar("Wildcard %", "/ncall/api/v1/relatorios/tabulacoes",
       {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": "%"}})

testar("Asterisco *", "/ncall/api/v1/relatorios/tabulacoes",
       {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": "*"}})

print("\n" + "#" * 70)
print("# IMPORTANTE: agora edite a linha abaixo com um número de telefone REAL")
print("# que você sabe que teve ligação/tabulação recente na sua operação,")
print("# e rode de novo — isso confirma se o relatório funciona OK com número exato.")
print("#" * 70)

# EDITE AQUI com um número real (DDD + número, só dígitos):
NUMERO_REAL_PARA_TESTE = "SEU_NUMERO_AQUI"

if NUMERO_REAL_PARA_TESTE != "SEU_NUMERO_AQUI":
    testar(f"Número real ({NUMERO_REAL_PARA_TESTE})", "/ncall/api/v1/relatorios/tabulacoes",
           {"filtros": {"datainicio": data_ini, "datafim": data_fim, "telefone": NUMERO_REAL_PARA_TESTE}})
else:
    print("\n(Pulado — edite NUMERO_REAL_PARA_TESTE no arquivo com um número de verdade e rode de novo)")
