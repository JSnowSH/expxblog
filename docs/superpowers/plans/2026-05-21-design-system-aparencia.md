# Design System Completo na Aparência Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir a página de Aparência com um design system completo (cores estendidas, tipografia, espaçamento, raio de borda) e um importador automático que lê o CSS do site da empresa e extrai os tokens, aplicando-os ao blog. O template controla apenas estrutura — o design system aplica-se a todos os templates.

**Architecture:** Os tokens do design system são armazenados como JSON na tabela `site_settings` (chave `design_system`). O `RootLayout` os lê e injeta as CSS custom properties no `<head>`. A página de Aparência ganha três novas seções: Tipografia, Tokens Avançados e Importar do Site. Um endpoint `/api/admin/design-system/extract` faz fetch da URL informada, parseia o CSS retornado (sem executar JS) e devolve os tokens extraídos; o admin confirma antes de aplicar.

**Tech Stack:** Next.js 14 App Router · TypeScript · Drizzle ORM · `css-tree` (parse CSS AST) · Tailwind CSS · React state

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/settings.ts` | Modificar | Adicionar `DesignSystem` interface e persistência |
| `app/layout.tsx` | Modificar | Injetar CSS vars extras do design system |
| `app/api/admin/settings/route.ts` | Modificar | Aceitar campo `design_system` no PUT |
| `app/api/admin/design-system/extract/route.ts` | Criar | Fetch + parse CSS da URL, retornar tokens |
| `app/admin/aparencia/ApparenceClient.tsx` | Modificar | Adicionar seções Tipografia, Tokens Avançados, Importar do Site |
| `app/admin/aparencia/DesignSystemImporter.tsx` | Criar | Componente de importação (URL input + preview + confirmar) |
| `app/admin/aparencia/page.tsx` | Modificar | Passar `design_system` para o client |

---

## Task 1: Definir interface `DesignSystem` e persistência em `lib/settings.ts`

**Files:**
- Modify: `lib/settings.ts`

- [ ] **Step 1: Adicionar interface `DesignSystem` e `DEFAULT_DESIGN_SYSTEM` em `lib/settings.ts`**

Abrir `lib/settings.ts` e adicionar logo após a interface `ThemeColors`:

```typescript
export interface DesignSystem {
  // Typography
  font_sans: string        // e.g. "Inter, system-ui, sans-serif"
  font_serif: string       // e.g. "Source Serif 4, Georgia, serif"
  font_mono: string        // e.g. "JetBrains Mono, monospace"
  font_size_base: string   // e.g. "16px"
  font_size_sm: string     // e.g. "14px"
  font_size_lg: string     // e.g. "18px"
  font_size_xl: string     // e.g. "20px"
  font_size_2xl: string    // e.g. "24px"
  font_size_3xl: string    // e.g. "30px"
  line_height_base: string // e.g. "1.75"
  font_weight_normal: string // e.g. "400"
  font_weight_medium: string // e.g. "500"
  font_weight_bold: string   // e.g. "700"
  // Spacing
  spacing_base: string     // e.g. "4px"
  // Border radius
  radius_sm: string        // e.g. "4px"
  radius_md: string        // e.g. "8px"
  radius_lg: string        // e.g. "12px"
  radius_full: string      // e.g. "9999px"
  // Extended colors
  color_text_primary: string   // e.g. "#1A1A2E"
  color_text_secondary: string // e.g. "#4B5563"
  color_border: string         // e.g. "#E5E7EB"
  color_error: string          // e.g. "#DC2626"
  color_success: string        // e.g. "#16A34A"
  color_warning: string        // e.g. "#D97706"
}

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  font_sans: 'Inter, system-ui, sans-serif',
  font_serif: '"Source Serif 4", Georgia, serif',
  font_mono: '"JetBrains Mono", monospace',
  font_size_base: '16px',
  font_size_sm: '14px',
  font_size_lg: '18px',
  font_size_xl: '20px',
  font_size_2xl: '24px',
  font_size_3xl: '30px',
  line_height_base: '1.75',
  font_weight_normal: '400',
  font_weight_medium: '500',
  font_weight_bold: '700',
  spacing_base: '4px',
  radius_sm: '4px',
  radius_md: '8px',
  radius_lg: '12px',
  radius_full: '9999px',
  color_text_primary: '#1A1A2E',
  color_text_secondary: '#4B5563',
  color_border: '#E5E7EB',
  color_error: '#DC2626',
  color_success: '#16A34A',
  color_warning: '#D97706',
}
```

- [ ] **Step 2: Adicionar `design_system` ao `SiteSettings` e ao `getSettings`**

Modificar a interface `SiteSettings`:

```typescript
export interface SiteSettings {
  template: string
  colors: ThemeColors
  company: CompanyInfo
  newsletter: NewsletterConfig
  design_system: DesignSystem
}
```

No final do `getSettings`, dentro do `try`, antes do `return`, adicionar:

```typescript
const storedDS = map['design_system'] ? (JSON.parse(map['design_system']) as Partial<DesignSystem>) : {}
const design_system: DesignSystem = { ...DEFAULT_DESIGN_SYSTEM, ...storedDS }
```

E atualizar o `return` para incluir `design_system`:

```typescript
return { template, colors, company, newsletter, design_system }
```

Atualizar o `catch` fallback:

```typescript
return { template: 'default', colors: defaultColors('default'), company: DEFAULT_COMPANY, newsletter: DEFAULT_NEWSLETTER, design_system: DEFAULT_DESIGN_SYSTEM }
```

- [ ] **Step 3: Commit**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/Blog/mma-blog
git add lib/settings.ts
git commit -m "feat: add DesignSystem interface and persistence to settings"
```

