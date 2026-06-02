---
name: add-ai-feature
description: >
  Use when adding any new AI feature, agent, or LLM call to the ExpxBlog project.
  Enforces the project's mandatory OpenRouter-only constraint: ALL AI calls must
  go through lib/ai.ts — never via direct provider SDKs (openai, anthropic, etc.).
  Covers the full registration flow: DEFAULT_MODELS → FEATURE_LABELS → aiChat().
---

# Skill: Add AI Feature

## When to use

Trigger this skill when any of the following is true:
- Adding a new LLM-powered feature (generation, suggestion, classification, etc.)
- Adding a new pipeline agent in `lib/agents/`
- The prompt mentions "new AI feature", "novo agente", "nova feature de IA", "usar OpenAI", "usar Anthropic"
- You are about to `import OpenAI` or `import Anthropic` — STOP and use this skill instead

## When NOT to use

- Modifying an existing AI feature that already uses `aiChat()` correctly
- Changing model selection in the admin UI without adding a new feature key
- Work unrelated to AI/LLM calls

---

## The Core Rule

**Every AI call in this project MUST go through `lib/ai.ts` via OpenRouter.**

No exceptions. Not even "just for testing". The project has no OpenAI SDK, no Anthropic SDK — and must not gain them. The API key lives in the `site_settings` database table, not in environment variables.

---

## Step-by-step checklist

### 1. Register the feature key in `lib/ai.ts`

Open `lib/ai.ts` and add the new feature key to `DEFAULT_MODELS`:

```typescript
// lib/ai.ts
const DEFAULT_MODELS: Record<string, string> = {
  content_generation: 'openai/gpt-4o-mini',
  title_suggestion:   'openai/gpt-4o-mini',
  // ... existing entries ...
  my_new_feature: 'openai/gpt-4o-mini',  // ← add here
}
```

Use `'openai/gpt-4o-mini'` as the default unless the feature requires vision (`openai/gpt-4o`) or image generation (`openai/gpt-5-image`).

### 2. Add the Portuguese label in `ConfiguracoesClient.tsx`

Open `app/admin/configuracoes/ConfiguracoesClient.tsx` and add an entry to `FEATURE_LABELS`:

```typescript
const FEATURE_LABELS: Record<string, string> = {
  content_generation: 'Geração de Conteúdo',
  // ... existing entries ...
  my_new_feature: 'Minha Nova Feature',  // ← add here (in Portuguese)
}
```

This makes the feature appear in the admin UI under Settings → IA (OpenRouter) so the admin can change its model.

### 3. Call the LLM with `aiChat()`

In your implementation file, import and call `aiChat()`:

```typescript
import { aiChat } from '@/lib/ai'

export async function myNewFeature(input: string): Promise<string> {
  const messages = [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user'   as const, content: input },
  ]

  const result = await aiChat('my_new_feature', messages)
  return result
}
```

`aiChat(feature, messages, options?)` automatically:
- Reads the API key from `site_settings.ai_api_key`
- Reads the selected model from `site_settings.ai_models.my_new_feature`
- Falls back to the `DEFAULT_MODELS` entry if no model is set in DB
- Throws if no API key is configured

### 4. Handle the "no API key" case

`aiChat()` throws if the key is missing. Wrap it appropriately:

```typescript
// In an API route:
try {
  const result = await myNewFeature(input)
  return NextResponse.json({ result })
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Erro ao chamar IA'
  return NextResponse.json({ error: msg }, { status: 500 })
}
```

### 5. For new pipeline agents (`lib/agents/`)

If the feature is an agent in the multi-step pipeline, create `lib/agents/my-agent.ts` following the existing pattern:

```typescript
// lib/agents/my-agent.ts
import { aiChat } from '@/lib/ai'
import type { AgentContext } from './types'

export async function runMyAgent(ctx: AgentContext): Promise<string> {
  const messages = [
    { role: 'system' as const, content: ctx.systemPrompt ?? 'Default prompt.' },
    { role: 'user'   as const, content: ctx.input },
  ]
  return await aiChat('my_new_feature', messages)
}
```

Then register the agent in `lib/agent-pipeline.ts` at the correct step.

---

## What NOT to do

```typescript
// ❌ NEVER — direct OpenAI SDK
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ❌ NEVER — direct Anthropic SDK
import Anthropic from '@anthropic-ai/sdk'

// ❌ NEVER — direct fetch to OpenAI/Anthropic endpoints
fetch('https://api.openai.com/v1/chat/completions', ...)
fetch('https://api.anthropic.com/v1/messages', ...)

// ❌ NEVER — API key from env vars
const key = process.env.OPENAI_API_KEY

// ✅ ALWAYS — through lib/ai.ts
import { aiChat } from '@/lib/ai'
const result = await aiChat('my_feature', messages)
```

---

## Example: complete new feature end-to-end

**Scenario:** Add a "comment_moderation" feature that checks if a comment is spam.

**`lib/ai.ts`** — add key:
```typescript
comment_moderation: 'openai/gpt-4o-mini',
```

**`app/admin/configuracoes/ConfiguracoesClient.tsx`** — add label:
```typescript
comment_moderation: 'Moderação de Comentários',
```

**`lib/comment-moderation.ts`** — implement:
```typescript
import { aiChat } from '@/lib/ai'

export async function isSpam(comment: string): Promise<boolean> {
  const result = await aiChat('comment_moderation', [
    { role: 'system', content: 'Reply with only "spam" or "ok".' },
    { role: 'user',   content: comment },
  ])
  return result.trim().toLowerCase() === 'spam'
}
```

**`app/api/admin/comments/route.ts`** — use:
```typescript
import { isSpam } from '@/lib/comment-moderation'
// ...
const spam = await isSpam(body.comment)
```

---

## Verification before finishing

- [ ] New key added to `DEFAULT_MODELS` in `lib/ai.ts`
- [ ] New label added to `FEATURE_LABELS` in `ConfiguracoesClient.tsx`
- [ ] Implementation uses `aiChat()` — no direct provider imports anywhere
- [ ] Error from `aiChat()` is caught and returned as a proper HTTP error
- [ ] `npm run build` passes (no TS errors)
