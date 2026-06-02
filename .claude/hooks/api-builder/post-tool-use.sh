#!/usr/bin/env bash
# Hook: api-builder/post-tool-use
# Após editar rotas API, verifica violações de segurança críticas.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  if echo "$TARGET" | grep -qE 'app/api/.*route\.ts$'; then

    # 1. Rota pública retornando posts sem filtro de status?
    if echo "$TARGET" | grep -qE 'app/api/posts'; then
      DRAFT_LEAK=$(grep -n "status" "$TARGET" 2>/dev/null | grep -v "published\|draft.*filter\|where.*status")
      # Checa se a rota faz SELECT sem filtrar status
      NO_FILTER=$(grep -n "\.select\(\)" "$TARGET" 2>/dev/null)
      STATUS_FILTER=$(grep -n "status.*published\|published.*status\|eq.*status" "$TARGET" 2>/dev/null)
      if [ -n "$NO_FILTER" ] && [ -z "$STATUS_FILTER" ]; then
        echo "AVISO CRÍTICO [api-builder]: Rota pública $TARGET pode expor posts rascunho!" >&2
        echo "Adicione filtro: .where(eq(posts.status, 'published'))" >&2
      fi
    fi

    # 2. HTML sendo persistido sem sanitize-html?
    PERSIST=$(grep -n "db\.\(insert\|update\)" "$TARGET" 2>/dev/null)
    HTML_INPUT=$(grep -n "content\|html\|body" "$TARGET" 2>/dev/null | grep -v "sanitize\|Content-Type\|json")
    if [ -n "$PERSIST" ] && [ -n "$HTML_INPUT" ]; then
      SANITIZE=$(grep -n "sanitize" "$TARGET" 2>/dev/null)
      if [ -z "$SANITIZE" ]; then
        echo "AVISO [api-builder]: $TARGET persiste dados no banco sem sanitize-html detectado." >&2
        echo "Se o campo aceita HTML, adicione: import sanitizeHtml from 'sanitize-html'" >&2
      fi
    fi

    echo "[api-builder] Rota $TARGET verificada." >&2
  fi
fi

exit 0
