import { asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { news, newsRelatedDogs } from '../db/schema/index.js';
import type { NewsCategory, NewsItem, NewsPage } from '../types.js';
import { toNewsItem } from './mappers.js';

/**
 * Acceso a las noticias.
 *
 * Las relaciones con perritos viven en una tabla puente; se cargan en una
 * segunda consulta y se agrupan, para no repetir filas.
 */

/** Etiqueta visible de cada categoría. Es presentación, no contenido editable. */
export const NEWS_CATEGORIES: { slug: NewsCategory; label: string; emoji: string }[] = [
	{ slug: 'rescate', label: 'Rescate', emoji: '🚑' },
	{ slug: 'adopcion', label: 'Adopción', emoji: '🏠' },
	{ slug: 'salud', label: 'Salud', emoji: '💉' },
	{ slug: 'evento', label: 'Evento', emoji: '🎉' },
	{ slug: 'tienda', label: 'Tienda', emoji: '🛍️' }
];

/** Más reciente primero. */
const NEWS_ORDER = [desc(news.date), desc(news.id)];

async function relatedByNews(slugs: string[]): Promise<Map<string, string[]>> {
	const grouped = new Map<string, string[]>();
	if (slugs.length === 0) return grouped;

	const rows = await db
		.select()
		.from(newsRelatedDogs)
		.where(inArray(newsRelatedDogs.newsSlug, slugs))
		.orderBy(asc(newsRelatedDogs.sortOrder), asc(newsRelatedDogs.id));

	for (const row of rows) {
		const list = grouped.get(row.newsSlug) ?? [];
		list.push(row.dogSlug);
		grouped.set(row.newsSlug, list);
	}
	return grouped;
}

/** Feed completo, más reciente primero. */
export async function getAllNews(): Promise<NewsItem[]> {
	const rows = await db.select().from(news).orderBy(...NEWS_ORDER);
	const related = await relatedByNews(rows.map((row) => row.slug));
	return rows.map((row) => toNewsItem(row, related.get(row.slug) ?? []));
}

export async function getNewsItem(slug: string): Promise<NewsItem | undefined> {
	const [row] = await db.select().from(news).where(eq(news.slug, slug)).limit(1);
	if (!row) return undefined;

	const related = await relatedByNews([slug]);
	return toNewsItem(row, related.get(slug) ?? []);
}

export async function getNewsByCategory(category: NewsCategory): Promise<NewsItem[]> {
	const rows = await db
		.select()
		.from(news)
		.where(eq(news.category, category))
		.orderBy(...NEWS_ORDER);

	const related = await relatedByNews(rows.map((row) => row.slug));
	return rows.map((row) => toNewsItem(row, related.get(row.slug) ?? []));
}

/**
 * Página del feed para el scroll infinito.
 *
 * `offset` es cuántos elementos ya se mostraron. Se cuenta el total para saber
 * si quedan más, en vez de traer todo el feed.
 */
export async function getNewsPage(offset = 0, limit = 6): Promise<NewsPage> {
	const rows = await db
		.select()
		.from(news)
		.orderBy(...NEWS_ORDER)
		.limit(limit)
		.offset(offset);

	const related = await relatedByNews(rows.map((row) => row.slug));
	const items = rows.map((row) => toNewsItem(row, related.get(row.slug) ?? []));

	const [counted] = await db.select({ total: count() }).from(news);
	const total = counted?.total ?? 0;
	return { items, hasMore: offset + items.length < total };
}
