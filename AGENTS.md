# AGENTS.md — ExpxBlog

Instruções por submódulo para agentes de IA (OpenCode, Codex, etc.).
Complementam os system prompts dos agents — não repetem o que está em CLAUDE.md.

---

## Regras Globais (qualquer módulo)

### Segurança inviolável
- Nunca leia chave de IA de `process.env` — use `getAIApiKey()` de `lib/ai.ts`
- Nunca logue `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` ou tokens JWT em console ou resposta HTTP
- HTML de usuário ou de IA **sempre** passa por `sanitize-html` antes de persistir no banco
- Nunca execute `vercel deploy` — deploy é exclusivamente via `git push origin master`
- Nunca adicione a chave `"crons"` ao `vercel.json` — crons usam pg_cron + pg_net no Supabase

### Convenções universais
- Erros de API retornam `{ error: string }` — nunca `{ message }` nem outro shape
- Imports usam alias `@/` — nunca caminhos relativos com `../../`
- Status de post: apenas `"draft"` ou `"published"` — nenhuma outra string
- Pool DB: `max: 5`, `prepare: false` — imutável sem justificativa explícita
- Nunca use `as any` para suprimir erro TypeScript — corrija o tipo

---

## `app/(public)/` — Public Frontend

- Server Components com queries Drizzle diretas — **sem** `fetch('/api/')`
- Nunca adicione `'use client'` em `page.tsx` — extraia interatividade para `components/blog/`
- Sempre filtre `status = 'published'` — nunca exponha rascunhos ao público
- `generateMetadata()` obrigatório em páginas de post, categoria e tag
- Corpo do artigo: `dangerouslySetInnerHTML` (HTML já sanitizado do banco), classes `prose prose-lg font-serif`
- Pageview: fire-and-forget — nunca bloqueie a renderização aguardando o registro
- RSS em `/feed.xml`: últimos 20 publicados, `Content-Type: application/rss+xml; charset=utf-8`

---

## `app/admin/` — Admin UI

- `page.tsx`: Server Component puro — sem `async/await`, sem Drizzle, sem `'use client'`, apenas renderiza `<XyzClient />`
- `*Client.tsx`: começa com `'use client'`, contém toda lógica, estado e fetch
- Data access: sempre `fetch('/api/admin/...')` — **nunca Drizzle direto em admin pages**
- Feedback ao usuário: toast `{ type: 'success'|'error', msg: string }` desaparecendo em 3s — proibido `alert()`
- Toda nova seção precisa de entrada no array `navItems` em `app/admin/layout.tsx`
- Editor de rich text: somente `components/blog/TiptapEditor.tsx` — output é HTML, não Markdown

---

## `app/api/` — API Builder

- `/api/admin/*`: protegido pelo `middleware.ts` — não adicione guard manual
- `/api/v1/*`: `validateApiToken()` de `lib/api-auth.ts`
- `/api/cron/*`: Bearer `SUPABASE_SERVICE_ROLE_KEY`, método `POST`, `export const maxDuration = 800`
- Rotas públicas (`/api/posts`, `/api/categories`, `/api/tags`): sempre `WHERE status = 'published'`
- Handlers > ~15 linhas extraem lógica para `lib/`; queries > 3 linhas vão para `lib/db-queries.ts`
- `POST` que cria recurso → `201`; `DELETE` → `200 { success: true }`; validação → `400 { error }`

---

## `lib/agents/` e `lib/agent-pipeline.ts` — AI Pipeline

- Toda chamada LLM via `aiChat(feature, messages)` de `lib/ai.ts` — **zero imports de provider direto**
- Ordem do pipeline (imutável): Headline → Researcher → Analyst → Copywriter → Reviewer → CTA → Designer → Publisher
- Somente o Publisher persiste o post no banco
- Loop de revisão Copywriter↔Reviewer: máximo **3 ciclos** — após o 3º entrega o melhor rascunho
- Princípios aprendidos pelo Reviewer: máximo **10**, FIFO, injetados no system prompt do Copywriter
- SSE: cada evento tem shape `{ stage: string, status: 'running'|'done'|'error', data?: unknown }`

---

## `app/api/cron/` e `lib/automation*` — Cron Automator

- Automação executa somente se `automation_config.enabled = true` AND `next_run_at <= now()`
- Toda execução registra em `automation_logs`: `trigger`, `status`, `duration_ms`, `post_id` ou `error`
- RSS: deduplicação por GUID (fallback: `link`); itens com mais de 7 dias são ignorados mesmo se novos no sistema
- Crawlers em `lib/source-crawlers/`: exportam `run()`, invocados **somente** pelo runner — nunca direto de route
- Firecrawl: verificar `FIRECRAWL_API_KEY` antes de invocar — ausência não é erro bloqueante para o pipeline

---

## `drizzle/` e `lib/db-queries.ts` — DB Engineer

- Junction tables (`post_categories`, `post_tags`): PK composta — **nunca** adicione `id` serial
- Toda tabela nova precisa de `id`, `created_at`, `updated_at`
- `site_settings (key TEXT PK, value TEXT)`: toda configuração global vai aqui — nunca crie tabela de config separada
- `automation_logs`: append-only — nunca atualize registros já inseridos
- `ALTER TABLE ... ADD COLUMN NOT NULL` em tabela com dados existentes exige `DEFAULT` ou dois passos
- Migrations: sempre `npm run db:generate` — nunca edite arquivos de migration manualmente
