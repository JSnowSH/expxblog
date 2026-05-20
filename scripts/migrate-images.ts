import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFile, readdir, unlink } from 'fs/promises'
import path from 'path'
import { db } from '../drizzle/db'
import { posts } from '../drizzle/schema'
import { isNotNull, eq } from 'drizzle-orm'

const BUCKET = 'uploads'

function mimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/gif'
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Cria o bucket se não existir
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Falha ao criar bucket: ${error.message}`)
    console.log('✔ Bucket criado:', BUCKET)
  } else {
    console.log('✔ Bucket já existe:', BUCKET)
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  const files = (await readdir(uploadsDir)).filter((f) => f !== '.gitkeep')

  if (files.length === 0) {
    console.log('Nenhum arquivo local encontrado para migrar.')
    return
  }

  console.log(`\nMigrando ${files.length} arquivo(s)...`)
  const urlMap: Record<string, string> = {}

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename)
    const buffer = await readFile(filePath)
    const contentType = mimeFromExt(filename)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: true })

    if (error) {
      console.error(`✗ Falha ao enviar ${filename}:`, error.message)
      continue
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    urlMap[`/uploads/${filename}`] = publicUrl
    console.log(`✔ ${filename}`)
    console.log(`  ${publicUrl}`)
  }

  // Atualiza cover_image nos posts
  console.log('\nAtualizando posts no banco...')
  const allPosts = await db
    .select({ id: posts.id, cover_image: posts.cover_image })
    .from(posts)
    .where(isNotNull(posts.cover_image))

  let updated = 0
  for (const post of allPosts) {
    const newUrl = post.cover_image ? urlMap[post.cover_image] : null
    if (newUrl) {
      await db.update(posts).set({ cover_image: newUrl }).where(eq(posts.id, post.id))
      console.log(`✔ Post ${post.id}: ${post.cover_image} → ${newUrl}`)
      updated++
    }
  }

  console.log(`\n${updated} post(s) atualizado(s).`)

  // Remove arquivos locais
  console.log('\nRemovendo arquivos locais...')
  for (const filename of Object.keys(urlMap).map((k) => k.replace('/uploads/', ''))) {
    await unlink(path.join(uploadsDir, filename))
    console.log(`✔ Removido: ${filename}`)
  }

  console.log('\nMigração concluída!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
