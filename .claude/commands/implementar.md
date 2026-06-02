# /implementar — Implementação orquestrada com TDD e revisão automática

Despacha o agente `orquestrador` para conduzir a implementação de ponta a ponta: clarificação → plano → execução com TDD → revisão automática pelo `code-reviewer`.

## O que este comando faz

### Fase 1 — Clarificação
O orquestrador analisa o pedido e, se houver ambiguidade, faz **1–2 perguntas objetivas** antes de agir. Exemplos de quando perguntar:
- Não está claro qual domínio é afetado (DB, API, UI, pipeline de IA, cron)
- O requisito pode ser implementado de formas muito diferentes
- Falta informação obrigatória (nome da tabela, rota, modelo de IA a usar)

### Fase 2 — Plano de implementação
O orquestrador gera um plano estruturado em **Sprints → Fases → Tasks** antes de escrever qualquer código:

```
Sprint 1 — <descrição>
  Fase 1.1 — <domínio>
    [ ] Task: <o que fazer> → Agente: <quem faz>
    [ ] Task: ...
  Fase 1.2 — <domínio dependente>
    [ ] Task: ...
```

O plano respeita dependências: tarefas independentes rodam em paralelo; tarefas sequenciais aguardam o resultado anterior.

### Fase 3 — Execução com TDD
Para cada task:
1. O agente especializado escreve o **teste primeiro** (quando aplicável)
2. Implementa o código para fazê-lo passar
3. Marca a task como concluída no plano

Agentes especializados disponíveis:
| Agente | Domínio |
|---|---|
| `db-engineer` | Schema Drizzle, migrations, queries em `lib/db-queries.ts` |
| `api-builder` | Route handlers em `app/api/` |
| `admin-ui` | Páginas e componentes em `app/admin/` |
| `ai-pipeline` | Agentes em `lib/agents/`, `lib/agent-pipeline.ts` |
| `cron-automator` | Crons, RSS, source crawlers |
| `public-frontend` | Páginas públicas, feed RSS, SEO |

### Fase 4 — Revisão automática
Ao final de toda a implementação, o orquestrador **sempre** chama o `code-reviewer` automaticamente:
- Se houver **BLOQUEANTE**: o agente responsável é chamado novamente para corrigir — o ciclo repete até aprovação
- Se houver apenas **IMPORTANTE/SUGESTÃO**: reporta ao usuário para decisão
- Se LGTM: confirma conclusão com lista de arquivos criados/modificados e passos manuais pendentes

## Uso

```
/implementar <descrição da feature ou bug>
/implementar adiciona paginação na listagem pública de artigos
/implementar cria endpoint POST /api/newsletter para cadastro de emails
/implementar nova feature de IA: geração de sumário automático do artigo
```

## Regras invioláveis que o orquestrador enforce

1. Toda IA via `lib/ai.ts` — nenhum SDK de provider direto
2. Admin pages nunca consultam o DB — sempre via `fetch('/api/admin/*')`
3. Crons via pg_cron no Supabase — nunca `vercel.json`
4. API pública filtra `status = 'published'` — nunca expõe rascunhos
5. Deploy via `git push` para GitHub — nunca `vercel deploy` diretamente
6. Chave de API da IA na tabela `site_settings` — nunca em variáveis de ambiente

---

**Agente coordenador**: `orquestrador`
**Agente de revisão final**: `code-reviewer` (automático)
**Referências**: `SPEC.md`, `CLAUDE.md`, `.claude/rules/`
