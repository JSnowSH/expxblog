#!/usr/bin/env bash
# Hook: public-frontend/stop
# Antes de encerrar, verifica padrões críticos do frontend público.

cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog

echo "[public-frontend] Verificação final de páginas públicas..." >&2

ERRORS=0

# 1. Nenhum 'use client' em page.tsx do (public)
USE_CLIENT_PAGES=$(grep -r "'use client'" "app/(public)/" --include="page.tsx" -l 2>/dev/null)
if [ -n "$USE_CLIENT_PAGES" ]; then
  echo "BLOQUEADO: 'use client' em page.tsx público: $USE_CLIENT_PAGES" >&2
  ERRORS=$((ERRORS + 1))
fi

# 2. Nenhum import de Drizzle em componentes admin dentro de pages públicas
ADMIN_IMPORT=$(grep -r "from '@/app/admin\|from '../admin\|from '../../admin" "app/(public)/" --include="*.tsx" -l 2>/dev/null)
if [ -n "$ADMIN_IMPORT" ]; then
  echo "BLOQUEADO: Import de módulo admin em página pública: $ADMIN_IMPORT" >&2
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo "[public-frontend] $ERRORS violação(ões) encontrada(s). Corrija antes de encerrar." >&2
  exit 2
fi

echo "[public-frontend] Todas as páginas públicas estão conformes. Encerrando." >&2
exit 0
