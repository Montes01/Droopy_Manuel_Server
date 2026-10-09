import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogs, news, newsRelatedDogs } from '../db/schema/index.js';
import type { NewsCategory, NewsItem } from '../types.js';
import { toNewsItem } from './mappers.js';
import {
	DATE_RE,
	ValidationError,
	requireEnum,
	requireString,
	requireStringArray,
	slugify
} from './validation.js';

/**
 * Escritura de noticias (panel de administración).
 *
 * Las relaciones con perritos viven en una tabla puente. Al guardar se
 * reemplazan por completo, que es más predecible que diferenciar altas y bajas,
 * y se descartan slugs que no existan para no romper la clave foránea.
 */

export interface NewsInput {
	slug?: string;
	title?: string;
	excerpt?: string;
	body?: string[];
	date?: string;
	category?: NewsCategory;
	tags?: string[];
	photo?: string | null;
	emoji?: string;
	featured?: boolean;
	relatedDogSlugs?: string[];
}

const CATEGORIES = ['rescate', 'adopcion', 'salud', 'evento', 'tienda'];

function buildValues(input: NewsInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.title !== undefined) {
		values.title = requireString(input.title, 'title', 255);
	}
	if (!partial || input.excerpt !== undefined) {
		values.excerpt = requireString(input.excerpt, 'excerpt', 2000);
	}
	if (!partial || input.body !== undefined) {
		const body = requireStringArray(input.body, 'body');
		if (body.length === 0) {
			throw new ValidationError('El campo "body" debe tener al menos un párrafo.');
		}
		values.body = body;
	}
	if (!partial || input.date !== undefined) {
		const date = requireString(input.date, 'date', 10);
		if (!DATE_RE.test(date)) {
			throw new ValidationError('El campo "date" debe tener el formato YYYY-MM-DD.');
		}
		values.date = date;
	}
	if (!partial || input.category !== undefined) {
		values.category = requireEnum(input.category, CATEGORIES, 'category');
	}
	if (!partial || input.emoji !== undefined) {
		values.emoji = requireString(input.emoji, 'emoji', 16);
	}

	if (input.tags !== undefined) values.tags = requireStringArray(input.tags, 'tags');
	if (input.photo !== undefined) values.photo = input.photo || null;
	if (input.featured !== undefined) values.featured = Boolean(input.featured);

	return values;
}

/** Filtra los slugs de perritos que realmente existen. */
async function validDogSlugs(slugs: string[]): Promise<string[]> {
	if (slugs.length === 0) return [];
	const rows = await db
		.select({ slug: dogs.slug })
		.from(dogs)
		.where(inArray(dogs.slug, slugs));
	const valid = new Set(rows.map((row) => row.slug));
	return slugs.filter((slug) => valid.has(slug));
}

export async function createNews(input: NewsInput): Promise<NewsItem> {
	const values = buildValues(input, false);
	const title = String(values.title);
	const slug = input.slug ? slugify(input.slug) : slugify(title);
	if (!slug) throw new ValidationError('No se pudo derivar un slug válido.');

	const [existing] = await db.select().from(news).where(eq(news.slug, slug)).limit(1);
	if (existing) throw new ValidationError(`Ya existe una noticia con el slug "${slug}".`);

	const related = await validDogSlugs(input.relatedDogSlugs ?? []);

	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(news)
			.values({ ...(values as typeof news.$inferInsert), slug })
			.returning();

		if (!row) throw new Error('No se pudo crear la noticia.');

		if (related.length > 0) {
			await tx.insert(newsRelatedDogs).values(
				related.map((dogSlug, index) => ({ newsSlug: slug, dogSlug, sortOrder: index }))
			);
		}

		return toNewsItem(row, related);
	});
}

export async function updateNews(slug: string, input: NewsInput): Promise<NewsItem | undefined> {
	const values = buildValues(input, true);
	const replaceRelated = input.relatedDogSlugs !== undefined;
	const related = replaceRelated ? await validDogSlugs(input.relatedDogSlugs ?? []) : [];

	if (Object.keys(values).length === 0 && !replaceRelated) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	return db.transaction(async (tx) => {
		const [row] = await tx
			.update(news)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(news.slug, slug))
			.returning();

		if (!row) return undefined;

		if (replaceRelated) {
			await tx.delete(newsRelatedDogs).where(eq(newsRelatedDogs.newsSlug, slug));
			if (related.length > 0) {
				await tx.insert(newsRelatedDogs).values(
					related.map((dogSlug, index) => ({ newsSlug: slug, dogSlug, sortOrder: index }))
				);
			}
		}

		const finalRelated = await tx
			.select({ dogSlug: newsRelatedDogs.dogSlug })
			.from(newsRelatedDogs)
			.where(eq(newsRelatedDogs.newsSlug, slug))
			.orderBy(newsRelatedDogs.sortOrder);

		return toNewsItem(
			row,
			finalRelated.map((entry) => entry.dogSlug)
		);
	});
}

export async function deleteNews(slug: string): Promise<boolean> {
	// Las relaciones caen solas: la FK es `on delete cascade`.
	const deleted = await db.delete(news).where(eq(news.slug, slug)).returning({ id: news.id });
	return deleted.length > 0;
}
