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
    // Qualquer erro aqui significa que drizzle_migrations não existe ainda (banco em branco)
    return []
  }
}

export async function getDbPendingMigrations(): Promise<string[]> {
  const applied = await getAppliedMigrations()
  return MIGRATION_ORDER.filter((tag) => !applied.includes(tag))
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
