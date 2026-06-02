#!/usr/bin/env bash
# Hook: public-frontend/pre-tool-use
# Bloqueia ações fora do escopo do public-frontend agent.
# Escopo: app/(public)/, app/feed.xml/, components/blog/. Proibido: app/admin/, lib/agents/, drizzle/.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita fora do escopo do frontend público
  if echo "$TARGET" | grep -qE '(app/admin/|app/api/|lib/agents/|lib/agent-pipeline|drizzle/schema\.ts)'; then
    echo "BLOQUEADO [public-frontend]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent public-frontend só escreve em app/(public)/, app/feed.xml/, components/blog/." >&2
    echo "  Admin UI → admin-ui | Rotas API → api-builder | DB → db-engineer" >&2
    exit 2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy|npm run db:)'; then
    echo "BLOQUEADO [public-frontend]: Operações de deploy, commit ou banco estão fora do escopo." >&2
    exit 2
  fi
fi

exit 0