---

## Task 2: Injetar CSS vars do design system no RootLayout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Atualizar imports e construção de cssVars em `app/layout.tsx`**

O arquivo já importa `getSettings, darkenHex, lightenHex`. Apenas modificar a função `RootLayout` para ler `design_system` e estender as CSS vars:

```typescript
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { template, colors, design_system } = await getSettings()

  const cssVars =
    `:root{` +
    // color vars (existing)
    `--color-primary:${colors.primary};` +
    `--color-primary-dark:${darkenHex(colors.primary)};` +
    `--color-primary-light:${lightenHex(colors.primary)};` +
    `--color-secondary:${colors.secondary};` +
    `--color-secondary-dark:${darkenHex(colors.secondary)};` +
    `--color-secondary-light:${lightenHex(colors.secondary)};` +
    `--color-bg:${colors.background};` +
    `--color-surface:${colors.surface};` +
    // design system
    `--font-sans:${design_system.font_sans};` +
    `--font-serif:${design_system.font_serif};` +
    `--font-mono:${design_system.font_mono};` +
    `--font-size-base:${design_system.font_size_base};` +
    `--font-size-sm:${design_system.font_size_sm};` +
    `--font-size-lg:${design_system.font_size_lg};` +
    `--font-size-xl:${design_system.font_size_xl};` +
    `--font-size-2xl:${design_system.font_size_2xl};` +
    `--font-size-3xl:${design_system.font_size_3xl};` +
    `--line-height-base:${design_system.line_height_base};` +
    `--font-weight-normal:${design_system.font_weight_normal};` +
    `--font-weight-medium:${design_system.font_weight_medium};` +
    `--font-weight-bold:${design_system.font_weight_bold};` +
    `--spacing-base:${design_system.spacing_base};` +
    `--radius-sm:${design_system.radius_sm};` +
    `--radius-md:${design_system.radius_md};` +
    `--radius-lg:${design_system.radius_lg};` +
    `--radius-full:${design_system.radius_full};` +
    `--color-text-primary:${design_system.color_text_primary};` +
    `--color-text-secondary:${design_system.color_text_secondary};` +
    `--color-border:${design_system.color_border};` +
    `--color-error:${design_system.color_error};` +
    `--color-success:${design_system.color_success};` +
    `--color-warning:${design_system.color_warning};` +
    `}`

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body
        className="text-neutral-900 antialiased"
        style={{ backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)' }}
        data-template={template}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: inject design system CSS vars from settings into RootLayout"
```

---

## Task 3: Aceitar `design_system` no PUT `/api/admin/settings`

**Files:**
- Modify: `app/api/admin/settings/route.ts`

- [ ] **Step 1: Adicionar schema de validação para `design_system`**

No arquivo `app/api/admin/settings/route.ts`, adicionar ao `putSchema`:

