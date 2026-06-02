/**
 * agent-hooks.ts — ExpxBlog OpenCode Plugin
 *
 * Replica os mesmos controles de escopo dos hooks Claude Code (.claude/hooks/)
 * para o OpenCode. Verifica o nome do agent ativo em cada hook e aplica
 * as regras de bloqueio correspondentes.
 *
 * Agents e seus escopos:
 *   reviewer       → somente leitura (bloqueia Write/Edit/Bash destrutivo)
 *   admin-ui       → app/admin/, components/ — bloqueia drizzle, lib/agents, crons
 *   ai-pipeline    → lib/agents/, lib/ai.ts — bloqueia UI, DB, providers diretos
 *   api-builder    → app/api/ — bloqueia UI, schema, lib/agents
 *   cron-automator → app/api/cron/, lib/automation* — bloqueia UI, schema, vercel.json crons
 *   db-engineer    → drizzle/, lib/db-queries.ts — bloqueia UI, API, lib/agents
 *   public-frontend→ app/(public)/, components/blog/ — bloqueia admin, API direto, agents
 */

// ─── Tipos compatíveis com OpenCode hook API ────────────────────────────────

interface ToolCallContext {
  agentName?: string
  toolName: string
  toolInput?: Record<string, unknown>
}

interface HookResult {
  block: boolean
  reason?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTarget(ctx: ToolCallContext): string {
  const input = ctx.toolInput ?? {}
  return (
    (input.file_path as string) ??
    (input.path as string) ??
    (input.command as string) ??
    ""
  )
}

function isWriteTool(tool: string): boolean {
  return ["Write", "Edit", "MultiEdit"].includes(tool)
}

function isBashTool(tool: string): boolean {
  return tool === "Bash"
}

function matchesPattern(target: string, pattern: RegExp): boolean {
  return pattern.test(target)
}

// ─── Regras por agent ────────────────────────────────────────────────────────

const DESTRUCTIVE_BASH = /(git (push|commit|reset --hard)|vercel deploy)/

const SCOPES: Record<
  string,
  {
    forbidden: RegExp
    forbiddenMsg: string
    suggestion: string
    extraChecks?: (ctx: ToolCallContext, target: string) => HookResult | null
  }
> = {
  "admin-ui": {
    forbidden: /lib\/agents\/|lib\/agent-pipeline|drizzle\/schema|drizzle\/db|app\/api\/cron|app\/\(public\)\//,
    forbiddenMsg: "O agent admin-ui só escreve em app/admin/ e components/.",
    suggestion: "lib/agents/ → ai-pipeline | drizzle/ → db-engineer | app/api/ → api-builder",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName) && DESTRUCTIVE_BASH.test(target)) {
        return {
          block: true,
          reason: "[admin-ui] Deploy, commit ou migration de banco são fora do escopo.",
        }
      }
      return null
    },
  },

  "ai-pipeline": {
    forbidden: /app\/admin\/|app\/\(public\)\/|app\/api\/cron|drizzle\/schema|drizzle\/db\.ts/,
    forbiddenMsg: "O agent ai-pipeline só escreve em lib/agents/, lib/agent-pipeline.ts, lib/ai.ts.",
    suggestion: "UI admin → admin-ui | Rotas API → api-builder | DB → db-engineer",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName) && DESTRUCTIVE_BASH.test(target)) {
        return { block: true, reason: "[ai-pipeline] Deploy ou commit fora do escopo." }
      }
      // Bloqueia imports diretos de providers no input (detecção estática básica)
      if (isWriteTool(ctx.toolName)) {
        const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
        if (/from ['"]openai['"]|from ['"]@anthropic-ai\/sdk['"]/.test(content)) {
          return {
            block: true,
            reason:
              "[ai-pipeline] Import direto de SDK de provider detectado. Use aiChat() via lib/ai.ts.",
          }
        }
      }
      return null
    },
  },

  "api-builder": {
    forbidden: /app\/admin\/[^/]*Client\.tsx|app\/\(public\)\/|lib\/agents\/|lib\/agent-pipeline|drizzle\/schema\.ts/,
    forbiddenMsg: "O agent api-builder só escreve em app/api/ e lib/ (sem agents ou schema).",
    suggestion: "Páginas admin → admin-ui | Pipeline IA → ai-pipeline | Schema DB → db-engineer",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName) && DESTRUCTIVE_BASH.test(target)) {
        return { block: true, reason: "[api-builder] Deploy ou commit fora do escopo." }
      }
      return null
    },
  },

  "cron-automator": {
    forbidden: /app\/admin\/|app\/\(public\)\/|lib\/agents\/|drizzle\/schema\.ts|components\//,
    forbiddenMsg:
      "O agent cron-automator só escreve em app/api/cron/, lib/automation*.ts, lib/source-crawlers/.",
    suggestion: "UI → admin-ui | Pipeline IA → ai-pipeline | Schema DB → db-engineer",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName) && DESTRUCTIVE_BASH.test(target)) {
        return { block: true, reason: "[cron-automator] Deploy ou commit fora do escopo." }
      }
      // Bloqueia adição de chave 'crons' ao vercel.json
      if (isWriteTool(ctx.toolName) && /vercel\.json/.test(target)) {
        const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
        if (/"crons"/.test(content)) {
          return {
            block: true,
            reason:
              '[cron-automator] vercel.json com chave "crons" é proibido. Use pg_cron no Supabase.',
          }
        }
      }
      return null
    },
  },

  "db-engineer": {
    forbidden: /app\/admin\/|app\/\(public\)\/|app\/api\/|lib\/agents\/|lib\/agent-pipeline|lib\/ai\.ts|components\//,
    forbiddenMsg: "O agent db-engineer só escreve em drizzle/ e lib/db-queries.ts.",
    suggestion: "UI admin → admin-ui | Rotas API → api-builder | Pipeline IA → ai-pipeline",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName)) {
        if (DESTRUCTIVE_BASH.test(target)) {
          return { block: true, reason: "[db-engineer] Deploy ou commit fora do escopo." }
        }
        if (/(DROP TABLE|DROP DATABASE|DELETE FROM .* WHERE 1|TRUNCATE)/.test(target)) {
          return {
            block: true,
            reason:
              "[db-engineer] Comando SQL destrutivo bloqueado. Requer confirmação explícita do usuário.",
          }
        }
      }
      // prepare: true proibido em db.ts
      if (isWriteTool(ctx.toolName) && /drizzle\/db\.ts/.test(target)) {
        const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
        if (/prepare:\s*true/.test(content)) {
          return {
            block: true,
            reason: "[db-engineer] 'prepare: true' quebra o Supabase pooler. Use prepare: false.",
          }
        }
      }
      return null
    },
  },

  "public-frontend": {
    forbidden: /app\/admin\/|app\/api\/|lib\/agents\/|lib\/agent-pipeline|drizzle\/schema\.ts/,
    forbiddenMsg: "O agent public-frontend só escreve em app/(public)/, app/feed.xml/, components/blog/.",
    suggestion: "Admin UI → admin-ui | Rotas API → api-builder | DB → db-engineer",
    extraChecks(ctx, target) {
      if (isBashTool(ctx.toolName) && DESTRUCTIVE_BASH.test(target)) {
        return { block: true, reason: "[public-frontend] Deploy ou banco fora do escopo." }
      }
      // 'use client' em pages do (public) é proibido
      if (isWriteTool(ctx.toolName) && /app\/\(public\)\/.*page\.(tsx?|jsx?)$/.test(target)) {
        const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
        if (/'use client'/.test(content)) {
          return {
            block: true,
            reason:
              "[public-frontend] 'use client' em page.tsx público. Extraia para um componente separado em components/blog/.",
          }
        }
      }
      return null
    },
  },
}

