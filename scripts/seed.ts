import 'dotenv/config'
import { db } from '../drizzle/db'
import { users, categories, tags, posts, postCategories, postTags } from '../drizzle/schema'
import { hashPassword } from '../lib/auth'
import { generateSlug } from '../lib/slug'
import { eq } from 'drizzle-orm'

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...')

  const existing = await db.select().from(users).where(eq(users.email, 'admin@blog.com')).limit(1)
  if (existing.length === 0) {
    const hash = await hashPassword('admin123')
    await db.insert(users).values({
      email: 'admin@blog.com',
      password_hash: hash,
      name: 'Administrador',
      role: 'admin',
    })
    console.log('✅ Usuário admin criado: admin@blog.com / admin123')
  } else {
    console.log('ℹ️  Usuário admin já existe, pulando.')
  }

  const [catTech] = await db
    .insert(categories)
    .values({ name: 'Tecnologia', slug: 'tecnologia', description: 'Artigos sobre tecnologia e desenvolvimento' })
    .onConflictDoNothing()
    .returning()

  await db
    .insert(categories)
    .values({ name: 'Novidades', slug: 'novidades', description: 'Novidades e atualizações do blog' })
    .onConflictDoNothing()

  console.log('✅ Categorias criadas: Tecnologia, Novidades')

  const tagSlugs = ['next-js', 'react', 'web']
  const tagNames = ['Next.js', 'React', 'Web']
  const createdTags = []

  for (let i = 0; i < tagNames.length; i++) {
    const [t] = await db
      .insert(tags)
      .values({ name: tagNames[i], slug: tagSlugs[i] })
      .onConflictDoNothing()
      .returning()
    if (t) createdTags.push(t)
  }

  console.log('✅ Tags criadas: Next.js, React, Web')

  const postSlug = generateSlug('Bem-vindo ao Blog')
  const [examplePost] = await db
    .insert(posts)
    .values({
      title: 'Bem-vindo ao Blog',
      slug: postSlug,
      content: '<h2>Olá, mundo!</h2><p>Este é o blog. Aqui você encontrará artigos sobre tecnologia, gestão e inovação para empresas.</p><p>Nossa missão é compartilhar conhecimento e ajudar pessoas e empresas a crescerem com o auxílio da tecnologia.</p>',
      excerpt: 'Bem-vindo ao blog, seu portal de artigos sobre tecnologia, gestão e inovação.',
      status: 'published',
      published_at: new Date(),
    })
    .onConflictDoNothing()
    .returning()

  if (examplePost && catTech) {
    await db.insert(postCategories).values({ post_id: examplePost.id, category_id: catTech.id }).onConflictDoNothing()
  }

  if (examplePost && createdTags.length > 0) {
    for (const tag of createdTags) {
      await db.insert(postTags).values({ post_id: examplePost.id, tag_id: tag.id }).onConflictDoNothing()
    }
  }

  console.log('✅ Post de exemplo criado')
  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('   Login admin: admin@blog.com / admin123')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
