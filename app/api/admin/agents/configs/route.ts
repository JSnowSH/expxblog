import { NextRequest, NextResponse } from 'next/server'
import { getAgentConfigs, upsertAgentConfig } from '@/lib/agent-configs'
import { AgentId } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const configs = await getAgentConfigs()
    return NextResponse.json({ configs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as { id: AgentId; prompt?: string; model?: string }
    await upsertAgentConfig(body.id, { prompt: body.prompt, model: body.model })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