// ─── Hook: PreToolUse (bloqueia fora do escopo) ──────────────────────────────

export function preToolUse(ctx: ToolCallContext): HookResult {
  const agent = ctx.agentName ?? ""
  const target = getTarget(ctx)

  // ── reviewer: somente leitura ──────────────────────────────────────────────
  if (agent === "reviewer") {
    if (isWriteTool(ctx.toolName)) {
      return {
        block: true,
        reason:
          "BLOQUEADO [reviewer]: Este agent é somente leitura e não pode modificar arquivos. Use Read ou Bash (apenas build/lint).",
      }
    }
    if (isBashTool(ctx.toolName)) {
      const cmd = target
      if (
        /(git (add|commit|push|reset|checkout|merge|rebase|branch -[dD])|rm -|mv |npm install|npm run dev)/.test(
          cmd
        )
      ) {
        return {
          block: true,
          reason:
            "BLOQUEADO [reviewer]: Comando destrutivo ou de modificação de repositório bloqueado. Permitidos: npm run build, npm run lint, git diff/log/status.",
        }
      }
    }
    return { block: false }
  }

  // ── agents de implementação ─────────────────────────────────────────────────
  const scope = SCOPES[agent]
  if (!scope) return { block: false }

  // Verifica escopo de arquivo
  if ((isWriteTool(ctx.toolName) || isBashTool(ctx.toolName)) && matchesPattern(target, scope.forbidden)) {
    return {
      block: true,
      reason: `BLOQUEADO [${agent}]: Arquivo/caminho fora do escopo — ${target}\n${scope.forbiddenMsg}\n${scope.suggestion}`,
    }
  }

  // Verificações extras do agent
  if (scope.extraChecks) {
    const extra = scope.extraChecks(ctx, target)
    if (extra) return extra
  }

  return { block: false }
}

