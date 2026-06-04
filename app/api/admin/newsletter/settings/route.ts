// app/api/admin/newsletter/settings/route.ts
// GET: retorna configurações de newsletter (resend_api_key, newsletter_from_email, newsletter_auto_send)
// PUT: salva configurações de newsletter em site_settings

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  resend_api_key: z.string().optional(),
  newsletter_from_email: z.string().email('E-mail remetente inválido').or(z.string().length(0)).optional(),
  newsletter_auto_send: z.boolean().optional(),
})

async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return rows.length > 0 ? rows[0].value : null
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updated_at: new Date() } })
}

export async function GET() {
  try {
    const [apiKey, fromEmail, autoSend] = await Promise.all([
      getSetting('resend_api_key'),
      getSetting('newsletter_from_email'),
      getSetting('newsletter_auto_send'),
    ])

    return NextResponse.json({
      settings: {
        resend_api_key: apiKey ?? '',
        newsletter_from_email: fromEmail ?? '',
        newsletter_auto_send: autoSend === 'true',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configurações.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos: ' + parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const { resend_api_key, newsletter_from_email, newsletter_auto_send } = parsed.data

    const updates: Promise<void>[] = []

    if (resend_api_key !== undefined) {
      updates.push(setSetting('resend_api_key', resend_api_key))
    }
    if (newsletter_from_email !== undefined) {
      updates.push(setSetting('newsletter_from_email', newsletter_from_email))
    }
    if (newsletter_auto_send !== undefined) {
      updates.push(setSetting('newsletter_auto_send', newsletter_auto_send ? 'true' : 'false'))
    }

    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 })
  }
}
