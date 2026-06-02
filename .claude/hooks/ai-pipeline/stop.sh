#!/usr/bin/env bash
# Hook: ai-pipeline/stop
# Antes de encerrar, garante que nenhum arquivo lib/agents/ ou lib/ai.ts
# tem imports diretos de providers de IA.

cd /Users/thuliobittencourt/Documents/Projetos/ExpxBlog

echo "[ai-pipeline] Verificação final — checando violações de OpenRouter-only..." >&2

VIOLATIONS=$(grep -r "from '(openai|@anthropic-ai/sdk|groq-sdk)'" lib/agents/ lib/ai.ts lib/agent-pipeline.ts 2>/dev/null)
if [ -n "$VIOLATIONS" ]; then
  echo "BLOQUEADO [ai-pipeline]: Imports diretos de SDK de provider encontrados!" >&2
  echo "$VIOLATIONS" >&2
  echo "O projeto exige que TODA IA passe por lib/ai.ts. Corrija antes de encerrar." >&2
  exit 2
fi

DIRECT_FETCH=$(grep -r "fetch.*api\.openai\.com\|fetch.*api\.anthropic\.com" lib/ 2>/dev/null)
if [ -n "$DIRECT_FETCH" ]; then
  echo "BLOQUEADO [ai-pipeline]: fetch() direto para providers de IA detectado!" >&2
  echo "$DIRECT_FETCH" >&2
  exit 2
fi

echo "[ai-pipeline] Verificação OK — todos os calls de IA passam por lib/ai.ts." >&2
exit 0
