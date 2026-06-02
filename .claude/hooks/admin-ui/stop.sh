#!/usr/bin/env bash
# Hook: admin-ui/stop
# Antes de encerrar, verifica se o build passa e se os padrões admin estão corretos.

cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog

echo "[admin-ui] Verificação final antes de encerrar..." >&2

# 1. Checa se há imports de Drizzle em páginas admin (violação crítica)
DRIZZLE_IN_ADMIN=$(grep -r "from '@/drizzle" app/admin/ --include="*.tsx" --include="*.ts" -l 2>/dev/null)
if [ -n "$DRIZZLE_IN_ADMIN" ]; then
  echo "BLOQUEADO [admin-ui]: Import de Drizzle encontrado em páginas admin — violação crítica!" >&2
  echo "Arquivos com violação: $DRIZZLE_IN_ADMIN" >&2
  echo "Admin pages NUNCA consultam o DB diretamente. Use fetch('/api/admin/...')." >&2
  exit 2
fi

# 2. Checa se page.tsx tem 'use client' (proibido — só em *Client.tsx)
USE_CLIENT_IN_PAGE=$(grep -r "'use client'" app/admin/ --include="page.tsx" -l 2>/dev/null)
if [ -n "$USE_CLIENT_IN_PAGE" ]; then
  echo "BLOQUEADO [admin-ui]: 'use client' encontrado em page.tsx — deve estar apenas em *Client.tsx!" >&2
  echo "Arquivos: $USE_CLIENT_IN_PAGE" >&2
  exit 2
fi

echo "[admin-ui] Verificações de padrão OK. Encerrando." >&2
exit 0