```typescript
  design_system: z
    .object({
      font_sans: z.string().max(200).optional(),
      font_serif: z.string().max(200).optional(),
      font_mono: z.string().max(200).optional(),
      font_size_base: z.string().max(20).optional(),
      font_size_sm: z.string().max(20).optional(),
      font_size_lg: z.string().max(20).optional(),
      font_size_xl: z.string().max(20).optional(),
      font_size_2xl: z.string().max(20).optional(),
      font_size_3xl: z.string().max(20).optional(),
      line_height_base: z.string().max(20).optional(),
      font_weight_normal: z.string().max(10).optional(),
      font_weight_medium: z.string().max(10).optional(),
      font_weight_bold: z.string().max(10).optional(),
      spacing_base: z.string().max(20).optional(),
      radius_sm: z.string().max(20).optional(),
      radius_md: z.string().max(20).optional(),
      radius_lg: z.string().max(20).optional(),
      radius_full: z.string().max(20).optional(),
      color_text_primary: hexColor.optional(),
      color_text_secondary: hexColor.optional(),
      color_border: hexColor.optional(),
      color_error: hexColor.optional(),
      color_success: hexColor.optional(),
      color_warning: hexColor.optional(),
    })
    .optional(),
```

- [ ] **Step 2: Persistir `design_system` no handler PUT**

Dentro do handler `PUT`, após o bloco `if (newsletter !== undefined)`, adicionar:

```typescript
    if (parsed.data.design_system !== undefined) {
      const current = await getSettings()
      const merged = { ...current.design_system, ...parsed.data.design_system }
      await upsertSetting('design_system', JSON.stringify(merged))
    }
```

Também atualizar a desestruturação no topo do handler:

```typescript
const { template, colors, company, ai, newsletter, telegram, design_system } = parsed.data
```

E adicionar a referência a `design_system` no `if` acima para usar `parsed.data.design_system`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/settings/route.ts
git commit -m "feat: accept design_system field in settings PUT endpoint"
```

---

## Task 4: Criar endpoint `/api/admin/design-system/extract`

Este endpoint recebe uma URL, faz fetch do HTML/CSS do site, extrai CSS custom properties e valores de font-family, colors, border-radius, e font-size. **Não executa JS** — apenas parse de texto CSS.

**Files:**
- Create: `app/api/admin/design-system/extract/route.ts`

- [ ] **Step 1: Instalar dependência `css-tree`**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/Blog/mma-blog
npm install css-tree
npm install --save-dev @types/css-tree
```

Verificar que `package.json` foi atualizado.

