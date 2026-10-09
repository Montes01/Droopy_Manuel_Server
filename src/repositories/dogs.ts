import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dogs } from '../db/schema/index.js';
import type { Dog, DogStatus, PackView, Slug } from '../types.js';
import { toDog } from './mappers.js';

/**
 * Acceso a la manada.
 *
 * Devuelve los mismos objetos que el módulo en memoria anterior, así que las
 * rutas y el frontend no cambian.
 */

/**
 * Orden estable de la manada: primero los que tienen orden fijado en el panel,
 * y a igualdad de orden por fecha de llegada.
 */
const DOG_ORDER = [asc(dogs.sortOrder), asc(dogs.id)];

export async function getAllDogs(): Promise<Dog[]> {
	const rows = await db.select().from(dogs).orderBy(...DOG_ORDER);
	return rows.map(toDog);
}

export async function getDog(slug: Slug): Promise<Dog | undefined> {
	const [row] = await db.select().from(dogs).where(eq(dogs.slug, slug)).limit(1);
	return row ? toDog(row) : undefined;
}

export async function getDogsBySlugs(slugs: readonly Slug[]): Promise<Dog[]> {
	if (slugs.length === 0) return [];
	const rows = await db.select().from(dogs).where(inArray(dogs.slug, [...slugs]));

	// `inArray` no conserva el orden pedido: lo restauramos en memoria.
	const bySlug = new Map(rows.map((row) => [row.slug, toDog(row)]));
	return slugs
		.map((slug) => bySlug.get(slug))
		.filter((dog): dog is Dog => dog !== undefined);
}

export async function getFeaturedDogs(): Promise<Dog[]> {
	const rows = await db
		.select()
		.from(dogs)
		.where(eq(dogs.featured, true))
		.orderBy(...DOG_ORDER);
	return rows.map(toDog);
}

export async function getDogsByStatus(status: DogStatus): Promise<Dog[]> {
	const rows = await db.select().from(dogs).where(eq(dogs.status, status)).orderBy(...DOG_ORDER);
	return rows.map(toDog);
}

/**
 * Slugs de la manada viva, en orden de presentación.
 *
 * Sigue siendo una selección curada: son los que aparecen en /manada, no todos
 * los que están en adopción. Se resuelve con la columna `sort_order` para que
 * el panel pueda reordenarlos.
 */
const ALIVE_PACK_SLUGS: Slug[] = ['toby', 'luna', 'thor', 'chiquis'];

export async function getAlivePack(): Promise<Dog[]> {
	return getDogsBySlugs(ALIVE_PACK_SLUGS);
}

/**
 * La manada en el cielo.
 *
 * Derivada de `status`, no de una lista: un perrito marcado como `en-memoria`
 * aparece aquí siempre.
 */
export async function getHeavenPack(): Promise<Dog[]> {
	return getDogsByStatus('en-memoria');
}

export async function getPack(view: PackView): Promise<Dog[]> {
	return view === 'heaven' ? getHeavenPack() : getAlivePack();
}

/** Slugs de la manada viva, para reusar en donaciones. */
export function alivePackSlugs(): readonly Slug[] {
	return ALIVE_PACK_SLUGS;
}
