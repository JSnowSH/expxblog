import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { aiRequestLogs } from '@/drizzle/schema'
import { desc, gte, and, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

function getPeriodStart(period: string): Date | null {
  const now = new Date()
  switch (period) {
    case 'today': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return d
    }
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return d
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return d
    }
    default:
      return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const period = searchParams.get('period') ?? '7d'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const featureFilter = searchParams.get('feature')
    const offset = (page - 1) * limit

    const periodStart = getPeriodStart(period)

    const conditions = []
    if (periodStart) conditions.push(gte(aiRequestLogs.created_at, periodStart))
    if (featureFilter) conditions.push(eq(aiRequestLogs.feature, featureFilter))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(aiRequestLogs)
        .where(whereClause)
        .orderBy(desc(aiRequestLogs.created_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ id: aiRequestLogs.id })
        .from(aiRequestLogs)
        .where(whereClause),
    ])

    return NextResponse.json({
      data: rows,
      total: countRows.length,
      page,
      limit,
      pages: Math.ceil(countRows.length / limit),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar logs de IA' },
      { status: 500 }
    )
  }
}
