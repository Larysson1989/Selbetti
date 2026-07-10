"""
diag_token.py
=============
Diagnostica problemas de autenticação com a API Nexus SEM expor o token
completo no terminal. Rode:

    python diag_token.py

Ele mostra:
- Se o .env foi carregado
- BASE_URL usado
- Tamanho do token e se há espaços/aspas/quebras de linha "escondidas"
- O resultado cru (raw) de uma chamada simples (wsPing) com os headers
  exatos que estão sendo enviados (token mascarado)
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

base_url = os.getenv("NEXUS_BASE_URL", "")
token = os.getenv("NEXUS_TOKEN", "")

print("=" * 60)
print("DIAGNÓSTICO DE CONEXÃO - API NEXUS")
print("=" * 60)

print(f"\nNEXUS_BASE_URL lido: {base_url!r}")
print(f"Tamanho do NEXUS_TOKEN: {len(token)} caracteres")

# Checagens de problemas comuns
problemas = []
if token != token.strip():
    problemas.append("Token tem espaços ou quebras de linha no início/fim.")
if token.startswith('"') or token.startswith("'"):
    problemas.append("Token parece estar envolto em aspas (remova as aspas do .env).")
if "\ufeff" in token or "\ufeff" in base_url:
    problemas.append("Foi detectado um caractere BOM invisível (comum ao salvar .env pelo Notepad).")
if not base_url.startswith("http"):
    problemas.append("NEXUS_BASE_URL não começa com http:// ou https:// .")
if base_url.endswith("/"):
    problemas.append("NEXUS_BASE_URL termina com '/' (não é obrigatório, mas remova para evitar barra dupla).")

if problemas:
    print("\n⚠️  Possíveis problemas encontrados:")
    for p in problemas:
        print(f"   - {p}")
else:
    print("\n✅ Nenhum problema óbvio de formatação encontrado no .env.")

# Mostra o token mascarado (só pra você confirmar que é o token certo)
if len(token) >= 8:
    mascarado = token[:4] + "..." + token[-4:]
else:
    mascarado = "(token muito curto ou vazio)"
print(f"\nToken mascarado: {mascarado}")

# Testa uma chamada simples e crua, mostrando exatamente o que foi enviado/recebido
print("\n" + "-" * 60)
print("Testando chamada crua para /ncall/api/v1/nexus/wsPing ...")
print("-" * 60)

url = base_url.rstrip("/") + "/ncall/api/v1/nexus/wsPing"
headers = {"Token": token, "Content-Type": "application/json"}

print(f"URL: {url}")
print(f"Headers enviados: {{'Token': '{mascarado}', 'Content-Type': 'application/json'}}")

try:
    resp = requests.post(url, headers=headers, json={"xtra": "teste-diagnostico"}, timeout=15)
    print(f"\nHTTP status: {resp.status_code}")
    print(f"Corpo da resposta (bruto): {resp.text[:500]}")
except Exception as e:  # noqa: BLE001
    print(f"\nErro de conexão: {e}")

print("\n" + "=" * 60)
print("Copie e cole a saída acima (sem se preocupar, o token está mascarado)")
print("=" * 60)
