# Selbetti — Painel de Operações (Web)

Dashboard Next.js que consome a API Nexus diretamente (em tempo real) e mostra
indicadores da operação: agentes, filas, campanhas e nível de serviço.
Protegido por senha.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Autenticação: cookie de sessão assinado (JWT via `jose`), sem banco de dados
- Dados: chamadas server-side diretas à API Nexus (usa os mesmos endpoints já
  validados no `dashboard.py`/`nexus_client.py`)

## Rodando localmente (opcional, antes de subir)

```bash
npm install
cp .env.example .env.local
# edite .env.local com seus dados reais
npm run dev
```

Abra http://localhost:3000 — vai pedir a senha definida em `DASHBOARD_PASSWORD`.

## Deploy no Vercel (via GitHub — recomendado)

A conexão automática via API não teve permissão de deploy neste time do
Vercel, então o caminho é o mesmo fluxo confiável que você já usa: **GitHub →
Vercel**.

### 1. Suba este código para um repositório GitHub

```powershell
cd C:\Users\Larysson\selbetti-dashboard   # pasta onde você extraiu este pacote
git init
git add .
git commit -m "Painel de Operações - versão inicial"
git branch -M main
git remote add origin https://github.com/Larysson1989/SEU-REPO-AQUI.git
git push -u origin main
```

(Pode ser um repositório novo, ex: `selbetti-dashboard-web` — não precisa ser
o mesmo repo `Selbetti` dos scripts Python, já que são projetos diferentes.)

### 2. Conectar no Vercel

1. Acesse https://vercel.com/new
2. Selecione o repositório que você acabou de criar
3. Framework Preset: Vercel deve detectar **Next.js** automaticamente
4. **Antes de clicar em Deploy**, expanda "Environment Variables" e adicione:

   | Nome | Valor |
   |---|---|
   | `NEXUS_BASE_URL` | mesma URL do seu `.env` do dashboard.py (ex: `https://hpp.cloudnexcore.com.br`) |
   | `NEXUS_TOKEN` | mesmo token que você já usa |
   | `DASHBOARD_PASSWORD` | uma senha forte à sua escolha, pra proteger o site |
   | `AUTH_SECRET` | uma string aleatória longa (gere com `openssl rand -base64 32` ou qualquer gerador de senha de 32+ caracteres) |

5. Clique em **Deploy**

Depois disso, toda vez que você der `git push`, o Vercel republica automaticamente.

### 3. Se o projeto "selbetti" já existir no Vercel

Se você já tinha criado o projeto vazio pelo dashboard do Vercel (o link que
você me passou antes), em vez de "New Project" você pode ir em
**Project Settings → Git** desse projeto existente e conectar o repositório
por lá — o efeito é o mesmo.

## Estrutura do projeto

```
app/
  layout.tsx          - layout raiz (fontes, tema)
  page.tsx             - página do dashboard (protegida)
  login/page.tsx        - tela de login
  api/login/route.ts    - valida senha, cria cookie de sessão
  api/logout/route.ts   - encerra sessão
  api/kpis/route.ts     - agrega dados da API Nexus (chamado pelo front)
  globals.css
components/
  Dashboard.tsx          - componente principal (polling a cada 30s)
  RadialGauge.tsx        - medidor radial (nível de serviço por fila)
  LiveDot.tsx             - indicador "ao vivo"
lib/
  nexusClient.ts          - chamadas à API Nexus (só roda no servidor)
  auth.ts                  - criação/verificação do cookie de sessão
middleware.ts               - protege todas as rotas exceto /login
```

## O que o painel mostra

- **KPIs**: total de ramais, filas de voz/chat, campanhas ativas, alvos
  restantes somados, status do discador
- **Filas — nível de serviço em tempo real**: medidores radiais por fila
  (fonte: `statusCC.php` — pode não ter dados dependendo da versão/config do
  seu Nexus; se ficar vazio, não é erro, é porque essa fonte específica não
  retornou no formato esperado)
- **Filas cadastradas**: lista completa de filas de voz e chat
- **Campanhas**: tabela com alvos restantes e agendamentos por campanha

## Segurance

- O `NEXUS_TOKEN` nunca é exposto ao navegador — todas as chamadas à API
  Nexus acontecem em rotas server-side (`lib/nexusClient.ts` tem
  `import "server-only"` para garantir isso em tempo de build).
- Acesso ao site inteiro exige login (cookie httpOnly, 12h de duração).
- Sem banco de dados — nada fica armazenado além da sessão do navegador.

## Limitações conhecidas

- Relatórios pesados (gravações, pesquisa de satisfação, tabulações) do
  `dashboard.py` **não** estão neste painel web — APIs serverless da Vercel
  têm limite de tempo de execução, então só os endpoints rápidos e
  confiáveis foram incluídos aqui. Para relatórios históricos/pesados,
  continue usando o `dashboard.py` localmente.
- A seção "Filas — nível de serviço em tempo real" depende do endpoint
  `statusCC.php`, cujo formato exato de resposta não é 100% documentado.
  Se aparecer vazio na prática, me avise o JSON real que retorna e eu ajusto
  o parser (`normalizeStatusCC` em `components/Dashboard.tsx`).
