#!/usr/bin/env bash
# Hook: cron-automator/stop
# Antes de encerrar, valida todas as rotas de cron criadas/modificadas.

cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog

echo "[cron-automator] Verificação final de todas as rotas de cron..." >&2

ERRORS=0

# 1. Nenhum cron pode ser GET
CRON_GET=$(grep -r "^export async function GET" app/api/cron/ --include="route.ts" -l 2>/dev/null)
if [ -n "$CRON_GET" ]; then
  echo "BLOQUEADO: Rotas de cron com GET: $CRON_GET" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Todos os crons precisam de maxDuration
MISSING_DURATION=$(grep -rL "maxDuration" app/api/cron/ --include="route.ts" 2>/dev/null)
if [ -n "$MISSING_DURATION" ]; then
  echo "BLOQUEADO: Crons sem maxDuration: $MISSING_DURATION" >&2
  ERRORS=$((ERRORS + 1))
fi

# 3. Todos os crons precisam verificar Bearer
MISSING_AUTH=$(grep -rL "SUPABASE_SERVICE_ROLE_KEY" app/api/cron/ --include="route.ts" 2>/dev/null)
if [ -n "$MISSING_AUTH" ]; then
  echo "BLOQUEADO: Crons sem verificação de Bearer token: $MISSING_AUTH" >&2
  ERRORS=$((ERRORS + 1))
fi

# 4. vercel.json sem crons
VERCEL_CRONS=$(grep -l '"crons"' vercel.json 2>/dev/null)
if [ -n "$VERCEL_CRONS" ]; then
  echo "BLOQUEADO: vercel.json tem chave 'crons' — proibido!" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo "[cron-automator] $ERRORS violação(ões) encontrada(s). Corrija antes de encerrar." >&2
  exit 2
fi

echo "[cron-automator] Todas as rotas de cron estão conformes. Encerrando." >&2
exit 0
