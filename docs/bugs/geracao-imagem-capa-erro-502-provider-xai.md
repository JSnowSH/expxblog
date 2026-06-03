# Bug: Falha na geração de imagem de capa — erro 502 do provider xAI via OpenRouter

**Data**: 2026-06-03  
**Severidade**: ALTO  
**Status**: RESOLVIDO  

## Descrição do problema

Ao executar o pipeline de geração de artigos, o agente Designer falhava ao gerar a imagem de capa com o erro:

```
OpenRouter Image API error (502): {"error":{"message":"Provider returned error","code":502,
"metadata":{"raw":"{\"code\":\"Internal error\",\"error\":\"Image generation failed. 
Please try again later.\"}","provider_name":"xAI","is_byok":false}}}
```

O artigo era gerado sem imagem de capa.

## Causa-raiz

**Arquivo**: `lib/ai.ts`  
**Função**: `callOpenRouterImage`  
**Tipo**: Falta de resiliência a falhas transientes de provider

A função `callOpenRouterImage` fazia um único `fetch` sem retry. Quando o OpenRouter retornava 502 (erro interno temporário do provider xAI), o erro era propagado imediatamente. O erro 502 é explicitamente transiente — o provider indica "try again later" — mas o código não tentava novamente.

Problema secundário: após o loop de retry, não havia guard `!response.ok` para o caso de todas as tentativas 502/503 serem esgotadas, o que faria o código tentar parsear como JSON uma resposta de erro.

## Solução aplicada

Três mudanças em `lib/ai.ts` dentro de `callOpenRouterImage`:

1. **Retry com backoff**: refatoração do fetch único para loop com até 3 tentativas, delay de 3s entre tentativas, apenas para status 502 e 503. Erros definitivos (400, 401, 404 etc.) continuam propagando imediatamente.

2. **Guard pós-loop**: adição de `if (!response.ok)` após o loop para garantir que retries esgotados (todas as 3 tentativas com 502/503) lançam o erro correto em vez de tentar parsear a resposta de erro como JSON.

3. **AbortSignal compartilhado**: o `AbortSignal.timeout(180_000)` foi movido para fora do loop, garantindo budget total de 180s entre todas as tentativas em vez de 180s por tentativa (que poderia resultar em 540s de espera).

4. **Remoção de `console.log`**: debug log de produção removido da linha que exibia o conteúdo da resposta de imagem.

**Arquivos modificados**:
- `lib/ai.ts` — retry com backoff, guard pós-loop, AbortSignal compartilhado, remoção de log

## Como reproduzir (antes da correção)

1. Configurar o modelo do agente Designer para um modelo xAI no banco (`agent_configs`)
2. Executar o pipeline completo de geração de artigo
3. O agente Designer falha imediatamente ao primeiro erro 502 do provider xAI

## Como verificar (após a correção)

- [ ] Pipeline completo gera imagem de capa sem falha em condições normais
- [ ] Em caso de erro 502 transiente, o pipeline retenta até 2 vezes antes de falhar
- [ ] Erros definitivos (401, 404) não fazem retry
- [ ] `npm run build` passa
- [ ] `npm run lint` limpo

## Lições aprendidas

Chamadas a providers de IA via OpenRouter podem retornar 502/503 transientes, especialmente para geração de imagem que é computacionalmente mais pesada. Toda função que chama `callOpenRouterImage` (ou equivalente) deve assumir falhas transientes como parte do contrato normal do provider. O padrão correto é retry com backoff linear (não exponencial para este caso) com no máximo 3 tentativas.
