import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PostGrid } from '@/components/blog/PostGrid'
import { Pagination } from '@/components/ui/Pagination'
import { getPostsPage, getTagBySlug } from '@/lib/db-queries'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tag = await getTagBySlug(params.slug)
  return { title: tag ? `Tag: ${tag.name}` : 'Tag não encontrada' }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { page?: string }
}) {
  const [postsData, tag] = await Promise.all([
    getPostsPage({ page: searchParams.page, limit: '9', tag: params.slug }),
    getTagBySlug(params.slug),
  ])

  if (!tag) notFound()

  return (
    <div>
      <Link href="/" className="text-brand-primary text-sm hover:underline mb-4 inline-block">← Blog</Link>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Tag: {tag.name}</h1>
      <PostGrid posts={postsData.posts} />
      <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
    </div>
  )
}
