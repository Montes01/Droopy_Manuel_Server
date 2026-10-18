import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogNews } from '../db/schema/index.js';
import type { DogNews, DogNewsKind } from '../types.js';
import { DOG_NEWS_KINDS } from '../types.js';
import { toDogNews } from './mappers.js';
import {
	DATE_RE,
	ValidationError,
	requireBooleanish,
	requireEnum,
	requireNullableISODateAny,
	requireString
} from './validation.js';

/**
 * Escritura de los comunicados de la manada (panel de administración).
 *
 * Separado de `dog-news.ts` (solo lectura), como el resto de recursos. Cada
 * función recibe el slug del perrito dueño: la escritura siempre queda atada a
 * un perrito existente.
 */

/** Campos que acepta el panel al crear o editar un comunicado. */
export interface DogNewsInput {
	kind?: DogNewsKind;
	title?: string;
	body?: string;
	date?: string;
	/** Fecha final: solo se aplica cuando `kind` es `tratamiento`. */
	endDate?: string | null;
	photo?: string | null;
	urgent?: boolean;
}

/**
 * Construye los valores a escribir a partir de la entrada del panel.
 *
 * `partial` permite editar sin enviar todos los campos: en ese caso solo se
 * validan los que vienen.
 */
function buildValues(input: DogNewsInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.kind !== undefined) {
		values.kind = requireEnum(input.kind, [...DOG_NEWS_KINDS], 'kind');
	}
	if (!partial || input.title !== undefined) {
		values.title = requireString(input.title, 'title', 160);
	}
	if (!partial || input.body !== undefined) {
		values.body = requireString(input.body, 'body', 5000);
	}
	if (!partial || input.date !== undefined) {
		const date = requireString(input.date, 'date', 10);
		if (!DATE_RE.test(date)) {
			throw new ValidationError('El campo "date" debe tener el formato YYYY-MM-DD.');
		}
		values.date = date;
	}

	// La fecha final solo aplica a un tratamiento. Se guarda cuando el
	// comunicado queda de tipo `tratamiento`; si el tipo es otro, se limpia.
	if (input.endDate !== undefined) {
		const endDate = requireNullableISODateAny(input.endDate, 'endDate');
		if (endDate !== null && values.kind !== undefined && values.kind !== 'tratamiento') {
			throw new ValidationError('La fecha final solo aplica a comunicados de tipo tratamiento.');
		}
		values.endDate = endDate;
	} else if (values.kind !== undefined && values.kind !== 'tratamiento') {
		values.endDate = null;
	}

	if (input.photo !== undefined) values.photo = input.photo || null;
	if (input.urgent !== undefined) values.urgent = requireBooleanish(input.urgent, 'urgent');

	return values;
}

export async function createDogNews(dogSlug: string, input: DogNewsInput): Promise<DogNews> {
	const values = buildValues(input, false);

	const [row] = await db
		.insert(dogNews)
		.values({ ...(values as typeof dogNews.$inferInsert), dogSlug })
		.returning();

	if (!row) throw new Error('No se pudo crear el comunicado.');
	return toDogNews(row);
}

export async function updateDogNews(
	dogSlug: string,
	id: number,
	input: DogNewsInput
): Promise<DogNews | undefined> {
	const values = buildValues(input, true);
	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(dogNews)
		.set({ ...values, updatedAt: new Date() })
		.where(and(eq(dogNews.id, id), eq(dogNews.dogSlug, dogSlug)))
		.returning();

	return row ? toDogNews(row) : undefined;
}

export async function deleteDogNews(dogSlug: string, id: number): Promise<boolean> {
	const deleted = await db
		.delete(dogNews)
		.where(and(eq(dogNews.id, id), eq(dogNews.dogSlug, dogSlug)))
		.returning({ id: dogNews.id });
	return deleted.length > 0;
}
