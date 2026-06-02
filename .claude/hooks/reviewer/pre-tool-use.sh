#!/usr/bin/env bash
# Hook: reviewer/pre-tool-use
# O agent reviewer é READ-ONLY. Bloqueia qualquer tentativa de modificar arquivos.

TOOL="$1"

case "$TOOL" in
  Write|Edit|MultiEdit)
    echo "BLOQUEADO: O agent reviewer é somente leitura e não pode modificar arquivos." >&2
    echo "Use Read ou Bash (apenas para rodar build/lint/testes) em vez de $TOOL." >&2
    exit 2
    ;;
  Bash)
    COMMAND="$2"
    # Bloqueia comandos destrutivos ou que modifiquem o estado do repositório
    if echo "$COMMAND" | grep -qE '(git (add|commit|push|reset|checkout|merge|rebase|branch -[dD])|rm -|mv |cp -|npm install|npm run dev|> [^/])'; then
      echo "BLOQUEADO: O agent reviewer não pode executar comandos que modifiquem o repositório." >&2
      echo "Comandos permitidos: npm run build, npm run lint, cat, grep, ls, git diff, git log, git status." >&2
      exit 2
    fi
    ;;
esac

exit 0