- [ ] **Step 2: Criar o arquivo `app/api/admin/design-system/extract/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import * as csstree from 'css-tree'

export const dynamic = 'force-dynamic'

const ALLOWED_DOMAINS_TIMEOUT_MS = 10_000

interface ExtractedTokens {
  custom_properties: Record<string, string>
  font_families: string[]
  colors: string[]
  border_radii: string[]
  font_sizes: string[]
  source_url: string
}

function extractCSSTokens(cssText: string): Omit<ExtractedTokens, 'source_url'> {
  const custom_properties: Record<string, string> = {}
  const font_families = new Set<string>()
  const colors = new Set<string>()
  const border_radii = new Set<string>()
  const font_sizes = new Set<string>()

  let ast: csstree.CssNode
  try {
    ast = csstree.parse(cssText, { parseValue: true, onParseError: () => {} })
  } catch {
    return {
      custom_properties,
      font_families: [],
      colors: [],
      border_radii: [],
      font_sizes: [],
    }
  }

  csstree.walk(ast, (node) => {
    if (node.type === 'Declaration') {
      const prop = node.property
      const value = csstree.generate(node.value)

      // Capture all CSS custom properties
      if (prop.startsWith('--')) {
        custom_properties[prop] = value
        return
      }

      // font-family
      if (prop === 'font-family') {
        font_families.add(value.trim())
      }

      // colors: color, background-color, border-color, fill
      if (['color', 'background-color', 'background', 'border-color', 'fill'].includes(prop)) {
        const hex = value.match(/#[0-9A-Fa-f]{3,8}\b/g)
        hex?.forEach((h) => {
          if (h.length === 4 || h.length === 7) colors.add(h.toUpperCase())
        })
      }

      // border-radius
      if (prop === 'border-radius') {
        border_radii.add(value.trim())
      }

      // font-size
      if (prop === 'font-size') {
        const v = value.trim()
        if (/^\d+(\.\d+)?(px|rem|em)$/.test(v)) font_sizes.add(v)
      }
    }
  })

  return {
    custom_properties,
    font_families: [...font_families].slice(0, 20),
    colors: [...colors].slice(0, 50),
    border_radii: [...border_radii].slice(0, 20),
    font_sizes: [...font_sizes].slice(0, 20),
  }
}

async function fetchCSSFromPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ALLOWED_DOMAINS_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogDesignExtractor/1.0)' },
    })
    const html = await res.text()

    // Extract inline <style> blocks
    const inlineStyles: string[] = []
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let m: RegExpExecArray | null
    while ((m = styleRegex.exec(html)) !== null) {
      inlineStyles.push(m[1])
    }

    // Extract <link rel="stylesheet" href="..."> URLs
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
    const cssUrls: string[] = []
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      if (href.startsWith('http')) {
        cssUrls.push(href)
      } else if (href.startsWith('//')) {
        cssUrls.push(`https:${href}`)
      } else {
        const base = new URL(url)
        cssUrls.push(new URL(href, base).toString())
      }
    }

    // Fetch up to 5 external stylesheets
    const externalCSS = await Promise.allSettled(
      cssUrls.slice(0, 5).map(async (cssUrl) => {
        const r = await fetch(cssUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogDesignExtractor/1.0)' },
        })
        return r.text()
      })
    )

    const allCSS = [
      ...inlineStyles,
      ...externalCSS
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value),
    ].join('\n')

    return allCSS
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawUrl = body?.url

    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'Campo "url" é obrigatório' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Apenas URLs http/https são permitidas' }, { status: 400 })
    }

    const cssText = await fetchCSSFromPage(parsedUrl.toString())

    if (!cssText.trim()) {
      return NextResponse.json({ error: 'Nenhum CSS encontrado na URL fornecida' }, { status: 422 })
    }

    const tokens = extractCSSTokens(cssText)

    return NextResponse.json({ ...tokens, source_url: parsedUrl.toString() } satisfies ExtractedTokens)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ error: 'Timeout ao acessar a URL (limite: 10s)' }, { status: 504 })
    }
    console.error('[design-system extract]', msg)
    return NextResponse.json({ error: 'Erro ao extrair design system' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verificar que o build não quebra**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/Blog/mma-blog
npm run build 2>&1 | tail -30
```

Esperado: sem erros de tipo relacionados ao novo arquivo.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/design-system/extract/route.ts package.json package-lock.json
git commit -m "feat: add /api/admin/design-system/extract endpoint for CSS scraping"
```

---

## Task 5: Criar componente `DesignSystemImporter`

**Files:**
- Create: `app/admin/aparencia/DesignSystemImporter.tsx`

- [ ] **Step 1: Criar `app/admin/aparencia/DesignSystemImporter.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { DesignSystem } from '@/lib/settings'

interface ExtractedTokens {
  custom_properties: Record<string, string>
  font_families: string[]
  colors: string[]
  border_radii: string[]
  font_sizes: string[]
  source_url: string
}

// Maps extracted CSS custom property names to DesignSystem keys
function mapCustomPropertiesToDS(props: Record<string, string>): Partial<DesignSystem> {
  const mapped: Partial<DesignSystem> = {}

  const tryMap = (prop: string, key: keyof DesignSystem) => {
    if (props[prop]) (mapped as Record<string, string>)[key] = props[prop]
  }

  // Common naming patterns for design system vars
  tryMap('--font-family-base', 'font_sans')
  tryMap('--font-family-sans', 'font_sans')
  tryMap('--font-family-heading', 'font_serif')
  tryMap('--font-family-mono', 'font_mono')
  tryMap('--font-size-base', 'font_size_base')
  tryMap('--font-size-sm', 'font_size_sm')
  tryMap('--font-size-lg', 'font_size_lg')
  tryMap('--font-size-xl', 'font_size_xl')
  tryMap('--font-size-2xl', 'font_size_2xl')
  tryMap('--font-size-3xl', 'font_size_3xl')
  tryMap('--line-height-base', 'line_height_base')
  tryMap('--font-weight-normal', 'font_weight_normal')
  tryMap('--font-weight-medium', 'font_weight_medium')
  tryMap('--font-weight-bold', 'font_weight_bold')
  tryMap('--spacing-base', 'spacing_base')
  tryMap('--radius-sm', 'radius_sm')
  tryMap('--radius-md', 'radius_md')
  tryMap('--radius-lg', 'radius_lg')
  tryMap('--radius-full', 'radius_full')
  tryMap('--color-text-primary', 'color_text_primary')
  tryMap('--color-text-secondary', 'color_text_secondary')
  tryMap('--color-border', 'color_border')
  tryMap('--color-error', 'color_error')
  tryMap('--color-success', 'color_success')
  tryMap('--color-warning', 'color_warning')
  // aliases
  tryMap('--text-primary', 'color_text_primary')
  tryMap('--text-secondary', 'color_text_secondary')
  tryMap('--color-danger', 'color_error')

  return mapped
}

