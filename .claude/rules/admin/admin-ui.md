---
description: Padrões específicos para app/admin/ — complementa o system prompt do agent admin-ui
globs:
  - "app/admin/**"
  - "components/**"
---

# Admin UI — Regras de Domínio

## Separação obrigatória shell / client
- `page.tsx` é Server Component puro: sem `async/await`, sem Drizzle, sem `'use client'` — apenas renderiza `<XyzClient />`
- Toda lógica, estado e fetch ficam em `*Client.tsx` que começa com `'use client'`
- Se a página precisar de dados iniciais (SSR), passe-os como props do shell para o Client — não faça fetch no Client no primeiro render se puder evitar

## Padrão de toast (único mecanismo de feedback)
```ts
// Sempre este shape — nunca alert(), confirm() ou prompt()
const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
```
- Toast desaparece após 3000ms — nunca omita o `setTimeout`
- Mensagem de sucesso e de erro obrigatórias em toda mutação (POST/PUT/DELETE)

## Sidebar
- Links de navegação vivem no array `navItems` em `app/admin/layout.tsx`
- Toda nova seção admin precisa de entrada no `navItems` — nunca crie página sem nav

## TipTap
- O editor de rich text é `components/blog/TiptapEditor.tsx` — nunca reimplemente editor inline
- Output do editor é HTML — não é Markdown nem JSON — e deve ser tratado como tal antes de enviar para a API

## Estado de carregamento
- Todo fetch inicial precisa de estado `loading: true` com skeleton ou spinner visível
- Nunca deixe a área de conteúdo em branco enquanto carrega — use `animate-pulse` nos skeletons
