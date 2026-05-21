import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { databaseUrl } = await req.json()
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL obrigatória' })
  }

  let client: ReturnType<typeof postgres> | null = null
  try {
    client = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
    })
    await client`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ ok: false, error: message })
  } finally {
    if (client) await client.end()
  }
}
