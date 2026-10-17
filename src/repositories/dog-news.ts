import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogNews } from '../db/schema/index.js';
import type { DogNews, Slug } from '../types.js';
import { toDogNews } from './mappers.js';

/**
 * Lectura de los comunicados de la manada.
 *
 * Mismo orden en todas las vistas: por fecha descendente y, a igualdad de
 * fecha, el último creado primero (`id`).
 */
const DOG_NEWS_ORDER = [desc(dogNews.date), desc(dogNews.id)];

/** Todos los comunicados, sin importar el perrito (feed global / panel). */
export async function getAllDogNews(): Promise<DogNews[]> {
	const rows = await db.select().from(dogNews).orderBy(...DOG_NEWS_ORDER);
	return rows.map(toDogNews);
}

/** Los comunicados de un perrito concreto. */
export async function getDogNews(dogSlug: Slug): Promise<DogNews[]> {
	const rows = await db
		.select()
		.from(dogNews)
		.where(eq(dogNews.dogSlug, dogSlug))
		.orderBy(...DOG_NEWS_ORDER);
	return rows.map(toDogNews);
}

/** Un comunicado concreto de un perrito, o `undefined` si no existe. */
export async function getDogNewsItem(dogSlug: Slug, id: number): Promise<DogNews | undefined> {
	const [row] = await db
		.select()
		.from(dogNews)
		.where(and(eq(dogNews.dogSlug, dogSlug), eq(dogNews.id, id)))
		.limit(1);
	return row ? toDogNews(row) : undefined;
}
