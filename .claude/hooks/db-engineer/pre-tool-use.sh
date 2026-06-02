#!/usr/bin/env bash
# Hook: db-engineer/pre-tool-use
# Bloqueia ações fora do escopo do db-engineer agent.
# Escopo: drizzle/, lib/db-queries.ts. Proibido: UI, rotas API, lib/agents/.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita fora do escopo de banco de dados
  if echo "$TARGET" | grep -qE '(app/admin/|app/\(public\)/|app/api/|lib/agents/|lib/agent-pipeline|lib/ai\.ts|components/)'; then
    echo "BLOQUEADO [db-engineer]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent db-engineer só escreve em drizzle/ e lib/db-queries.ts." >&2
    echo "  UI admin → admin-ui | Rotas API → api-builder | Pipeline IA → ai-pipeline" >&2
    exit 2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"

  # Bloqueia git push e deploy
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy)'; then
    echo "BLOQUEADO [db-engineer]: Operações de deploy ou commit estão fora do escopo." >&2
    exit 2
  fi

  # Bloqueia comandos de banco destrutivos sem confirmação explícita
  if echo "$CMD" | grep -qE '(DROP TABLE|DROP DATABASE|DELETE FROM .* WHERE 1|TRUNCATE)'; then
    echo "BLOQUEADO [db-engineer]: Comando SQL destrutivo detectado — requer confirmação explícita do usuário." >&2
    echo "Comando: $CMD" >&2
    exit 2
  fi
fi

exit 0
