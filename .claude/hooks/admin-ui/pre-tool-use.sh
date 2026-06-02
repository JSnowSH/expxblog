#!/usr/bin/env bash
# Hook: admin-ui/pre-tool-use
# Bloqueia ações fora do escopo do admin-ui agent.
# Escopo: app/admin/, components/ (admin-only). Proibido: git push, DB direto, lib/agents/.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita em arquivos fora do escopo
  if echo "$TARGET" | grep -qE '(lib/agents/|lib/agent-pipeline|drizzle/schema|drizzle/db|app/api/cron|app/\(public\)/)'; then
    echo "BLOQUEADO [admin-ui]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent admin-ui só escreve em app/admin/ e components/ (admin). Use o agente correto:" >&2
    echo "  lib/agents/ → ai-pipeline | drizzle/ → db-engineer | app/api/ → api-builder" >&2
    exit 2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"
  # Bloqueia git push e deploy direto
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy|npm run db:)'; then
    echo "BLOQUEADO [admin-ui]: O agent admin-ui não pode fazer deploys, commits ou migrations de banco." >&2
    echo "Para deploy: faça git push via orquestrador. Para DB: use o agent db-engineer." >&2
    exit 2
  fi
fi

exit 0
