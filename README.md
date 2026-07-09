# Integração API Nexus → Dashboard de Consumo de Dados

Este pacote conecta na **API Nexus** (Nexcore Tecnologia) usando seu Token e
consolida os principais dados (agentes, filas, campanhas, relatórios, chat)
em um dashboard Excel automatizado.

## Arquivos

| Arquivo             | Para que serve |
|----------------------|----------------|
| `nexus_client.py`    | Cliente Python completo — cobre todos os grupos da API (Agentes, Campanhas, Filas, Chat, Contatos, Relatórios, Nexus/Status, Extensão, Email, Feriados, Protocolo, Restrição, Tabulações). Use-o em qualquer script seu. |
| `dashboard.py`       | Script pronto que usa o `nexus_client.py` para coletar dados em várias frentes e gerar um Excel consolidado (uma aba por assunto). |
| `.env.example`       | Modelo de configuração — copie para `.env` e preencha com seu IP/host e Token. |
| `requirements.txt`   | Dependências Python. |

## 1. Instalação

```bash
pip install -r requirements.txt
```

## 2. Configuração

```bash
cp .env.example .env
```

Edite o `.env`:
```
NEXUS_BASE_URL=http://IP.DO.SEU.NEXUS
NEXUS_TOKEN=seu_token_aqui
```

> `NEXUS_BASE_URL` é o endereço do seu servidor Nexus (o que na documentação
> aparece como `IP.NEXUS`), por exemplo `http://192.168.1.10` ou
> `https://sede.suaempresa.com.br`. O Token é o mesmo que você já possui.

## 3. Gerar o dashboard

```bash
python3 dashboard.py
```

Isso gera um arquivo `dashboard_nexus_AAAAMMDD_HHMM.xlsx` no diretório atual,
com abas como:

- `_resumo` — visão geral de quantas linhas cada aba trouxe
- `status_call_center` — status em tempo real de agentes/filas
- `ramais`, `status_discador`
- `filas_lista`, `chat_filas`
- `campanhas_lista`, `campanhas_alvos_restantes`
- `relatorio_tabulacoes`, `relatorio_gravacoes`, `relatorio_satisfacao`
- `discador_<idCampanha>`, `pausas_<idCampanha>` (uma para cada campanha)
- `_erros` — qualquer endpoint que falhou (ex.: módulo não usado por vocês, campanha sem mailing, etc.) fica listado aqui, sem travar o resto do dashboard

### Parâmetros opcionais

```bash
# Últimos 7 dias em vez de 1
python3 dashboard.py --dias 7

# Período específico
python3 dashboard.py --data-ini 2026-07-01 --data-fim 2026-07-09

# Nome de saída customizado
python3 dashboard.py --saida relatorio_semanal.xlsx
```

## 4. Usando o cliente em outros scripts seus

```python
from nexus_client import NexusClient

client = NexusClient()  # lê NEXUS_BASE_URL e NEXUS_TOKEN do .env

# Exemplos:
client.filas.lista()
client.agentes.status("1234")
client.campanhas.alvos_restantes(idExterno=10)
client.relatorios.tabulacoes("2026/07/01 00:00:00", "2026/07/09 23:59:59")
client.nexus.status_call_center()          # tempo real
client.chat.mensagens(["202304174175192"]) # histórico de conversa
```

Qualquer endpoint da documentação que eu não tenha "empacotado" com nome
próprio ainda pode ser chamado direto via:

```python
client.raw("POST", "/ncall/api/v1/algum/endpoint", json_body={"campo": "valor"})
```

## 5. Rodando periodicamente (ex.: dashboard sempre atualizado)

Linux/Mac (cron, a cada hora):
```
0 * * * * cd /caminho/do/projeto && /usr/bin/python3 dashboard.py --saida /caminho/compartilhado/dashboard_atual.xlsx
```

Windows: use o Agendador de Tarefas apontando para o mesmo comando.

## Observações importantes

- O script **nunca imprime ou salva seu Token** em nenhum arquivo de saída.
- Erros de endpoints específicos (ex. módulo de Chat não contratado) não
  derrubam o dashboard — eles só aparecem na aba `_erros`.
- Datas usadas por `relatorios.tabulacoes`, `gravacoes` e `pesquisa_satisfacao`
  seguem o formato `YYYY/MM/DD HH:MM:SS` exigido pela API; as usadas por
  `relatorios.discador`, `relatorios.pausas` e `relatorios.login_logoff`
  seguem `YYYY-MM-DD` — o `dashboard.py` já cuida dessa conversão para você.
- Testado com respostas simuladas da API (mock); ao rodar contra o seu
  Nexus real pela primeira vez, revise a aba `_erros` para checar se algum
  endpoint precisa de ajuste de parâmetros específicos do seu ambiente
  (ex.: `idExterno` de campanhas que não existem mais).
