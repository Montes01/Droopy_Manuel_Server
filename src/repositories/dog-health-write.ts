import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogAccessories, dogHealth, dogVaccines } from '../db/schema/index.js';
import type { DogAccessory, DogHealth, DogVaccine } from '../types.js';
import { toDogAccessory, toDogHealth, toDogVaccine } from './mappers.js';
import {
	ValidationError,
	optionalString,
	requireBooleanish,
	requireInt,
	requireNullableISODateAny,
	requireString
} from './validation.js';

/**
 * Escritura de la salud de la manada (panel de administración).
 *
 * Separado de `dog-health.ts` (solo lectura), como el resto de recursos. Cada
 * función recibe el slug del perrito dueño: la escritura siempre queda atada a
 * un perrito existente.
 */

/** Campos del bloque de salud (baños + veterinario anual). */
export interface DogHealthInput {
	lastBath?: string | null;
	nextBath?: string | null;
	vetVisitDone?: boolean;
	vetVisitDate?: string | null;
}

/** Campos de una vacuna. */
export interface DogVaccineInput {
	name?: string;
	applied?: boolean;
	appliedDate?: string | null;
	recommendation?: string;
	sortOrder?: number;
}

/** Campos de un accesorio. */
export interface DogAccessoryInput {
	label?: string;
	value?: string | null;
	provided?: boolean;
	sortOrder?: number;
}

/** Texto opcional: `undefined`/`null`/vacío → null; recorta y valida longitud. */
function nullableText(value: unknown, field: string, max: number): string | null {
	if (value === undefined || value === null) return null;
	const text = String(value).trim();
	if (text === '') return null;
	if (text.length > max) {
		throw new ValidationError(`El campo "${field}" no puede pasar de ${max} caracteres.`);
	}
	return text;
}

/**
 * Guarda (crea o actualiza) el bloque de salud de un perrito.
 *
 * Es 1:1: un solo registro por slug. Solo escribe los campos que vienen, así
 * el panel puede guardar unos pocos sin borrar el resto.
 */
export async function upsertDogHealth(
	dogSlug: string,
	input: DogHealthInput
): Promise<DogHealth> {
	const values: Partial<typeof dogHealth.$inferInsert> = {};

	if (input.lastBath !== undefined) {
		values.lastBath = requireNullableISODateAny(input.lastBath, 'lastBath');
	}
	if (input.nextBath !== undefined) {
		values.nextBath = requireNullableISODateAny(input.nextBath, 'nextBath');
	}
	if (input.vetVisitDone !== undefined) {
		values.vetVisitDone = requireBooleanish(input.vetVisitDone, 'vetVisitDone');
	}
	if (input.vetVisitDate !== undefined) {
		values.vetVisitDate = requireNullableISODateAny(input.vetVisitDate, 'vetVisitDate');
	}

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para guardar.');
	}

	const [row] = await db
		.insert(dogHealth)
		.values({ ...values, dogSlug })
		.onConflictDoUpdate({ target: dogHealth.dogSlug, set: { ...values, updatedAt: new Date() } })
		.returning();

	if (!row) throw new Error('No se pudo guardar la salud del perrito.');
	return toDogHealth(row);
}

/** Hoy en ISO (`YYYY-MM-DD`), en hora local del servidor. */
function todayISO(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}

/** Valores de una vacuna a partir de la entrada del panel. */
function buildVaccineValues(input: DogVaccineInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.name !== undefined) values.name = requireString(input.name, 'name', 120);
	if (!partial || input.applied !== undefined) {
		values.applied = requireBooleanish(input.applied, 'applied');
	}
	if (input.appliedDate !== undefined) {
		values.appliedDate = requireNullableISODateAny(input.appliedDate, 'appliedDate');
	}
	if (!partial || input.recommendation !== undefined) {
		values.recommendation = optionalString(input.recommendation, 'recommendation', 2000);
	}
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	// Una vacuna aplicada nunca queda con fecha futura: si la fecha aún no
	// llega, se guarda con la de hoy.
	if (
		values.applied === true &&
		typeof values.appliedDate === 'string' &&
		values.appliedDate > todayISO()
	) {
		values.appliedDate = todayISO();
	}

	return values;
}

export async function createDogVaccine(
	dogSlug: string,
	input: DogVaccineInput
): Promise<DogVaccine> {
	const values = buildVaccineValues(input, false);

	const [row] = await db
		.insert(dogVaccines)
		.values({ ...(values as typeof dogVaccines.$inferInsert), dogSlug })
		.returning();

	if (!row) throw new Error('No se pudo crear la vacuna.');
	return toDogVaccine(row);
}

export async function updateDogVaccine(
	dogSlug: string,
	id: number,
	input: DogVaccineInput
): Promise<DogVaccine | undefined> {
	const values = buildVaccineValues(input, true);
	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(dogVaccines)
		.set({ ...values, updatedAt: new Date() })
		.where(and(eq(dogVaccines.id, id), eq(dogVaccines.dogSlug, dogSlug)))
		.returning();

	return row ? toDogVaccine(row) : undefined;
}

export async function deleteDogVaccine(dogSlug: string, id: number): Promise<boolean> {
	const deleted = await db
		.delete(dogVaccines)
		.where(and(eq(dogVaccines.id, id), eq(dogVaccines.dogSlug, dogSlug)))
		.returning({ id: dogVaccines.id });
	return deleted.length > 0;
}

/** Valores de un accesorio a partir de la entrada del panel. */
function buildAccessoryValues(input: DogAccessoryInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.label !== undefined) {
		values.label = requireString(input.label, 'label', 120);
	}
	if (input.value !== undefined) values.value = nullableText(input.value, 'value', 160);
	if (!partial || input.provided !== undefined) {
		values.provided = requireBooleanish(input.provided, 'provided');
	}
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	return values;
}

export async function createDogAccessory(
	dogSlug: string,
	input: DogAccessoryInput
): Promise<DogAccessory> {
	const values = buildAccessoryValues(input, false);

	const [row] = await db
		.insert(dogAccessories)
		.values({ ...(values as typeof dogAccessories.$inferInsert), dogSlug })
		.returning();

	if (!row) throw new Error('No se pudo crear el accesorio.');
	return toDogAccessory(row);
}

export async function updateDogAccessory(
	dogSlug: string,
	id: number,
	input: DogAccessoryInput
): Promise<DogAccessory | undefined> {
	const values = buildAccessoryValues(input, true);
	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(dogAccessories)
		.set({ ...values, updatedAt: new Date() })
		.where(and(eq(dogAccessories.id, id), eq(dogAccessories.dogSlug, dogSlug)))
		.returning();

	return row ? toDogAccessory(row) : undefined;
}

export async function deleteDogAccessory(dogSlug: string, id: number): Promise<boolean> {
	const deleted = await db
		.delete(dogAccessories)
		.where(and(eq(dogAccessories.id, id), eq(dogAccessories.dogSlug, dogSlug)))
		.returning({ id: dogAccessories.id });
	return deleted.length > 0;
}
