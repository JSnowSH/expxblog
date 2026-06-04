/**
 * lib/db-connection.ts
 *
 * Resolução dinâmica da DATABASE_URL.
 * A URL em site_settings (chave "database_url") tem prioridade sobre a variável de ambiente.
 * O bootstrap usa sempre a env var para conseguir ler site_settings.
 */

import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/drizzle/schema'

declare global {
  // eslint-disable-next-line no-var
  var __dbUrl: string | undefined
  // eslint-disable-next-line no-var
  var __pgClient: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var __drizzleDb: PostgresJsDatabase<typeof schema> | undefined
}

function makeClient(url: string): ReturnType<typeof postgres> {
  return postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: 5,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 10,
  })
}

/**
 * Cria/retorna a instância de DB usando a URL fornecida.
 * Invalida o cache global se a URL mudar.
 */
export function buildDb(url: string): PostgresJsDatabase<typeof schema> {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev && global.__drizzleDb && global.__dbUrl === url) {
    return global.__drizzleDb
  }

  // URL mudou ou ainda não existe — cria nova conexão
  const client = makeClient(url)
  const db = drizzle(client, { schema })

  if (isDev) {
    global.__dbUrl = url
    global.__pgClient = client
    global.__drizzleDb = db
  }

  return db
}

/**
 * Resolve a DATABASE_URL dinâmica:
 * 1. Usa a env var para bootstrapar uma conexão mínima
 * 2. Lê site_settings para verificar se há uma URL customizada
 * 3. Se houver, reconecta com essa URL
 *
 * Retorna { db, url } para uso no proxy global de drizzle/db.ts
 */
export async function resolveDatabaseUrl(): Promise<string> {
  const envUrl = process.env.DATABASE_URL
  if (!envUrl) throw new Error('DATABASE_URL não configurado')

  try {
    // Bootstrap com env var para ler site_settings
    const bootClient = makeClient(envUrl)
    const rows = await bootClient`
      SELECT value FROM site_settings WHERE key = 'database_url' LIMIT 1
    `
    await bootClient.end()

    if (rows.length > 0 && rows[0].value) {
      return rows[0].value as string
    }
  } catch {
    // Se falhar ao ler site_settings (banco vazio, tabela não existe), usa env var
  }

  return envUrl
}

/**
 * Mascarar URL do banco — exibe apenas host:porta/dbname, oculta senha.
 * Ex: postgresql://user:senha@host:5432/db → host:5432/db
 */
export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const port = parsed.port || '5432'
    const db = parsed.pathname.replace(/^\//, '')
    return `${host}:${port}/${db}`
  } catch {
    return '(URL inválida)'
  }
}
