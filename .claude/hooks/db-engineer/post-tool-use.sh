#!/usr/bin/env bash
# Hook: db-engineer/post-tool-use
# Após editar schema ou queries, verifica padrões críticos de conexão e segurança.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then

  # Checa drizzle/db.ts
  if echo "$TARGET" | grep -q "drizzle/db\.ts"; then
    # prepare: true proibido — quebra o pooler do Supabase
    PREPARE_TRUE=$(grep -n "prepare: true" "$TARGET" 2>/dev/null)
    if [ -n "$PREPARE_TRUE" ]; then
      echo "BLOQUEADO [db-engineer]: 'prepare: true' em drizzle/db.ts quebra o Supabase pooler!" >&2
      echo "Use 'prepare: false' (ou omita — o padrão já é false)." >&2
      exit 2
    fi

    # Pool max não pode exceder 5
    MAX_CONN=$(grep -n "max:" "$TARGET" 2>/dev/null | grep -E "max: [6-9]|max: [0-9]{2,}")
    if [ -n "$MAX_CONN" ]; then
      echo "BLOQUEADO [db-engineer]: Pool com mais de 5 conexões vai sobrecarregar o Supabase!" >&2
      echo "Mantenha max: 5" >&2
      exit 2
    fi

    echo "[db-engineer] drizzle/db.ts verificado — configuração de pool OK." >&2
  fi

  # Checa drizzle/schema.ts — não pode ter secrets hardcoded
  if echo "$TARGET" | grep -q "drizzle/schema\.ts"; then
    SECRETS=$(grep -nE "(password|secret|api_key|jwt_secret)\s*=\s*['\"][^'\"]{8,}" "$TARGET" 2>/dev/null)
    if [ -n "$SECRETS" ]; then
      echo "BLOQUEADO [db-engineer]: Possível segredo hardcoded em schema.ts!" >&2
      echo "$SECRETS" >&2
      exit 2
    fi
    echo "[db-engineer] drizzle/schema.ts verificado — sem secrets detectados." >&2
  fi
fi

exit 0
