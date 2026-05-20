import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PostGrid } from '@/components/blog/PostGrid'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { HeroPost } from '@/components/blog/HeroPost'
import { EditorialGrid } from '@/components/blog/EditorialGrid'
import { Pagination } from '@/components/ui/Pagination'
import { getSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Tecnologia, gestão e inovação para empresas — MMA Sistemas Blog',
}

async function getPosts(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/posts?${params.toString()}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return { posts: [], total: 0, page: 1, pages: 1 }
  return res.json()
}

async function getCategories() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/categories`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) return { categories: [] }
  return res.json()
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; tag?: string }
}) {
  const { template } = await getSettings()

  const pageLimit = template === 'portal' ? '10' : '9'
  const [postsData, categoriesData] = await Promise.all([
    getPosts({ page: searchParams.page ?? '1', limit: pageLimit, ...searchParams }),
    getCategories(),
  ])

  if (template === 'portal') {
    const [heroPost, ...gridPosts] = postsData.posts
    return (
      <div>
        {heroPost && <HeroPost post={heroPost} />}
        <EditorialGrid posts={gridPosts} />
        <Suspense>
          <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2 font-serif">Blog</h1>
        <p className="text-gray-500 mb-8">Tecnologia, gestão e inovação para empresas</p>

        <Suspense>
          <CategoryFilter
            categories={categoriesData.categories}
            selected={searchParams.category}
          />
        </Suspense>

        <div className="mt-6">
          <PostGrid posts={postsData.posts} />
        </div>

        <Suspense>
          <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
        </Suspense>
      </div>

      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-8">
          <h2 className="font-semibold text-neutral-900 mb-4">Categorias</h2>
          <div className="flex flex-col gap-1">
            {categoriesData.categories.map((cat: { id: number; name: string; slug: string }) => (
              <a
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="text-sm text-brand-primary hover:text-brand-primary-dark px-3 py-1.5 rounded-lg hover:bg-brand-primary-light transition-colors"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
