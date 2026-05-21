import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, automationConfig, articleThemes, siteSettings } from '@/drizzle/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import { aiChat, callOpenRouterImage, getPromptFromDB } from '@/lib/ai'
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-admin'
import { getArticleConfig, buildArticleConfigPromptSection } from '@/lib/article-config'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt'],
  },
}

export type AutomationResult = {
  success: boolean
  message: string
  post_id?: number
  skipped?: boolean
  image_error?: string
}

export async function getOrCreateAutomationConfig() {
  const rows = await db.select().from(automationConfig).limit(1)
  if (rows.length > 0) return rows[0]
  const [row] = await db.insert(automationConfig).values({}).returning()
  return row
}

export async function runAutomationCycle(force = false): Promise<AutomationResult> {
  const config = await getOrCreateAutomationConfig()

  if (!config.enabled) {
    return { success: false, skipped: true, message: 'Automação desabilitada' }
  }

  if (!force && config.next_run_at && new Date() < new Date(config.next_run_at)) {
    return { success: false, skipped: true, message: 'Ainda não está na hora de executar' }
  }

  // Pick theme
  let selectedIds: number[] = []
  try {
    selectedIds = JSON.parse(config.theme_ids)
    if (!Array.isArray(selectedIds)) selectedIds = []
  } catch {}
  let theme: { id: number; title: string; description: string | null } | undefined

  if (selectedIds.length > 0) {
    const rows = await db
      .select()
      .from(articleThemes)
      .where(and(inArray(articleThemes.id, selectedIds), eq(articleThemes.status, 'pending')))
      .orderBy(asc(articleThemes.created_at))
      .limit(1)
    theme = rows[0]
  } else {
    const rows = await db
      .select()
      .from(articleThemes)
      .where(eq(articleThemes.status, 'pending'))
      .orderBy(asc(articleThemes.created_at))
      .limit(1)
    theme = rows[0]
  }

  if (!theme) {
    return { success: false, message: 'Nenhum tema pendente disponível para geração' }
  }

  // Load briefing
  let briefingContent = ''
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, 'briefing_content')).limit(1)
    briefingContent = rows.length > 0 ? rows[0].value : ''
  } catch {}

  const contextSection = briefingContent
    ? `\n\nCONTEXTO DA EMPRESA (briefing):\n---\n${briefingContent.slice(0, 8000)}\n---\n\nUse o contexto acima para garantir relevância para o negócio e público-alvo.`
    : ''

  const customPromptSection = config.custom_prompt?.trim()
    ? `\n\nINSTRUÇÕES ADICIONAIS:\n${config.custom_prompt.trim()}`
    : ''

  const articleConfig = await getArticleConfig()
  const configSection = buildArticleConfigPromptSection(articleConfig)

  // Generate article content
  const articlePrompt = `Você é um redator profissional especializado em blogs corporativos. Escreva um artigo completo e detalhado sobre:

Tema: "${theme.title}"
${theme.description ? `Descrição do tema: ${theme.description}` : ''}
${contextSection}

${configSection}

Requisitos técnicos:
- O artigo deve ter pelo menos ${articleConfig.minWords} palavras
- Use formatação HTML para estruturar o conteúdo (h2, h3, p, strong, em, ul, ol, li, blockquote)
- Inclua uma introdução envolvente
- Desenvolva o conteúdo com subtítulos bem estruturados
- Termine com uma conclusão
- O conteúdo deve ser informativo, bem escrito e otimizado para SEO${customPromptSection}

Responda com um JSON válido (sem markdown, sem \`\`\`) com a seguinte estrutura:
{
  "title": "título do artigo",
  "excerpt": "resumo em até 160 caracteres",
  "content": "conteúdo HTML completo"
}`

  const aiResult = await aiChat(
    'content_generation',
    [
      { role: 'system', content: 'Você é um redator profissional. Responda em JSON válido, sem markdown.' },
      { role: 'user', content: articlePrompt },
    ],
    { temperature: articleConfig.creativity, max_tokens: 4096 }
  )

  let articleData: { title: string; excerpt: string; content: string }
  try {
    const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    articleData = JSON.parse(cleaned)
  } catch {
    return { success: false, message: 'Erro ao processar resposta da IA (artigo)' }
  }

  // Append timestamp to slug to avoid unique constraint collisions
  const slug = generateSlug(articleData.title) + '-' + Date.now()
  const cleanContent = sanitizeHtml(articleData.content, sanitizeOptions)
  const now = new Date()

  const [post] = await db.insert(posts).values({
    title: articleData.title,
    slug,
    content: cleanContent,
    excerpt: articleData.excerpt ?? '',
    status: 'draft',
    updated_at: now,
  }).returning()

  // Generate cover image (non-fatal if it fails)
  let coverImageUrl: string | undefined
  let imageError: string | undefined
  try {
    const imagePromptTemplate = await getPromptFromDB('image')
    const contextParts = [`Título do artigo: ${articleData.title}`]
    if (articleData.excerpt) contextParts.push(`Resumo: ${articleData.excerpt}`)
    const textContent = cleanContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
    contextParts.push(`Conteúdo: ${textContent}`)

    let finalPrompt: string
    if (imagePromptTemplate) {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa profissional para o artigo. Responda APENAS com o prompt.' },
        { role: 'user', content: `${imagePromptTemplate}\n\nContexto:\n${contextParts.join('\n')}` },
      ], { temperature: 0.8, max_tokens: 500 })
    } else {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa para blog, estilo fotorealista ou editorial. Responda APENAS com o prompt.' },
        { role: 'user', content: contextParts.join('\n') },
      ], { temperature: 0.8, max_tokens: 500 })
    }

    const imageUrl = await callOpenRouterImage(finalPrompt)

    let imageBuffer: Buffer
    let contentType = 'image/png'

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error('Formato de imagem inválido')
      contentType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      const imageRes = await fetch(imageUrl)
      contentType = imageRes.headers.get('content-type') ?? 'image/png'
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg'
      : contentType.includes('webp') ? '.webp' : '.png'
    const filename = `auto-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, imageBuffer, { contentType })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload para o Supabase Storage: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    coverImageUrl = publicUrl
  } catch (imgErr) {
    imageError = imgErr instanceof Error ? imgErr.message : String(imgErr)
    console.error('[Automation] Image generation failed (continuing without image):', imageError)
  }

  // Publish post
  await db.update(posts).set({
    cover_image: coverImageUrl ?? null,
    status: 'published',
    published_at: now,
    updated_at: now,
  }).where(eq(posts.id, post.id))

  // Mark theme as used
  await db.update(articleThemes).set({ status: 'used' }).where(eq(articleThemes.id, theme.id))

  // Update automation timestamps
  const nextRun = new Date(now.getTime() + config.interval_hours * 60 * 60 * 1000)
  await db.update(automationConfig).set({
    last_run_at: now,
    next_run_at: nextRun,
    updated_at: now,
  }).where(eq(automationConfig.id, config.id))

  return {
    success: true,
    message: `Artigo "${articleData.title}" gerado e publicado com sucesso.`,
    post_id: post.id,
    ...(imageError ? { image_error: imageError } : {}),
  }
}
