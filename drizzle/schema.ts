import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('admin'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    content: text('content').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    cover_image: text('cover_image'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    published_at: timestamp('published_at'),
    created_at: timestamp('created_at').notNull().default(sql`now()`),
    updated_at: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (t) => ({
    statusIdx: index('posts_status_idx').on(t.status),
    publishedAtIdx: index('posts_published_at_idx').on(t.published_at),
  })
)

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const postCategories = pgTable(
  'post_categories',
  {
    post_id: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    category_id: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.post_id, t.category_id] }) })
)

export const postTags = pgTable(
  'post_tags',
  {
    post_id: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tag_id: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.post_id, t.tag_id] }) })
)

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const postsRelations = relations(posts, ({ many }) => ({
  postCategories: many(postCategories),
  postTags: many(postTags),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}))

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.post_id], references: [posts.id] }),
  category: one(categories, {
    fields: [postCategories.category_id],
    references: [categories.id],
  }),
}))

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.post_id], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tag_id], references: [tags.id] }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type SiteSetting = typeof siteSettings.$inferSelect
