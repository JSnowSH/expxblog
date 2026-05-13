import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'

export const dynamic = 'force-dynamic'
import { categories } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  try {
    const all = await db.select().from(categories).orderBy(asc(categories.name))
    return NextResponse.json({ categories: all })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno do servidor', debug: String(err) }, { status: 500 })
  }
}
