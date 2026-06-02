#!/usr/bin/env bash
# Hook: public-frontend/post-tool-use
# Após editar páginas públicas, verifica violações do padrão Server Component.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  if echo "$TARGET" | grep -qE 'app/\(public\)/.*\.(tsx?|jsx?)$'; then

    # 1. Páginas públicas não podem ter 'use client'
    USE_CLIENT=$(grep -n "'use client'" "$TARGET" 2>/dev/null)
    if [ -n "$USE_CLIENT" ]; then
      echo "BLOQUEADO [public-frontend]: 'use client' em página pública — $TARGET" >&2
      echo "Páginas em app/(public)/ são Server Components. Extraia a parte interativa para um componente separado em components/blog/." >&2
      exit 2
    fi

    # 2. Páginas públicas não podem usar fetch('/api/...') — devem consultar DB direto
    API_FETCH=$(grep -n "fetch.*['\"/]api/" "$TARGET" 2>/dev/null)
    if [ -n "$API_FETCH" ]; then
      echo "AVISO [public-frontend]: $TARGET usa fetch() para /api/ — use Drizzle direto no Server Component." >&2
      echo "Linhas: $API_FETCH" >&2
    fi

    # 3. Posts sem filtro de status publicado?
    NO_STATUS_FILTER=$(grep -n "\.select\(\)" "$TARGET" 2>/dev/null)
    HAS_PUBLISHED=$(grep -n "published\|status" "$TARGET" 2>/dev/null)
    if [ -n "$NO_STATUS_FILTER" ] && [ -z "$HAS_PUBLISHED" ]; then
      echo "AVISO [public-frontend]: $TARGET pode expor rascunhos! Adicione filtro status = 'published'." >&2
    fi

    echo "[public-frontend] Arquivo $TARGET verificado." >&2
  fi
fi

exit 0
