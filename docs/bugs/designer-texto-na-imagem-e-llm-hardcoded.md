# Bug: Texto aparece em imagens geradas pelo Designer e LLM hardcoded

**Data**: 2026-06-03
**Severidade**: MÉDIO
**Status**: RESOLVIDO

## Descrição do problema

O usuário configurou o prompt do agente Designer com instrução explícita de não gerar texto na imagem ("Regra estrita: Sem nenhum tipo de texto, letras, números na imagem"). Mesmo assim, as imagens continuavam trazendo texto. Também foi identificado que o modelo LLM usado para gerar o prompt intermediário estava hardcoded como `gpt-4o-mini`, ignorando qualquer configuração feita pelo usuário no painel admin.

## Causa-raiz

**Três pontos de falha:**

1. **`lib/agents/designer.ts`** — O `gpt-4o-mini` recebia o system prompt do usuário e gerava um prompt intermediário para o modelo de imagem, mas não garantia propagar a restrição "sem texto" de forma literal. O sufixo de garantia precisava ser aplicado diretamente ao prompt enviado ao modelo de imagem, não ao LLM de texto.

2. **`lib/agents/designer.ts`** — O modelo de texto intermediário estava hardcoded como `callOpenRouter({ model: 'openai/gpt-4o-mini' })`, ignorando a configuração de modelos do admin.

3. **`app/api/admin/ai/image/generate/route.ts`** — O fallback do endpoint de geração manual não continha instrução de evitar texto na imagem, e o `finalPrompt` era passado ao modelo de imagem sem nenhum sufixo de restrição.

## Solução aplicada

**Correção mínima em três arquivos:**

1. `lib/agents/designer.ts` — substituiu `callOpenRouter({ model: 'openai/gpt-4o-mini' })` por `aiChat('prompt_generation', ...)`, tornando o modelo configurável via admin. O sufixo `'. No text, no letters, no words, no numbers anywhere in the image.'` foi adicionado **somente no branch de IA** (antes de `callOpenRouterImage`), preservando a query limpa para o Pexels.

2. `lib/agents/types.ts` — `defaultPrompt` do agente designer foi atualizado para incluir instrução explícita de ausência de texto na imagem gerada.

3. `app/api/admin/ai/image/generate/route.ts` — fallback system prompt atualizado para incluir instrução de sem texto; sufixo adicionado ao `finalPrompt` antes de `callOpenRouterImage`.

**Arquivos modificados**:
- `lib/agents/designer.ts` — substituiu LLM hardcoded por `aiChat`; corrigiu escopo do sufixo para branch AI apenas
- `lib/agents/types.ts` — `defaultPrompt` atualizado com instrução de no-text
- `app/api/admin/ai/image/generate/route.ts` — fallback e sufixo no finalPrompt

## Como reproduzir (antes da correção)

1. Configurar o prompt do agente Designer com "Sem nenhum tipo de texto, letras, números na imagem"
2. Gerar um artigo via pipeline ou usar o botão de IA no campo de capa do editor
3. Resultado: imagem gerada contém texto, letras ou números

## Como verificar (após a correção)

- [ ] Gerar imagem via pipeline automático e confirmar ausência de texto na imagem
- [ ] Gerar imagem via botão de IA no editor de artigos e confirmar ausência de texto
- [ ] Alterar o modelo de `prompt_generation` no admin e confirmar que o pipeline usa o novo modelo
- [ ] `npm run build` passa sem erros

## Lições aprendidas

Instruções meta ("sem texto na imagem") passadas ao LLM de texto que gera prompts intermediários **não são propagadas com garantia** para o modelo de imagem. Restrições do output final devem ser aplicadas como sufixo hardcoded diretamente no prompt do modelo de imagem, independente do que o LLM intermediário produzir. O caminho Pexels não deve receber esse sufixo pois ele serve como query de busca textual — aplicar a separação por branch evita degradação dos resultados de busca.
