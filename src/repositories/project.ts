import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projectSections } from '../db/schema/index.js';
import type { ProjectSection } from '../types.js';
import { toProjectSection } from './mappers.js';

/**
 * Lectura de las secciones de la página `/project`.
 *
 * El orden lo da `position`: el frontend las muestra en ese orden sin
 * reordenar nada por su cuenta.
 */
export async function getProjectSections(): Promise<ProjectSection[]> {
	const rows = await db
		.select()
		.from(projectSections)
		.orderBy(asc(projectSections.position), asc(projectSections.id));
	return rows.map(toProjectSection);
}

export async function getProjectSection(id: number): Promise<ProjectSection | undefined> {
	const [row] = await db.select().from(projectSections).where(eq(projectSections.id, id)).limit(1);
	return row ? toProjectSection(row) : undefined;
}
