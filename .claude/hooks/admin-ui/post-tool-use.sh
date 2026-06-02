#!/usr/bin/env bash
# Hook: admin-ui/post-tool-use
# Após editar arquivos admin, verifica TypeScript (build) automaticamente.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Só roda verificação em arquivos de componentes/páginas admin
  if echo "$TARGET" | grep -qE 'app/admin/.*\.(tsx?|jsx?)$'; then
    echo "[admin-ui] Arquivo editado: $TARGET — verificando TypeScript..." >&2
    cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog
    # Verifica apenas erros de TS sem gerar output de build completo
    npx tsc --noEmit --pretty 2>&1 | tail -20 >&2
    TS_EXIT=$?
    if [ $TS_EXIT -ne 0 ]; then
      echo "[admin-ui] ATENÇÃO: Erros de TypeScript detectados. Corrija antes de continuar." >&2
    else
      echo "[admin-ui] TypeScript OK." >&2
    fi
  fi
fi

exit 0
