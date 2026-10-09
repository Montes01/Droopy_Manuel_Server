import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { newsCategoryEnum } from './enums.js';
import { dogs } from './dogs.js';

/** Noticias de la fundación. `slug` se usa en /noticias/[slug]. */
export const news = pgTable(
	'news',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: varchar('slug', { length: 160 }).notNull().unique(),
		title: varchar('title', { length: 255 }).notNull(),
		excerpt: text('excerpt').notNull(),
		/** Cuerpo completo, un elemento por párrafo. */
		body: text('body').array().notNull().default([]),
		/** Fecha ISO (YYYY-MM-DD). Ordena el feed: más reciente primero. */
		date: varchar('date', { length: 10 }).notNull(),
		category: newsCategoryEnum('category').notNull(),
		tags: text('tags').array().notNull().default([]),
		photo: varchar('photo', { length: 255 }),
		emoji: varchar('emoji', { length: 16 }).notNull(),
		featured: boolean('featured').notNull().default(false),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('news_date_idx').on(table.date),
		index('news_category_idx').on(table.category)
	]
);

/**
 * Perritos relacionados con una noticia.
 *
 * Tabla puente en vez de un array de slugs: así el panel puede ofrecer un
 * selector de perritos existentes y no se pueden guardar slugs rotos.
 */
export const newsRelatedDogs = pgTable(
	'news_related_dogs',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		newsSlug: varchar('news_slug', { length: 160 })
			.notNull()
			.references(() => news.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
		dogSlug: varchar('dog_slug', { length: 120 })
			.notNull()
			.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(table) => [index('news_related_news_idx').on(table.newsSlug)]
);

export type NewsRow = typeof news.$inferSelect;
export type NewNewsRow = typeof news.$inferInsert;
export type NewsRelatedDogRow = typeof newsRelatedDogs.$inferSelect;
