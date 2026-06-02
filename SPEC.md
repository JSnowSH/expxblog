# SPEC.md

## Problema

Software houses precisam de presença digital consistente com conteúdo relevante para seu setor, mas não têm tempo nem equipe dedicada para produzir artigos regularmente. O ExpxBlog resolve isso automatizando a geração, curadoria e publicação de notícias e artigos técnicos relevantes para esse público — reduzindo ao mínimo a intervenção humana no processo editorial.

## Usuários

**Leitor (usuário final)**
Software houses e profissionais do setor de desenvolvimento de software que buscam notícias, tendências e conteúdo técnico relevante para o seu dia a dia.

**Administrador (usuário interno)**
Equipe da Expx responsável por configurar as fontes de conteúdo, calibrar os agentes de IA, monitorar a automação e publicar artigos manualmente quando necessário.

## Funcionalidades

### Essenciais

**Blog público**
- Listagem de artigos publicados com paginação
- Visualização de artigo por slug
- Filtro por categoria e por tag
- Busca de artigos
- Feed RSS em `/feed.xml`
- Rastreamento de pageviews para analytics

**Dashboard administrativo**
- Autenticação com JWT em cookie httpOnly (sessão de 24h, rate limit de 5 tentativas por IP a cada 15 minutos)
- CRUD completo de artigos (rascunho / publicado), categorias e tags
- Editor de texto rico (TipTap) com suporte a imagens e links
- Geração de slug automática a partir do título

**Pipeline de geração de artigos por IA**
Pipeline multi-agente orquestrado via OpenRouter, executado manualmente ou por automação agendada:
1. **Headline** — define o tema e gera o título (máx. 80 chars)
2. **Researcher** — localiza 5–8 URLs de fontes relevantes (suporte a Firecrawl)
3. **Analyst** — resume o conteúdo de cada URL (200–400 palavras por fonte)
4. **Copywriter** — redige o artigo em HTML com links inline (mín. 800 palavras)
5. **Reviewer** — valida gramática, estrutura e coerência; até 3 ciclos de revisão
6. **CTA** — gera parágrafo de chamada para ação
7. **Designer** — cria prompt de imagem e gera capa
8. **Publisher** — publica o post e dispara ações externas configuradas

**Aprendizado contínuo dos agentes**: o Reviewer extrai princípios genéricos de escrita a partir de problemas recorrentes e os injeta no prompt do Copywriter nas próximas execuções (máx. 10 princípios acumulados).

**Fontes de conteúdo automatizadas**
- **RSS Feeds**: cadastro de feeds, parsing periódico, conversão automática de itens novos em artigos via pipeline de IA
- **Source Crawlers**: raspagem de repositórios GitHub, sites de documentação e URLs customizadas, com geração de artigos a partir do conteúdo coletado
- **Firecrawl** (opcional): busca e raspagem web para enriquecer a pesquisa dos agentes

**Automação agendada**
- Ciclos de geração configuráveis (intervalo em horas, temas pré-definidos ou prompt customizado)
- Crons via pg_cron + pg_net no Supabase para os endpoints `/api/cron/automation`, `/api/cron/rss` e `/api/cron/source-crawlers`
- Log completo de cada execução (status, duração, post gerado, erro se houver)

**Configuração de agentes**
- Prompt e modelo de cada agente configuráveis pelo admin via `agent_configs`
- Seleção de modelo por funcionalidade de IA (headline, researcher, copywriter etc.) via `site_settings.ai_models`

**Analytics**
- Pageviews por dia, hora e dia da semana
- Top posts, top referrers, tipos de página
- Visitantes únicos e "online agora" (polling a cada 5–10s)

**API REST**
- Pública (`/api/posts`, `/api/categories`, `/api/tags`, `/api/newsletter`)
- Autenticada por token (`/api/v1/posts` — CRUD completo)
- Admin protegida por JWT (`/api/admin/*`)

**Newsletter**
- Cadastro de subscribers
- Listagem e gestão de subscribers no admin

**Integrações opcionais**
- **Telegram**: webhook para anúncio de publicações
- **Pexels**: fotos de stock para capas de artigos

