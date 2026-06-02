#!/usr/bin/env bash
# Hook: api-builder/pre-tool-use
# Bloqueia ações fora do escopo do api-builder agent.
# Escopo: app/api/, lib/ (helpers de API). Proibido: UI, lib/agents/, drizzle/schema.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita em UI, schema do banco, e pipeline de agentes
  if echo "$TARGET" | grep -qE '(app/admin/[^/]*Client\.tsx|app/\(public\)/|lib/agents/|lib/agent-pipeline|drizzle/schema\.ts)'; then
    echo "BLOQUEADO [api-builder]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent api-builder só escreve em app/api/ e lib/ (sem agents ou schema)." >&2
    echo "  Páginas admin → admin-ui | Pipeline IA → ai-pipeline | Schema DB → db-engineer" >&2
    exit 2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"
  # Bloqueia git push e deploy
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy)'; then
    echo "BLOQUEADO [api-builder]: Operações de deploy ou commit estão fora do escopo." >&2
    echo "Use o orquestrador para deploys e commits." >&2
    exit 2
  fi
fi

exit 0
