import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogAccessories, dogHealth, dogVaccines } from '../db/schema/index.js';
import type { DogAccessory, DogHealth, DogHealthProfile, DogVaccine, Slug } from '../types.js';
import { toDogAccessory, toDogHealth, toDogVaccine } from './mappers.js';

/**
 * Lectura de la salud de un perrito: baños, vacunas y accesorios.
 *
 * Son tres tablas separadas; el perfil las compone en una sola respuesta para
 * que el modal haga una única llamada. El orden de las listas es el fijado en
 * el panel (`sort_order`) y, a igualdad, por id.
 */

/** La fila de salud (baños + veterinario), o `null` si el perrito no tiene. */
export async function getDogHealth(dogSlug: Slug): Promise<DogHealth | null> {
	const [row] = await db.select().from(dogHealth).where(eq(dogHealth.dogSlug, dogSlug)).limit(1);
	return row ? toDogHealth(row) : null;
}

/** Las vacunas de un perrito, en el orden del panel. */
export async function getDogVaccines(dogSlug: Slug): Promise<DogVaccine[]> {
	const rows = await db
		.select()
		.from(dogVaccines)
		.where(eq(dogVaccines.dogSlug, dogSlug))
		.orderBy(asc(dogVaccines.sortOrder), asc(dogVaccines.id));
	return rows.map(toDogVaccine);
}

/** Los accesorios de un perrito, en el orden del panel. */
export async function getDogAccessories(dogSlug: Slug): Promise<DogAccessory[]> {
	const rows = await db
		.select()
		.from(dogAccessories)
		.where(eq(dogAccessories.dogSlug, dogSlug))
		.orderBy(asc(dogAccessories.sortOrder), asc(dogAccessories.id));
	return rows.map(toDogAccessory);
}

/** Una vacuna concreta de un perrito, o `undefined`. */
export async function getDogVaccineItem(
	dogSlug: Slug,
	id: number
): Promise<DogVaccine | undefined> {
	const [row] = await db
		.select()
		.from(dogVaccines)
		.where(and(eq(dogVaccines.dogSlug, dogSlug), eq(dogVaccines.id, id)))
		.limit(1);
	return row ? toDogVaccine(row) : undefined;
}

/** Un accesorio concreto de un perrito, o `undefined`. */
export async function getDogAccessoryItem(
	dogSlug: Slug,
	id: number
): Promise<DogAccessory | undefined> {
	const [row] = await db
		.select()
		.from(dogAccessories)
		.where(and(eq(dogAccessories.dogSlug, dogSlug), eq(dogAccessories.id, id)))
		.limit(1);
	return row ? toDogAccessory(row) : undefined;
}

/** El perfil de salud de un perrito: salud + vacunas + accesorios. */
export async function getDogHealthProfile(dogSlug: Slug): Promise<DogHealthProfile> {
	const [health, vaccines, accessories] = await Promise.all([
		getDogHealth(dogSlug),
		getDogVaccines(dogSlug),
		getDogAccessories(dogSlug)
	]);
	return { dogSlug, health, vaccines, accessories };
}

/**
 * Todos los perfiles con algún dato, uno por perrito.
 *
 * Solo aparecen los perritos que tienen fila de salud, vacunas o accesorios:
 * el panel agrupa por slug y quienes no aparecen simplemente no tienen nada.
 */
export async function getAllDogHealthProfiles(): Promise<DogHealthProfile[]> {
	const [healthRows, vaccineRows, accessoryRows] = await Promise.all([
		db.select().from(dogHealth),
		db
			.select()
			.from(dogVaccines)
			.orderBy(asc(dogVaccines.sortOrder), asc(dogVaccines.id)),
		db
			.select()
			.from(dogAccessories)
			.orderBy(asc(dogAccessories.sortOrder), asc(dogAccessories.id))
	]);

	const bySlug = new Map<string, DogHealthProfile>();
	const ensure = (slug: string): DogHealthProfile => {
		let profile = bySlug.get(slug);
		if (!profile) {
			profile = { dogSlug: slug, health: null, vaccines: [], accessories: [] };
			bySlug.set(slug, profile);
		}
		return profile;
	};

	for (const row of healthRows) ensure(row.dogSlug).health = toDogHealth(row);
	for (const row of vaccineRows) ensure(row.dogSlug).vaccines.push(toDogVaccine(row));
	for (const row of accessoryRows) ensure(row.dogSlug).accessories.push(toDogAccessory(row));

	return [...bySlug.values()];
}
