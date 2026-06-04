// lib/db-migrations.ts
import { db } from '@/drizzle/db'
import { sql } from 'drizzle-orm'
import { EMBEDDED_MIGRATIONS, MIGRATION_ORDER } from './migrations-embedded'

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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id serial PRIMARY KEY,
      migration_name text NOT NULL UNIQUE,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `)
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

  await db.transaction(async (tx) => {
    for (const statement of statements) {
      await tx.execute(sql.raw(statement))
    }
    await tx.execute(
      sql`INSERT INTO drizzle_migrations (migration_name) VALUES (${tag})
          ON CONFLICT (migration_name) DO NOTHING`
    )
  })
}
