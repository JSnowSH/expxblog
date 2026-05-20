import Link from 'next/link'
import type { Post, Category } from '@/drizzle/schema'

interface PostCardPortalProps {
  post: Post & { categories: Category[] }
  size?: 'large' | 'small'
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function PostCardPortal({ post, size = 'small' }: PostCardPortalProps) {
  const isLarge = size === 'large'

  return (
    <article
      className="bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow group border border-gray-100"
      style={{ borderTop: '4px solid var(--color-secondary)' }}
    >
      <Link href={`/${post.slug}`} className="block">
        {post.cover_image && (
          <div className={`relative overflow-hidden ${isLarge ? 'aspect-video' : 'aspect-[4/3]'}`}>
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </Link>

      <div className={isLarge ? 'p-5' : 'p-4'}>
        {post.categories.length > 0 && (
          <span
            className="text-xs font-bold uppercase tracking-wider mb-2 block"
            style={{ color: 'var(--color-secondary)' }}
          >
            {post.categories[0].name}
          </span>
        )}

        <Link href={`/${post.slug}`}>
          <h3
            className={`font-bold leading-snug hover:underline mb-2 ${
              isLarge ? 'text-xl line-clamp-3' : 'text-base line-clamp-2'
            }`}
            style={{ color: 'var(--color-primary)' }}
          >
            {post.title}
          </h3>
        </Link>

        {isLarge && post.excerpt && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{post.excerpt}</p>
        )}

        {post.published_at && (
          <time className="text-xs text-gray-400">{formatDate(post.published_at)}</time>
        )}
      </div>
    </article>
  )
}
