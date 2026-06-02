---
description: Padrões específicos para app/api/cron/ e lib/automation* — complementa o agent cron-automator
globs:
  - "app/api/cron/**"
  - "lib/automation.ts"
  - "lib/rss-automation.ts"
  - "lib/source-crawlers/**"
---

# Cron Automator — Regras de Domínio

## Guard de execução da automação
O ciclo de automação só deve rodar quando **ambas** as condições são verdadeiras:
1. `automation_config.enabled = true`
2. `automation_config.next_run_at <= now()`

Nunca remova esse duplo guard — é o que evita execuções não intencionais.

## Logging obrigatório em `automation_logs`
Toda execução que gere (ou tente gerar) um post deve criar registro com:
`trigger`, `status` (`success | error | skipped`), `duration_ms`, `post_id` (se criado), `error` (se falhou)

## RSS — deduplicação por GUID
- Item processado = GUID registrado na tabela de controle — nunca reprocesse mesmo GUID
- Se o feed não fornecer GUID, use o `link` como identificador
- Itens mais velhos que 7 dias não devem entrar no pipeline mesmo se forem "novos" para o sistema

## Source crawlers
- Cada crawler em `lib/source-crawlers/` exporta `run(): Promise<CrawlerResult[]>`
- O runner em `lib/source-crawlers/runner.ts` é o único ponto de invocação — nunca chame crawlers diretamente de route handlers
- Crawlers não fazem chamadas de IA — apenas coletam e normalizam o conteúdo; o pipeline de agentes processa depois

## Firecrawl (opcional)
- Sempre verifique se `FIRECRAWL_API_KEY` está configurado antes de invocar `lib/firecrawl.ts`
- Se não estiver configurado, o Researcher usa busca alternativa — nunca lance erro bloqueante por ausência do Firecrawl

## pg_cron — SQL a fornecer sempre que criar novo endpoint de cron
```sql
SELECT cron.schedule('nome-do-job', 'expressão-cron',
  $$ SELECT net.http_post(url := '...',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
       body := '{}'::jsonb); $$);
```
