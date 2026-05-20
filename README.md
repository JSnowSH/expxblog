# MMA Sistemas Blog

Blog corporativo da MMA Sistemas — Next.js 14 + Drizzle ORM + PostgreSQL (Supabase) + Vercel.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL via Supabase (Drizzle ORM) |
| Autenticação | JWT em cookie `httpOnly` (biblioteca `jose`) |
| Editor de conteúdo | Tiptap (rich text) |
| IA | OpenRouter — todos os recursos de IA passam por `https://openrouter.ai` |
| Upload de arquivos | Supabase Storage (bucket `uploads`) |
| Estilo | Tailwind CSS com design system MMA Sistemas |
| Deploy | Vercel (via integração GitHub) |

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Clonar o repositório](#2-clonar-o-repositório)
3. [Configurar o Supabase](#3-configurar-o-supabase)
   - 3.1 Criar projeto
   - 3.2 Obter credenciais
   - 3.3 Criar bucket de uploads
   - 3.4 Configurar RLS no bucket
4. [Configurar variáveis de ambiente localmente](#4-configurar-variáveis-de-ambiente-localmente)
5. [Instalar dependências e criar as tabelas](#5-instalar-dependências-e-criar-as-tabelas)
6. [Popular o banco (seed)](#6-popular-o-banco-seed)
7. [Executar em desenvolvimento](#7-executar-em-desenvolvimento)
8. [Configurar a Vercel](#8-configurar-a-vercel)
   - 8.1 Criar projeto na Vercel
   - 8.2 Configurar variáveis de ambiente na Vercel
   - 8.3 Primeiro deploy
9. [Configurar o painel admin em produção](#9-configurar-o-painel-admin-em-produção)
   - 9.1 Alterar senha do admin
   - 9.2 Configurar a chave de API do OpenRouter (IA)
10. [Comandos úteis](#10-comandos-úteis)
11. [Estrutura do projeto](#11-estrutura-do-projeto)
12. [Arquitetura](#12-arquitetura)

---

## 1. Pré-requisitos

Antes de começar, você precisa ter instalado na sua máquina:

- **Node.js 20** ou superior — [nodejs.org](https://nodejs.org)
- **npm** (vem com o Node.js)
- **Git** — [git-scm.com](https://git-scm.com)

Você também precisará de contas (gratuitas) nos serviços:

- **Supabase** — [supabase.com](https://supabase.com) — banco de dados PostgreSQL + armazenamento de arquivos
- **Vercel** — [vercel.com](https://vercel.com) — hospedagem do Next.js
- **OpenRouter** *(opcional, necessário para recursos de IA)* — [openrouter.ai](https://openrouter.ai)

---

## 2. Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/<seu-repositorio>.git
cd <seu-repositorio>
```

---

## 3. Configurar o Supabase

### 3.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **New project**.
3. Preencha:
   - **Organization**: selecione sua organização (ou crie uma).
   - **Name**: nome do projeto (ex.: `mma-blog`).
   - **Database Password**: anote essa senha — você vai precisar dela.
   - **Region**: escolha a região mais próxima dos seus usuários (ex.: `South America (São Paulo)`).
4. Clique em **Create new project** e aguarde o provisionamento (~2 minutos).

### 3.2 Obter credenciais

Você vai precisar de quatro informações do Supabase:

#### Connection String (DATABASE_URL)

1. No painel do projeto, vá em **Project Settings** → **Database**.
2. Role até a seção **Connection string**.
3. Selecione a aba **URI**.
4. Copie a string que começa com `postgresql://postgres:...`.
   - Substitua `[YOUR-PASSWORD]` pela senha definida na criação do projeto.
5. **Importante:** troque a porta para `6543` (pooler, obrigatório na Vercel):
   ```
   postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
   > A porta `5432` funciona localmente mas pode causar problemas na Vercel (ambiente serverless). Use sempre `6543`.

#### URL do projeto (NEXT_PUBLIC_SUPABASE_URL)

1. Vá em **Project Settings** → **API**.
2. Copie o valor em **Project URL** (formato `https://xxxxxxxxxxxx.supabase.co`).

#### Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

1. Ainda em **Project Settings** → **API**.
2. Em **Project API keys**, copie o valor de **service_role** (clique em "Reveal").
   > ⚠️ Nunca exponha essa chave no frontend. Ela só é usada no servidor.

### 3.3 Criar bucket de uploads

O blog salva imagens e arquivos no Supabase Storage.

1. No painel do projeto, vá em **Storage**.
2. Clique em **New bucket**.
3. Preencha:
   - **Name**: `uploads`
   - **Public bucket**: ✅ marque como público (necessário para servir as imagens no blog).
4. Clique em **Save**.

### 3.4 Configurar RLS no bucket

Por padrão o Supabase cria políticas de RLS que bloqueiam uploads. Você precisa liberar o upload via service role:

1. Em **Storage** → **Policies**, selecione o bucket `uploads`.
2. Clique em **New policy** → **For full customization**.
3. Crie uma política com as seguintes configurações:
   - **Policy name**: `Allow service role uploads`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `service_role`
   - **Policy definition**: `true`
4. Repita para a operação `SELECT` (para leitura pública):
   - **Policy name**: `Allow public reads`
   - **Allowed operation**: `SELECT`
   - **Target roles**: *(deixe vazio para público)*
   - **Policy definition**: `true`

> Alternativa mais rápida: desabilite RLS no bucket clicando em **Disable RLS** — adequado para projetos internos onde a chave service_role já controla o acesso.

---

## 4. Configurar variáveis de ambiente localmente

Na raiz do projeto, copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Abra o `.env` e preencha cada variável:

```env
# ─── BANCO DE DADOS ──────────────────────────────────────────────────────────
# Connection string do Supabase (porta 6543 = pooler, obrigatório na Vercel)
DATABASE_URL=postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# ─── AUTENTICAÇÃO ────────────────────────────────────────────────────────────
# Mínimo 32 caracteres. Gere com: openssl rand -base64 32
JWT_SECRET=cole-aqui-uma-string-aleatoria-de-32-ou-mais-caracteres

# ─── APLICAÇÃO ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BLOG_NAME=MMA Sistemas Blog
NODE_ENV=development

# ─── SUPABASE STORAGE ────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua-service-role-key...

# ─── AUTOMAÇÃO (CRON) ────────────────────────────────────────────────────────
# Gere com: openssl rand -base64 32
CRON_SECRET=cole-aqui-outro-segredo-aleatorio
```

**Dica para gerar strings aleatórias seguras:**

```bash
# No macOS / Linux:
openssl rand -base64 32

# No Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

> A chave de API do OpenRouter (IA) **não** vai em variável de ambiente. Ela é configurada diretamente pelo painel admin em **Configurações → IA** após o primeiro login.

---

## 5. Instalar dependências e criar as tabelas

```bash
# Instalar pacotes
npm install

# Aplicar todas as migrações no banco (cria as tabelas)
npm run db:migrate
```

O comando `db:migrate` aplica as migrações em `drizzle/migrations/` em ordem. Ele cria as seguintes tabelas:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários admin |
| `posts` | Artigos do blog |
| `categories` | Categorias |
| `tags` | Tags |
| `post_categories` | Relação post ↔ categoria |
| `post_tags` | Relação post ↔ tag |
| `site_settings` | Configurações do blog (chave/valor) |
| `api_tokens` | Tokens de API externos |
| `page_views` | Analytics de visualizações |
| `newsletter_subscribers` | Assinantes de newsletter |
| `article_themes` | Temas para geração de artigos via IA |
| `automation_config` | Configuração de automação de artigos |

---

## 6. Popular o banco (seed)

```bash
npm run db:seed
```

Esse comando cria:
- Um usuário admin padrão
- Categorias e tags de exemplo
- Um artigo de exemplo

**Credenciais padrão após o seed:**

| Campo | Valor |
|-------|-------|
| URL admin | `/admin/login` |
| Email | `admin@blog.com` |
| Senha | `admin123` |

> ⚠️ **Troque a senha imediatamente após o primeiro acesso em produção.**

---

## 7. Executar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

O painel administrativo está em [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

---

## 8. Configurar a Vercel

### 8.1 Criar projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login.
2. Clique em **Add New…** → **Project**.
3. Em **Import Git Repository**, conecte sua conta do GitHub (se ainda não conectou) e selecione o repositório do blog.
4. Clique em **Import**.
5. Na tela de configuração:
   - **Framework Preset**: a Vercel detecta automaticamente como *Next.js* — não mude nada.
   - **Root Directory**: deixe em branco (raiz do repositório).
   - **Build Command**: deixe o padrão (`next build`).
   - **Output Directory**: deixe o padrão (`.next`).
6. **Não clique em Deploy ainda** — primeiro configure as variáveis de ambiente (próximo passo).

### 8.2 Configurar variáveis de ambiente na Vercel

Ainda na tela de configuração (ou depois em **Settings** → **Environment Variables**), adicione cada variável:

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `DATABASE_URL` | Connection string do Supabase com porta **6543** | Production, Preview, Development |
| `JWT_SECRET` | String aleatória ≥ 32 caracteres | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | URL do seu site em produção, ex.: `https://blog.mmasistemas.com.br` | Production |
| `NEXT_PUBLIC_APP_URL` | URL de preview gerada pela Vercel, ex.: `https://mma-blog.vercel.app` | Preview |
| `NEXT_PUBLIC_BLOG_NAME` | Nome do blog, ex.: `MMA Sistemas Blog` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase | Production, Preview, Development |
| `CRON_SECRET` | String aleatória ≥ 32 caracteres (mesma do `.env` local) | Production, Preview, Development |

> **Como adicionar:** em cada campo, cole o nome, o valor e marque os ambientes desejados. Clique em **Save** após cada uma (ou use **Add** e salve no final).

### 8.3 Primeiro deploy

Após salvar todas as variáveis:

1. Clique em **Deploy** (ou vá em **Deployments** → **Redeploy**).
2. Aguarde o build (normalmente 1–3 minutos).
3. Quando o status ficar verde (**Ready**), clique na URL de produção para verificar.

**A partir de agora, todo `git push origin master` dispara um novo deploy automático.** Não use `vercel deploy` manualmente.

---

## 9. Configurar o painel admin em produção

### 9.1 Alterar senha do admin

1. Acesse `https://seu-dominio.com/admin/login`.
2. Entre com `admin@blog.com` / `admin123`.
3. Vá em **Configurações** → **Conta** e troque a senha para uma senha forte.

### 9.2 Configurar a chave de API do OpenRouter (IA)

Os recursos de IA (geração de artigos, sugestão de títulos, SEO, etc.) exigem uma chave do OpenRouter.

1. Crie uma conta em [openrouter.ai](https://openrouter.ai).
2. Vá em [openrouter.ai/keys](https://openrouter.ai/keys) e gere uma chave de API.
3. No painel admin do blog, vá em **Configurações** → **IA (OpenRouter)**.
4. Cole a chave no campo **Chave de API** e salve.
5. Opcionalmente, escolha o modelo padrão para cada recurso (geração de conteúdo, títulos, SEO, etc.).

---

## 10. Comandos úteis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento (http://localhost:3000)

# Build e produção
npm run build            # Build de produção
npm run start            # Servidor de produção (após build)
npm run lint             # Verifica erros de lint (ESLint)

# Banco de dados
npm run db:migrate       # Aplica migrações pendentes no banco
npm run db:generate      # Gera novas migrações a partir de mudanças no schema
npm run db:studio        # Abre o Drizzle Studio (GUI visual do banco)
npm run db:seed          # Popula o banco com dados iniciais
```

**Drizzle Studio** é uma interface visual para inspecionar e editar dados diretamente no banco. Execute `npm run db:studio` e acesse o link exibido no terminal.

---

## 11. Estrutura do projeto

```
mma-blog/
├── app/
│   ├── (public)/              # Blog público (sem proteção)
│   │   ├── page.tsx           # Home — listagem de artigos
│   │   ├── [slug]/            # Artigo individual
│   │   ├── categoria/[slug]/  # Filtro por categoria
│   │   ├── tag/[slug]/        # Filtro por tag
│   │   └── busca/             # Busca full-text
│   ├── admin/                 # Painel administrativo (protegido por JWT)
│   │   ├── login/             # Tela de login
│   │   ├── artigos/           # CRUD de artigos + editor Tiptap
│   │   ├── categorias/        # CRUD de categorias
│   │   ├── tags/              # CRUD de tags
│   │   ├── newsletter/        # Gerenciamento de assinantes
│   │   ├── analytics/         # Dashboard de analytics
│   │   ├── api/               # Gerenciamento de tokens de API
│   │   └── configuracoes/     # Configurações gerais, IA e automação
│   └── api/                   # API Routes (REST)
│       ├── posts/             # Endpoints públicos de posts
│       ├── categories/        # Endpoints públicos de categorias
│       ├── tags/              # Endpoints públicos de tags
│       └── admin/             # Endpoints protegidos (requerem JWT)
├── components/
│   └── blog/
│       └── TiptapEditor.tsx   # Editor de rich text
├── drizzle/
│   ├── schema.ts              # Definição das tabelas (Drizzle ORM)
│   ├── db.ts                  # Conexão com o banco
│   └── migrations/            # Arquivos SQL gerados pelo Drizzle
├── lib/
│   ├── ai.ts                  # Integração com OpenRouter
│   ├── auth.ts                # JWT: assinar e verificar tokens
│   ├── settings.ts            # Leitura/escrita de configurações (site_settings)
│   ├── slug.ts                # Geração de slugs a partir de títulos
│   ├── supabase-admin.ts      # Cliente Supabase para o servidor
│   └── automation.ts          # Lógica de automação de artigos com IA
├── scripts/
│   └── seed.ts                # Script de seed do banco
├── middleware.ts              # Proteção das rotas /admin e /api/admin
├── next.config.js             # Config do Next.js (domínios de imagem permitidos)
├── drizzle.config.ts          # Config do Drizzle ORM
├── tailwind.config.ts         # Config do Tailwind CSS
└── .env.example               # Template de variáveis de ambiente
```

---

## 12. Arquitetura

### Autenticação

- Login via `POST /api/admin/auth/login` — valida email/senha com bcrypt, retorna um JWT assinado.
- JWT armazenado em cookie `httpOnly` com duração de 24h.
- `middleware.ts` intercepta todas as requisições para `/admin/*` e `/api/admin/*`, verifica o JWT e injeta `x-user-id` e `x-user-email` nos headers.
- Login tem rate limiting: 5 tentativas por IP a cada 15 minutos.

### Banco de dados

- Schema em `drizzle/schema.ts` com tipagem TypeScript completa.
- Conexão via driver `postgres` com `max: 1` e `prepare: false` — configuração necessária para ambientes serverless (Vercel).
- Migrações versionadas em `drizzle/migrations/` — nunca modifique manualmente os arquivos de migração.

### Conteúdo

- Artigos são escritos no editor Tiptap e salvos como HTML.
- Na gravação, o HTML é sanitizado com `sanitize-html` para prevenir XSS.
- Slugs são gerados automaticamente a partir do título via `lib/slug.ts`.

### IA (OpenRouter)

- **Toda** chamada de IA passa por `lib/ai.ts` → `callOpenRouter()`. Nunca chame provedores diretamente.
- A chave de API e os modelos por recurso são armazenados na tabela `site_settings`, configuráveis pelo painel admin.
- Recursos disponíveis: geração de conteúdo, sugestão de títulos, geração de excerpts, otimização SEO, descrição de imagens, sumarização, geração de briefings, sugestão de temas e geração de imagens.

### Upload de arquivos

- Uploads vão para o bucket `uploads` no Supabase Storage via `lib/supabase-admin.ts`.
- Imagens externas são permitidas de: `imgur.com`, `cloudinary.com`, `unsplash.com`, `supabase.co`.

---

## Licença

Proprietário — MMA Sistemas © 2026
