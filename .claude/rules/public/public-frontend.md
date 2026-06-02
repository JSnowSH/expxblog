---
description: Padrões específicos para app/(public)/ e components/blog/ — complementa o agent public-frontend
globs:
  - "app/(public)/**"
  - "app/feed.xml/**"
  - "components/blog/**"
---

# Public Frontend — Regras de Domínio

## Server Components — o que o código não deixa explícito
- `app/(public)/` usa **queries Drizzle diretas** — o oposto do admin. Não existe camada de fetch API aqui
- `lib/db-queries.ts` é o lugar certo para queries reutilizadas entre páginas — não duplique lógica de paginação
- `generateMetadata()` é obrigatório em toda page de post, categoria e tag — nunca omita

## Paginação
- Use `offset + limit` via `lib/db-queries.ts` — o esquema de paginação já está implementado, não reimplemente
- Parâmetros de página vêm de `searchParams` (não de cookies ou headers) — não guardam estado no servidor

## Feed RSS (`app/feed.xml/route.ts`)
- Retorna apenas os 20 artigos mais recentes publicados
- `Content-Type: application/rss+xml; charset=utf-8` — nunca omita o charset
- Campos obrigatórios por item: `title`, `link`, `description`, `pubDate`, `guid`

## Analytics — pageview
- Pageview é registrado em toda visita a `app/(public)/[slug]/page.tsx`
- O registro é fire-and-forget (não aguarde a resposta) — nunca bloqueie a renderização por isso
- Campos: `path`, `referrer` (de `request.headers.get('referer')`), `user_agent`

## Busca
- Busca por título e conteúdo usando `ilike` do Drizzle — não use `LIKE` case-sensitive
- Mínimo de 2 caracteres no termo de busca antes de disparar query — valide no Server Component

## Tipografia de artigos
- Corpo do artigo renderizado com `dangerouslySetInnerHTML` — o HTML já vem sanitizado do banco
- Classe de container de artigo: `prose prose-lg` (Tailwind Typography) com `max-w-none`
- Fonte de artigo: `font-serif` (Source Serif 4) — nunca use `font-sans` para corpo de artigo
