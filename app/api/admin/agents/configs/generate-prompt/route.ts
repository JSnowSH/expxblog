import { NextRequest, NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { AGENT_DEFINITIONS, AgentId } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json() as { agentId: AgentId }

    const def = AGENT_DEFINITIONS.find((d) => d.id === agentId)
    if (!def) return NextResponse.json({ error: 'Agente desconhecido' }, { status: 400 })

    let briefing = ''
    try {
      const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, 'briefing_content')).limit(1)
      briefing = rows[0]?.value ?? ''
    } catch {}

    const prompt = await aiChat('prompt_generation', [
      {
        role: 'system',
        content: 'Você é um especialista em engenharia de prompts para agentes de IA. Crie um system prompt profissional e detalhado para o agente descrito. Responda APENAS com o prompt, sem explicações adicionais.',
      },
      {
        role: 'user',
        content: `Agente: ${def.label}
Função: ${def.description}
${briefing ? `\nBriefing da empresa:\n${briefing.slice(0, 3000)}` : ''}

Prompt atual (referência):\n${def.defaultPrompt}

Gere um prompt melhorado e personalizado para esse agente com base no briefing da empresa.`,
      },
    ])

    return NextResponse.json({ prompt })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