// ─── Hook: PostToolUse (verificações pós-edição) ─────────────────────────────

export function postToolUse(ctx: ToolCallContext): HookResult {
  const agent = ctx.agentName ?? ""
  const target = getTarget(ctx)

  if (!isWriteTool(ctx.toolName)) return { block: false }

  // ai-pipeline: sem imports de providers diretos
  if (agent === "ai-pipeline") {
    const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
    if (/from ['"]openai['"]|from ['"]@anthropic-ai\/sdk['"]|from ['"]groq-sdk['"]/.test(content)) {
      return {
        block: true,
        reason:
          "[ai-pipeline] Import direto de SDK de provider no arquivo salvo. Substitua por aiChat() via lib/ai.ts.",
      }
    }
    if (/fetch\(['"]https:\/\/(api\.openai\.com|api\.anthropic\.com)/.test(content)) {
      return {
        block: true,
        reason: "[ai-pipeline] fetch() direto para provider de IA. Use callOpenRouter() via lib/ai.ts.",
      }
    }
  }

  // cron-automator: rotas de cron devem ser POST + ter maxDuration + auth
  if (agent === "cron-automator" && /app\/api\/cron\/.*route\.ts$/.test(target)) {
    const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
    if (!/export async function POST/.test(content)) {
      return {
        block: true,
        reason: `[cron-automator] ${target} não tem handler POST. Cron endpoints devem usar POST.`,
      }
    }
    if (!/maxDuration/.test(content)) {
      return {
        block: true,
        reason: `[cron-automator] ${target} sem 'export const maxDuration = 800'.`,
      }
    }
    if (!/SUPABASE_SERVICE_ROLE_KEY|authorization|Bearer/.test(content)) {
      return {
        block: true,
        reason: `[cron-automator] ${target} sem verificação de Bearer token (SUPABASE_SERVICE_ROLE_KEY).`,
      }
    }
  }

  // db-engineer: prepare: true proibido
  if (agent === "db-engineer" && /drizzle\/db\.ts$/.test(target)) {
    const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
    if (/prepare:\s*true/.test(content)) {
      return {
        block: true,
        reason: "[db-engineer] 'prepare: true' detectado em drizzle/db.ts. Use prepare: false.",
      }
    }
  }

  // admin-ui: 'use client' em page.tsx proibido
  if (agent === "admin-ui" && /app\/admin\/.*\/page\.tsx$/.test(target)) {
    const content = (ctx.toolInput?.content ?? ctx.toolInput?.new_string ?? "") as string
    if (/'use client'/.test(content)) {
      return {
        block: true,
        reason:
          "[admin-ui] 'use client' em page.tsx. O shell deve ser Server Component — mova para *Client.tsx.",
      }
    }
  }

  return { block: false }
}
