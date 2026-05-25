import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PostGrid } from '@/components/blog/PostGrid'
import { Pagination } from '@/components/ui/Pagination'
import { getPostsPage, getCategoryBySlug } from '@/lib/db-queries'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug)
  return { title: category ? `Categoria: ${category.name}` : 'Categoria não encontrada' }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { page?: string }
}) {
  const [postsData, category] = await Promise.all([
    getPostsPage({ page: searchParams.page, limit: '9', category: params.slug }),
    getCategoryBySlug(params.slug),
  ])

  if (!category) notFound()

  return (
    <div>
      <Link href="/" className="text-brand-primary text-sm hover:underline mb-4 inline-block">← Blog</Link>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Categoria: {category.name}</h1>
      {category.description && <p className="text-gray-500 mb-6">{category.description}</p>}
      <PostGrid posts={postsData.posts} />
      <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
    </div>
  )
}
