import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogs } from '../db/schema/index.js';
import type { Dog, DogStatus } from '../types.js';
import { toDog } from './mappers.js';
import { getAllDogs } from './dogs.js';
import {
	DATE_RE,
	ValidationError,
	requireEnum,
	requireInt,
	requireString,
	requireStringArray,
	slugify
} from './validation.js';

/**
 * Escritura del catálogo de perritos (panel de administración).
 *
 * Separado de `dogs.ts` (solo lectura) para que quede explícito qué módulos
 * pueden modificar datos. Cada función devuelve el perrito ya convertido al
 * tipo de dominio, listo para responder.
 */

/** Campos que acepta el panel al crear o editar un perrito. */
export interface DogInput {
	slug?: string;
	name?: string;
	breed?: string;
	ageYears?: number;
	ageLabel?: string;
	sex?: Dog['sex'];
	size?: Dog['size'];
	energy?: Dog['energy'];
	goodWith?: Partial<Dog['goodWith']>;
	vaccinated?: boolean;
	sterilized?: boolean;
	status?: DogStatus;
	arrival?: string;
	traits?: string[];
	story?: string;
	photo?: string | null;
	featured?: boolean;
	sortOrder?: number;
}

const SEXES = ['macho', 'hembra'];
const SIZES = ['pequeño', 'mediano', 'grande'];
const ENERGIES = ['tranquilo', 'moderado', 'juguetón'];
const STATUSES = ['en-adopcion', 'hogar-temporal', 'adoptado', 'en-memoria'];

/**
 * Construye los valores a escribir a partir de la entrada del panel.
 *
 * `partial` permite editar sin enviar todos los campos: en ese caso solo se
 * validan los que vienen.
 */
function buildValues(input: DogInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.name !== undefined) {
		values.name = requireString(input.name, 'name', 120);
	}
	if (!partial || input.breed !== undefined) {
		values.breed = requireString(input.breed, 'breed', 120);
	}
	if (!partial || input.ageYears !== undefined) {
		values.ageYears = requireInt(input.ageYears, 'ageYears');
	}
	if (!partial || input.ageLabel !== undefined) {
		values.ageLabel = requireString(input.ageLabel, 'ageLabel', 60);
	}
	if (!partial || input.sex !== undefined) {
		values.sex = requireEnum(input.sex, SEXES, 'sex');
	}
	if (!partial || input.size !== undefined) {
		values.size = requireEnum(input.size, SIZES, 'size');
	}
	if (!partial || input.energy !== undefined) {
		values.energy = requireEnum(input.energy, ENERGIES, 'energy');
	}
	if (!partial || input.status !== undefined) {
		values.status = requireEnum(input.status, STATUSES, 'status');
	}
	if (!partial || input.arrival !== undefined) {
		const arrival = requireString(input.arrival, 'arrival', 10);
		if (!DATE_RE.test(arrival)) {
			throw new ValidationError('El campo "arrival" debe tener el formato YYYY-MM-DD.');
		}
		values.arrival = arrival;
	}
	if (!partial || input.story !== undefined) {
		values.story = requireString(input.story, 'story', 5000);
	}

	// Campos opcionales: se aplican solo si vienen.
	if (input.goodWith) {
		values.goodWithKids = Boolean(input.goodWith.kids);
		values.goodWithDogs = Boolean(input.goodWith.dogs);
		values.goodWithCats = Boolean(input.goodWith.cats);
	}
	if (input.vaccinated !== undefined) values.vaccinated = Boolean(input.vaccinated);
	if (input.sterilized !== undefined) values.sterilized = Boolean(input.sterilized);
	if (input.featured !== undefined) values.featured = Boolean(input.featured);
	if (input.photo !== undefined) values.photo = input.photo || null;
	if (input.traits !== undefined) {
		values.traits = requireStringArray(input.traits, 'traits');
	}
	if (input.sortOrder !== undefined) {
		values.sortOrder = requireInt(input.sortOrder, 'sortOrder');
	}

	return values;
}

export async function createDog(input: DogInput): Promise<Dog> {
	const values = buildValues(input, false);

	const slug = input.slug ? slugify(input.slug) : slugify(String(values.name));
	if (!slug) throw new ValidationError('No se pudo derivar un slug válido.');

	const [existing] = await db.select().from(dogs).where(eq(dogs.slug, slug)).limit(1);
	if (existing) {
		throw new ValidationError(`Ya existe un perrito con el slug "${slug}".`);
	}

	const [row] = await db
		.insert(dogs)
		.values({ ...(values as typeof dogs.$inferInsert), slug })
		.returning();

	if (!row) throw new Error('No se pudo crear el perrito.');
	return toDog(row);
}

export async function updateDog(slug: string, input: DogInput): Promise<Dog | undefined> {
	const values = buildValues(input, true);
	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(dogs)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(dogs.slug, slug))
		.returning();

	return row ? toDog(row) : undefined;
}

export async function deleteDog(slug: string): Promise<boolean> {
	const deleted = await db.delete(dogs).where(eq(dogs.slug, slug)).returning({ id: dogs.id });
	return deleted.length > 0;
}

/** Reordena la manada según la lista de slugs recibida. */
export async function reorderDogs(slugs: string[]): Promise<Dog[]> {
	if (!Array.isArray(slugs) || slugs.some((s) => typeof s !== 'string')) {
		throw new ValidationError('Se esperaba una lista de slugs.');
	}

	await db.transaction(async (tx) => {
		for (let index = 0; index < slugs.length; index++) {
			await tx
				.update(dogs)
				.set({ sortOrder: index, updatedAt: new Date() })
				.where(eq(dogs.slug, slugs[index]!));
		}
	});

	return getAllDogs();
}
