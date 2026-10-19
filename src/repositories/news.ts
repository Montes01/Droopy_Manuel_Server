import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { news, newsRelatedDogs } from '../db/schema/index.js';
import type { NewsCategory, NewsFilter, NewsItem, NewsPage } from '../types.js';
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
	{ slug: 'tienda', label: 'Tienda', emoji: '🛍️' },
	{ slug: 'proyecto', label: 'Proyecto', emoji: '⭐' },
	{ slug: 'ayudas', label: 'Ayudas', emoji: '🤝' }
];

/** Más reciente primero. */
const NEWS_ORDER = [desc(news.date), desc(news.id)];

/**
 * Condición SQL del filtro del feed, o `undefined` si no hay nada que filtrar.
 *
 * La búsqueda recorre título, bajada, etiquetas y cuerpo sin distinguir
 * mayúsculas. Etiquetas y cuerpo son arrays de texto: se aplanan con
 * `array_to_string` para poder buscar dentro de cada elemento.
 */
function filterCondition(filter: NewsFilter = {}): SQL | undefined {
	const conditions: SQL[] = [];

	if (filter.category) {
		conditions.push(eq(news.category, filter.category));
	}

	const q = filter.q?.trim();
	if (q) {
		const like = `%${q}%`;
		const match = or(
			ilike(news.title, like),
			ilike(news.excerpt, like),
			sql`array_to_string(${news.tags}, ' ') ILIKE ${like}`,
			sql`array_to_string(${news.body}, ' ') ILIKE ${like}`
		);
		if (match) conditions.push(match);
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

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
export async function getAllNews(filter: NewsFilter = {}): Promise<NewsItem[]> {
	const rows = await db
		.select()
		.from(news)
		.where(filterCondition(filter))
		.orderBy(...NEWS_ORDER);
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
 * `offset` es cuántos elementos ya se mostraron. Se cuenta el total del
 * conjunto filtrado para saber si quedan más, en vez de traer todo el feed.
 */
export async function getNewsPage(
	offset = 0,
	limit = 6,
	filter: NewsFilter = {}
): Promise<NewsPage> {
	const where = filterCondition(filter);

	const rows = await db
		.select()
		.from(news)
		.where(where)
		.orderBy(...NEWS_ORDER)
		.limit(limit)
		.offset(offset);

	const related = await relatedByNews(rows.map((row) => row.slug));
	const items = rows.map((row) => toNewsItem(row, related.get(row.slug) ?? []));

	const [counted] = await db
		.select({ total: count() })
		.from(news)
		.where(where);
	const total = counted?.total ?? 0;
	return { items, hasMore: offset + items.length < total };
}
