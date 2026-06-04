// lib/db-migrations.ts
import postgres from 'postgres'
import { db } from '@/drizzle/db'
import { sql } from 'drizzle-orm'
import { EMBEDDED_MIGRATIONS, MIGRATION_ORDER } from './migrations-embedded'

/**
 * Converte a URL do pooler do Supabase para a URL de conexão direta.
 * Pooler session: postgres.PROJECT:SENHA@aws-0-REGION.pooler.supabase.com:5432
 * Direta:         postgres:SENHA@db.PROJECT.supabase.co:5432
 *
 * Se não for URL do pooler Supabase, retorna a própria URL (pode já ser direta).
 */
function toDirectUrl(poolerUrl: string): string {
  try {
    const u = new URL(poolerUrl)
    const username = u.username // ex: postgres.xnfcfiyijamnjyidpxja
    const host = u.hostname     // ex: aws-0-sa-east-1.pooler.supabase.com

    if (host.includes('.pooler.supabase.com') && username.startsWith('postgres.')) {
      const projectId = username.slice('postgres.'.length)
      const directUrl = new URL(poolerUrl)
      directUrl.username = 'postgres'
      directUrl.hostname = `db.${projectId}.supabase.co`
      directUrl.port = '5432'
      return directUrl.toString()
    }
  } catch {
    // URL inválida — usa a original
  }
  return poolerUrl
}

function getDirectClient(): ReturnType<typeof postgres> {
  const poolerUrl = process.env.DATABASE_URL!
  const directUrl = toDirectUrl(poolerUrl)
  return postgres(directUrl, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 15,
  })
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await db.execute(
      sql`SELECT migration_name FROM drizzle_migrations ORDER BY created_at ASC`
    )
    return (rows as unknown as { migration_name: string }[]).map((r) => r.migration_name)
  } catch {
    return []
  }
}

async function siteSettingsExists(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1 FROM site_settings LIMIT 1`)
    return true
  } catch {
    return false
  }
}

export async function getDbPendingMigrations(): Promise<string[]> {
  const applied = await getAppliedMigrations()
  const pending = MIGRATION_ORDER.filter((tag) => !applied.includes(tag))

  // Se drizzle_migrations não existe mas site_settings existe, o banco foi configurado
  // pelo setup (não pelo migrator). Não há migrations a aplicar.
  if (pending.length === MIGRATION_ORDER.length && applied.length === 0) {
    const hasSchema = await siteSettingsExists()
    if (hasSchema) return []
  }

  return pending
}

export async function ensureMigrationsTable(): Promise<void> {
  const client = getDirectClient()
  try {
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id serial PRIMARY KEY,
        migration_name text NOT NULL UNIQUE,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `)
  } finally {
    await client.end()
  }
}

export async function applyMigration(tag: string): Promise<void> {
  const raw = EMBEDDED_MIGRATIONS[tag]
  if (!raw) {
    throw new Error(`Migration não encontrada no bundle: ${tag}`)
  }

  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  const client = getDirectClient()
  try {
    await client.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement)
      }
      await tx`
        INSERT INTO drizzle_migrations (migration_name)
        VALUES (${tag})
        ON CONFLICT (migration_name) DO NOTHING
      `
    })
  } finally {
    await client.end()
  }
}