**Wizard de instalação**
- Configuração guiada do `DATABASE_URL`, `JWT_SECRET` e demais variáveis na primeira execução
- Bloqueia o acesso ao wizard após a configuração inicial

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `app/(public)/` | Páginas públicas do blog (home, post, categoria, tag, busca) em Server Components com queries Drizzle diretas |
| `app/admin/` | Dashboard administrativo (Client Components), toda comunicação via `/api/admin/*` |
| `app/api/` | Camada de API REST (rotas públicas, v1 autenticadas por token, admin protegidas por JWT, crons protegidos por service role key) |
| `lib/ai.ts` | Ponto central de integração com OpenRouter: `callOpenRouter`, `aiChat`, resolução de modelo e chave por feature |
| `lib/agents/` | Implementação individual de cada agente (headline, researcher, analyst, copywriter, reviewer, cta, designer, publisher) |
| `lib/agent-pipeline.ts` | Orquestração do pipeline multi-agente com Server-Sent Events, loop de revisão e sistema de aprendizado |
| `lib/automation.ts` | Entrada do ciclo de automação agendada, logging e controle de estado |
| `lib/rss-automation.ts` | Parsing de feeds RSS, deduplicação por GUID, enfileiramento e processamento via pipeline |
| `lib/source-crawlers/` | Raspadores para GitHub, documentação e URLs customizadas; runner de execução periódica |
| `lib/firecrawl.ts` | Busca e raspagem web via Firecrawl API (opcional) |
| `lib/telegram.ts` | Envio de mensagens e gestão de webhook Telegram |
| `lib/auth.ts` | Criação e verificação de JWT |
| `middleware.ts` | Verificação de JWT, redirecionamento para setup se DB não configurado, injeção de headers de usuário |
| `lib/settings.ts` | Leitura e cache em memória das configurações do site (`site_settings`) |
| `lib/db-queries.ts` | Queries reutilizáveis para listagem paginada de posts, categorias e tags |
| `drizzle/` | Schema, migrations e conexão com pool otimizado para serverless (máx. 5 conexões, `prepare: false`) |

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS + tokens customizados (`brand-primary` #1A4FA0, `brand-secondary` #F58A2D) |
| Editor rich text | TipTap |
| ORM | Drizzle ORM 0.45.2 |
| Banco de dados | PostgreSQL via Supabase |
| Autenticação | JWT (jose) em cookie httpOnly |
| IA / LLM | OpenRouter (todos os modelos passam por `lib/ai.ts`) |
| Scraping | Firecrawl API (opcional), Cheerio |
| RSS | rss-parser |
| Validação | Zod 3.22 |
| Gráficos | Chart.js + react-chartjs-2 |
| Upload de imagens | `public/uploads/` local + Supabase Storage |
| Deploy | Vercel (via integração GitHub — nunca deploy direto) |
| Crons | pg_cron + pg_net no Supabase |

## Constraints técnicas

- **Toda chamada de IA obrigatoriamente passa por `lib/ai.ts` via OpenRouter** — nenhum SDK de provider direto (OpenAI, Anthropic etc.)
- **Chave de API do OpenRouter armazenada na tabela `site_settings`**, não em variáveis de ambiente
- **Deploy exclusivamente via push para GitHub** — Vercel consome via integração automática; nunca `vercel deploy` direto
- **Crons implementados como pg_cron no Supabase**, não como cron jobs da Vercel (`vercel.json`)
- Conexão com banco otimizada para serverless: `max: 5`, `prepare: false`, timeout de 30s idle e 10min de lifetime
- Endpoints de cron protegidos por `SUPABASE_SERVICE_ROLE_KEY` como Bearer token
- Conteúdo HTML sanitizado com `sanitize-html` antes de persistir (tags permitidas: p, h1–h6, a, img, strong, em, ul, ol, li, blockquote)
- Imagens remotas permitidas apenas de domínios autorizados: imgur.com, cloudinary.com, unsplash.com, supabase.co
- Tempo máximo de execução dos endpoints de cron: 800s (`maxDuration`)
- Login rate-limited a 5 tentativas por IP a cada 15 minutos (in-memory, reseta em login bem-sucedido)
- Wizard de setup bloqueado após primeira configuração (não reexecutável)

## Critérios de aceitação

**Blog público**
- Artigos publicados aparecem na home ordenados por `published_at` desc
- Filtro por categoria e tag retorna apenas artigos da seleção
- Busca retorna artigos cujo título ou conteúdo contém o termo
- Feed RSS em `/feed.xml` lista os últimos artigos publicados com título, link e descrição válidos

**Pipeline de IA**
- Um ciclo completo (headline → publisher) gera e persiste um post com status `published` ou `draft` conforme configuração
- O Reviewer rejeita artigos que não passam nos critérios e o Copywriter reescreve em até 3 tentativas
- Princípios de escrita aprendidos pelo sistema não excedem 10 itens no prompt

**Automação**
- O cron `/api/cron/automation` executa apenas se `automation_config.enabled = true` e `next_run_at <= now()`
- Cada execução gera um registro em `automation_logs` com status, duração e `post_id` ou erro
- RSS: itens já processados (por GUID) não são reprocessados

**Admin**
- Rotas `/admin/*` e `/api/admin/*` retornam 401 sem JWT válido
- CRUD de posts, categorias e tags reflete imediatamente no blog público após publicação
- Configurações de modelo e prompt por agente persistem entre sessões

**Analytics**
- Pageview registrado em toda visita a post público
- Dashboard exibe métricas corretas agrupadas por dia, hora e dia da semana

**API**
- `/api/v1/*` retorna 401 sem token válido em `Authorization: Bearer`
- Endpoints públicos retornam apenas posts com `status = published`
