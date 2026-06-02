#!/usr/bin/env bash
# Hook: cron-automator/pre-tool-use
# Bloqueia ações fora do escopo do cron-automator agent.
# Escopo: app/api/cron/, lib/automation.ts, lib/rss-automation.ts, lib/source-crawlers/

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita fora do escopo de automação/cron
  if echo "$TARGET" | grep -qE '(app/admin/|app/\(public\)/|lib/agents/|drizzle/schema\.ts|components/)'; then
    echo "BLOQUEADO [cron-automator]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent cron-automator só escreve em app/api/cron/, lib/automation.ts, lib/rss*.ts, lib/source-crawlers/." >&2
    echo "  UI → admin-ui | Pipeline IA → ai-pipeline | Schema DB → db-engineer" >&2
    exit 2
  fi

  # Bloqueia modificação de vercel.json com crons (regra crítica)
  if echo "$TARGET" | grep -q "vercel\.json"; then
    # Permite editar vercel.json mas vai checar no post-tool-use
    echo "[cron-automator] AVISO: Editando vercel.json. Certifique-se de NÃO adicionar a chave 'crons'." >&2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|vercel deploy)'; then
    echo "BLOQUEADO [cron-automator]: Operações de deploy ou commit estão fora do escopo." >&2
    exit 2
  fi
fi

exit 0