interface Props {
  onApply: (tokens: Partial<DesignSystem>) => void
}

export function DesignSystemImporter({ onApply }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedTokens | null>(null)
  const [mapped, setMapped] = useState<Partial<DesignSystem> | null>(null)

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setExtracted(null)
    setMapped(null)
    try {
      const res = await fetch('/api/admin/design-system/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setExtracted(data as ExtractedTokens)
      setMapped(mapCustomPropertiesToDS(data.custom_properties))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao extrair')
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (mapped) onApply(mapped)
  }

  const mappedCount = mapped ? Object.keys(mapped).length : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">Importar do site da empresa</h3>
      <p className="text-xs text-gray-500 mb-4">
        Cole a URL do site da sua empresa. O sistema vai ler o CSS, extrair as cores, fontes e tokens
        e pré-preencher as configurações abaixo para você confirmar.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://suaempresa.com.br"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          onKeyDown={(e) => e.key === 'Enter' && !loading && url && handleExtract()}
        />
        <button
          onClick={handleExtract}
          disabled={loading || !url}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
        >
          {loading ? 'Lendo CSS...' : 'Extrair Design'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {extracted && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700">Tokens encontrados em {extracted.source_url}</p>

            {extracted.font_families.length > 0 && (
              <div>
                <span className="font-medium">Fontes: </span>
                <span>{extracted.font_families.slice(0, 5).join(', ')}</span>
              </div>
            )}

            {extracted.colors.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium">Cores: </span>
                {extracted.colors.slice(0, 12).map((c) => (
                  <span
                    key={c}
                    className="inline-block w-5 h-5 rounded border border-gray-200"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            )}

            {extracted.border_radii.length > 0 && (
              <div>
                <span className="font-medium">Border radius: </span>
                <span>{extracted.border_radii.slice(0, 5).join(', ')}</span>
              </div>
            )}

            {Object.keys(extracted.custom_properties).length > 0 && (
              <div>
                <span className="font-medium">CSS vars encontradas: </span>
                <span>{Object.keys(extracted.custom_properties).length}</span>
              </div>
            )}
          </div>

          {mappedCount > 0 ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs">
                <p className="font-semibold text-blue-800 mb-2">
                  {mappedCount} token{mappedCount > 1 ? 's' : ''} mapeado{mappedCount > 1 ? 's' : ''} automaticamente
                </p>
                <ul className="space-y-1 text-blue-700">
                  {Object.entries(mapped!).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-mono">{k}</span>: <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleApply}
                className="w-full bg-brand-secondary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Aplicar tokens ao design system
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Nenhum token de design system padrão encontrado. O site pode usar nomes de variáveis
              personalizados. Configure os tokens manualmente abaixo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/aparencia/DesignSystemImporter.tsx
git commit -m "feat: add DesignSystemImporter component for CSS extraction and mapping"
```

---

## Task 6: Expandir `ApparenceClient.tsx` com seções de design system

**Files:**
- Modify: `app/admin/aparencia/ApparenceClient.tsx`

- [ ] **Step 1: Atualizar imports e Props em `ApparenceClient.tsx`**

No topo do arquivo, atualizar o import de `settings`:

```typescript
import type { SiteSettings, ThemeColors, DesignSystem } from '@/lib/settings'
import { DEFAULT_DESIGN_SYSTEM } from '@/lib/settings'
import { DesignSystemImporter } from './DesignSystemImporter'
```

Atualizar a interface `Props`:

```typescript
interface Props {
  initial: SiteSettings
}
```

- [ ] **Step 2: Adicionar estado `designSystem` e handlers**

Dentro de `export function ApparenceClient({ initial }: Props)`, após os estados existentes, adicionar:

```typescript
const [designSystem, setDesignSystem] = useState<DesignSystem>(initial.design_system)

function handleDSChange(key: keyof DesignSystem, value: string) {
  setDesignSystem((prev) => ({ ...prev, [key]: value }))
}

function handleDSReset(key: keyof DesignSystem) {
  setDesignSystem((prev) => ({ ...prev, [key]: DEFAULT_DESIGN_SYSTEM[key] }))
}

function handleImportApply(tokens: Partial<DesignSystem>) {
  setDesignSystem((prev) => ({ ...prev, ...tokens }))
}
```

- [ ] **Step 3: Atualizar `handleSave` para incluir `design_system`**

Dentro do `body` do `fetch` em `handleSave`, adicionar `design_system: designSystem`:

```typescript
body: JSON.stringify({ template, colors, company: { logo_url: logoUrl }, design_system: designSystem }),
```

- [ ] **Step 4: Adicionar seção "Importar do Site" antes das cores**

Logo antes de `{/* Color customizer */}`, adicionar:

```tsx
{/* Design System Importer */}
<section className="mb-8">
  <h2 className="text-lg font-semibold text-neutral-900 mb-2">Importar design do site</h2>
  <DesignSystemImporter onApply={handleImportApply} />
</section>
```

- [ ] **Step 5: Adicionar seção "Tipografia" após a seção de cores**

Após o fechamento da seção `{/* Color customizer */}`, adicionar:

```tsx
{/* Typography */}
<section className="mt-8">
  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tipografia</h2>
  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
    {([
      { key: 'font_sans' as const, label: 'Fonte principal (sans-serif)', placeholder: 'Inter, system-ui, sans-serif' },
      { key: 'font_serif' as const, label: 'Fonte de títulos (serif)', placeholder: '"Source Serif 4", Georgia, serif' },
      { key: 'font_mono' as const, label: 'Fonte de código (mono)', placeholder: '"JetBrains Mono", monospace' },
    ]).map(({ key, label, placeholder }) => (
      <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{designSystem[key]}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={designSystem[key]}
            onChange={(e) => handleDSChange(key, e.target.value)}
            placeholder={placeholder}
            className="w-64 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
            Padrão
          </button>
        </div>
      </div>
    ))}
  </div>
</section>

{/* Font sizes */}
<section className="mt-8">
  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tamanhos de fonte</h2>
  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
    {([
      { key: 'font_size_sm' as const, label: 'Pequeno (sm)' },
      { key: 'font_size_base' as const, label: 'Base' },
      { key: 'font_size_lg' as const, label: 'Grande (lg)' },
      { key: 'font_size_xl' as const, label: 'Extra grande (xl)' },
      { key: 'font_size_2xl' as const, label: '2XL' },
      { key: 'font_size_3xl' as const, label: '3XL (títulos)' },
    ]).map(({ key, label }) => (
      <div key={key} className="flex items-center justify-between px-5 py-3 gap-4">
        <p className="text-sm font-medium text-neutral-900 w-48">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={designSystem[key]}
            onChange={(e) => handleDSChange(key, e.target.value)}
            className="w-28 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
            Padrão
          </button>
        </div>
      </div>
    ))}
  </div>
</section>

{/* Border radius */}
<section className="mt-8">
  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Arredondamento (border-radius)</h2>
  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
    {([
      { key: 'radius_sm' as const, label: 'Pequeno (sm)' },
      { key: 'radius_md' as const, label: 'Médio (md)' },
      { key: 'radius_lg' as const, label: 'Grande (lg)' },
      { key: 'radius_full' as const, label: 'Circular (full)' },
    ]).map(({ key, label }) => (
      <div key={key} className="flex items-center justify-between px-5 py-3 gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 border-2 border-brand-primary shrink-0"
            style={{ borderRadius: designSystem[key] }}
          />
          <p className="text-sm font-medium text-neutral-900">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={designSystem[key]}
            onChange={(e) => handleDSChange(key, e.target.value)}
            className="w-28 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
            Padrão
          </button>
        </div>
      </div>
    ))}
  </div>
</section>

{/* Extended colors */}
<section className="mt-8 mb-8">
  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Cores semânticas</h2>
  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
    {([
      { key: 'color_text_primary' as const, label: 'Texto principal' },
      { key: 'color_text_secondary' as const, label: 'Texto secundário' },
      { key: 'color_border' as const, label: 'Borda padrão' },
      { key: 'color_error' as const, label: 'Erro' },
      { key: 'color_success' as const, label: 'Sucesso' },
      { key: 'color_warning' as const, label: 'Alerta' },
    ]).map(({ key, label }) => (
      <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{designSystem[key]}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={designSystem[key]}
            onChange={(e) => handleDSChange(key, e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-gray-200"
          />
          <input
            type="text"
            value={designSystem[key]}
            onChange={(e) => {
              const v = e.target.value
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleDSChange(key, v)
            }}
            className="w-24 text-sm font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={() => handleDSReset(key)} className="text-xs text-gray-400 hover:text-brand-primary transition-colors">
            Padrão
          </button>
        </div>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/aparencia/ApparenceClient.tsx
git commit -m "feat: expand ApparenceClient with typography, border radius, semantic colors, and importer"
```

---

## Task 7: Atualizar `aparencia/page.tsx` para passar `design_system`

**Files:**
- Modify: `app/admin/aparencia/page.tsx`

- [ ] **Step 1: Ler o arquivo atual**

```bash
cat /Users/thuliobittencourt/Documents/Projetos/Blog/mma-blog/app/admin/aparencia/page.tsx
```

- [ ] **Step 2: Verificar que `initial` passado ao client já usa `SiteSettings` inteiro**

O `page.tsx` provavelmente passa `initial={settings}` onde `settings = await getSettings()`. Como `getSettings` agora retorna `design_system`, nenhuma mudança é necessária — o campo já estará disponível. Se o `page.tsx` fizer spread parcial ou selecionar campos manualmente, atualizar para incluir `design_system`.

Exemplo (caso precise atualizar):

```typescript
import { getSettings } from '@/lib/settings'
import { ApparenceClient } from './ApparenceClient'

export default async function AparenciaPage() {
  const settings = await getSettings()
  return <ApparenceClient initial={settings} />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/aparencia/page.tsx
git commit -m "feat: pass full settings including design_system to ApparenceClient"
```

---

## Task 8: Verificar build, testar e fazer push

**Files:**
- No files created/modified

- [ ] **Step 1: Build completo**

```bash
cd /Users/thuliobittencourt/Documents/Projetos/Blog/mma-blog
npm run build 2>&1 | tail -40
```

Esperado: sem erros de tipo. Warnings de lint são aceitáveis.

- [ ] **Step 2: Verificar que `npm run lint` não tem erros bloqueantes**

```bash
npm run lint 2>&1 | tail -20
```

- [ ] **Step 3: Push para GitHub (Vercel faz deploy automático)**

```bash
git push origin master
```

- [ ] **Step 4: Verificar no admin**

Abrir `http://localhost:3000/admin/aparencia` e confirmar:
- Seção "Importar design do site" aparece com campo de URL
- Seções "Tipografia", "Tamanhos de fonte", "Arredondamento" e "Cores semânticas" aparecem
- Botão "Salvar alterações" persiste todos os tokens
- Trocar de template não reseta o design system

---

## Notas de implementação

- **Segurança do extractor:** O endpoint faz fetch server-side de URLs arbitrárias. SSRF é mitigado por: (a) protocolo restrito a `http`/`https`; (b) timeout de 10s; (c) apenas parse de texto CSS, sem execução de código. Se necessário no futuro, adicionar blocklist de IPs privados.
- **`css-tree` vs regex:** `css-tree` produz AST correto para CSS complexo. Regex é usado apenas para extração de cores hex dentro de valores já isolados pelo AST.
- **Mapeamento de tokens:** O mapper de `DesignSystemImporter` cobre padrões comuns (`--color-primary`, `--font-family-base`, etc.). Sites com nomes custom não serão mapeados automaticamente — o usuário pode configurar manualmente.
- **Template x Design System:** Template é armazenado em `active_template`, design system em `design_system`. O `RootLayout` lê ambos de forma independente. Trocar template via `handleTemplateChange` **não** toca o `designSystem` state.
