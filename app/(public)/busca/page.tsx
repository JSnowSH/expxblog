import type { Metadata } from 'next'
import Link from 'next/link'
import { PostGrid } from '@/components/blog/PostGrid'
import { SearchBar } from '@/components/blog/SearchBar'
import { getPostsPage } from '@/lib/db-queries'

export const metadata: Metadata = { title: 'Busca' }

export default async function BuscaPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? ''
  const postsData = q.trim()
    ? await getPostsPage({ search: q, limit: '20' })
    : { posts: [], total: 0, page: 1, pages: 1 }

  return (
    <div>
      <Link href="/" className="text-brand-primary text-sm hover:underline mb-4 inline-block">← Blog</Link>
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Busca</h1>

      <div className="max-w-md mb-6">
        <SearchBar initialValue={q} />
      </div>

      {q && (
        <p className="text-gray-500 mb-6">
          {postsData.posts.length > 0
            ? `${postsData.posts.length} resultado(s) para "${q}"`
            : `Nenhum resultado para "${q}"`}
        </p>
      )}

      <PostGrid posts={postsData.posts} />
    </div>
  )
}
