import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const deploymentId = searchParams.get('deploymentId')
  const vercelToken = searchParams.get('vercelToken')
  const teamId = process.env.VERCEL_TEAM_ID

  if (!deploymentId || !vercelToken) {
    return NextResponse.json({ error: 'deploymentId e vercelToken obrigatórios' }, { status: 400 })
  }

  const teamParam = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}${teamParam}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })

  if (!res.ok) {
    return NextResponse.json({ state: 'ERROR', error: 'Falha ao consultar status do deployment' })
  }

  const data = await res.json()
  return NextResponse.json({
    state: data.readyState ?? data.status ?? 'BUILDING',
    url: data.url ? `https://${data.url}` : undefined,
  })
}
