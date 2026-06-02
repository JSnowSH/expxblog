#!/usr/bin/env bash
# Hook: ai-pipeline/post-tool-use
# Após editar arquivos do pipeline, verifica imports indevidos de SDKs de IA.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  if echo "$TARGET" | grep -qE '\.(tsx?|jsx?)$'; then
    # Verifica imports proibidos de providers de IA
    FORBIDDEN=$(grep -nE "from '(openai|@anthropic-ai/sdk|groq-sdk|@google/generative-ai)'" "$TARGET" 2>/dev/null)
    if [ -n "$FORBIDDEN" ]; then
      echo "ERRO CRÍTICO [ai-pipeline]: Import direto de SDK de provider encontrado em $TARGET:" >&2
      echo "$FORBIDDEN" >&2
      echo "Substitua por aiChat() ou callOpenRouter() via lib/ai.ts." >&2
      exit 2
    fi

    # Verifica fetch direto para APIs de providers
    DIRECT_API=$(grep -nE "fetch\(['\"]https://(api\.openai\.com|api\.anthropic\.com)" "$TARGET" 2>/dev/null)
    if [ -n "$DIRECT_API" ]; then
      echo "ERRO CRÍTICO [ai-pipeline]: fetch() direto para API de provider em $TARGET:" >&2
      echo "$DIRECT_API" >&2
      echo "Use callOpenRouter() via lib/ai.ts." >&2
      exit 2
    fi

    echo "[ai-pipeline] Arquivo $TARGET verificado — sem imports proibidos." >&2
  fi
fi

exit 0
