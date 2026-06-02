#!/usr/bin/env bash
# Hook: ai-pipeline/pre-tool-use
# Bloqueia ações fora do escopo do ai-pipeline agent.
# Escopo: lib/agents/, lib/agent-pipeline.ts, lib/ai.ts, lib/firecrawl.ts

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita em UI, rotas API, banco de dados, e crons
  if echo "$TARGET" | grep -qE '(app/admin/|app/\(public\)/|app/api/cron|drizzle/schema|drizzle/db\.ts)'; then
    echo "BLOQUEADO [ai-pipeline]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent ai-pipeline só escreve em lib/agents/, lib/agent-pipeline.ts, lib/ai.ts." >&2
    echo "  UI admin → admin-ui | Rotas API → api-builder | DB → db-engineer | Crons → cron-automator" >&2
    exit 2
  fi

  # Bloqueia imports diretos de providers de IA (regra crítica do projeto)
  if [ -f "$TARGET" ]; then
    if grep -qE "import (OpenAI|Anthropic|Groq) from" "$TARGET" 2>/dev/null; then
      echo "BLOQUEADO [ai-pipeline]: Import direto de SDK de provider detectado em $TARGET!" >&2
      echo "TODOS os calls de IA devem passar por lib/ai.ts → aiChat() ou callOpenRouter()." >&2
      exit 2
    fi
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"
  # Bloqueia git push, deploy, e acesso direto ao banco
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy|psql |npm run db:)'; then
    echo "BLOQUEADO [ai-pipeline]: Operações de deploy, commit ou banco estão fora do escopo." >&2
    echo "Use o orquestrador para deploys. Para banco de dados, use o agent db-engineer." >&2
    exit 2
  fi
fi

exit 0
