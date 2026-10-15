import { and, asc, desc, eq, gt, gte, lt, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projectSections } from '../db/schema/index.js';
import type { ProjectSection, ProjectSectionKind } from '../types.js';
import { PROJECT_SECTION_KINDS } from '../types.js';
import { toProjectSection } from './mappers.js';
import {
	ValidationError,
	requireEnum,
	requireInt,
	requireString,
	requireStringArray
} from './validation.js';

/**
 * Escritura de las secciones de la página `/project` (panel de administración).
 *
 * `position` es único pero modificable: al crear o mover una sección a una
 * posición ocupada, las demás se recorren (insertar en N empuja N, N+1… una
 * más abajo). Los corrimientos se hacen fila por fila dentro de una
 * transacción, de mayor a menor al subir y de menor a mayor al bajar, para no
 * chocar con la restricción de unicidad a mitad de camino.
 */

/** Transacción de drizzle, para los corrimientos de posición. */
type ProjectTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Campos que acepta el panel al crear o editar una sección. */
export interface ProjectSectionInput {
	position?: number;
	kind?: ProjectSectionKind;
	/** Título visible. `null` o vacío = sin encabezado. */
	title?: string | null;
	/** Párrafos en texto plano. `**negrita**` es el único formato. */
	body?: string[];
}

/** Título opcional: ausente o vacío se guarda como NULL (sin encabezado). */
function optionalTitle(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const text = String(value).trim();
	if (text === '') return null;
	return requireString(text, 'title', 255);
}

/** Valida título y cuerpo según la clase efectiva de la sección. */
function buildValues(input: ProjectSectionInput, partial: boolean, effectiveKind?: ProjectSectionKind) {
	const values: {
		kind?: ProjectSectionKind;
		title?: string | null;
		body?: string[];
		position?: number;
	} = {};

	const kind =
		!partial || input.kind !== undefined
			? requireEnum(input.kind, [...PROJECT_SECTION_KINDS], 'kind')
			: effectiveKind;
	if (kind !== undefined) values.kind = kind;

	if (!partial || input.title !== undefined) {
		values.title = optionalTitle(input.title);
	}

	if (!partial || input.body !== undefined) {
		// Al crear, el cuerpo ausente (portada sin texto) equivale a vacío: la
		// regla de mínimo un párrafo lo acepta solo para `hero`.
		const body = input.body === undefined ? [] : requireStringArray(input.body, 'body');
		// El héroe es solo el titular: el resto necesita al menos un párrafo.
		if (kind !== 'hero' && body.length === 0) {
			throw new ValidationError('El campo "body" debe tener al menos un párrafo.');
		}
		if (kind === undefined) {
			throw new ValidationError('Falta la clase de la sección ("kind").');
		}
		values.body = body;
	}

	return values;
}

/** Sube una posición a las filas con `position >= from` (de mayor a menor). */
async function shiftUp(tx: ProjectTx, from: number): Promise<void> {
	const rows = await tx
		.select({ id: projectSections.id, position: projectSections.position })
		.from(projectSections)
		.where(gte(projectSections.position, from))
		.orderBy(desc(projectSections.position));
	for (const row of rows) {
		await tx
			.update(projectSections)
			.set({ position: row.position + 1, updatedAt: new Date() })
			.where(eq(projectSections.id, row.id));
	}
}

/**
 * Mueve el hueco de `oldPosition` a `newPosition`.
 *
 * Debe correrse antes de escribir la nueva posición de la sección movida.
 */
async function moveGap(tx: ProjectTx, oldPosition: number, newPosition: number): Promise<void> {
	if (newPosition < oldPosition) {
		// Sube: las filas [newPosition, oldPosition) suben un puesto.
		const rows = await tx
			.select({ id: projectSections.id, position: projectSections.position })
			.from(projectSections)
			.where(
				and(gte(projectSections.position, newPosition), lt(projectSections.position, oldPosition))
			)
			.orderBy(desc(projectSections.position));
		for (const row of rows) {
			await tx
				.update(projectSections)
				.set({ position: row.position + 1, updatedAt: new Date() })
				.where(eq(projectSections.id, row.id));
		}
	} else {
		// Baja: las filas (oldPosition, newPosition] bajan un puesto.
		const rows = await tx
			.select({ id: projectSections.id, position: projectSections.position })
			.from(projectSections)
			.where(
				and(gt(projectSections.position, oldPosition), lte(projectSections.position, newPosition))
			)
			.orderBy(asc(projectSections.position));
		for (const row of rows) {
			await tx
				.update(projectSections)
				.set({ position: row.position - 1, updatedAt: new Date() })
				.where(eq(projectSections.id, row.id));
		}
	}
}

export async function createProjectSection(input: ProjectSectionInput): Promise<ProjectSection> {
	const values = buildValues(input, false);
	// Sin `partial`, clase y cuerpo siempre vienen validados: esto es red de
	// seguridad para el tipado del `insert`.
	if (values.kind === undefined || values.body === undefined) {
		throw new ValidationError('El campo "kind" es obligatorio.');
	}
	const { kind, body } = values;

	return db.transaction(async (tx) => {
		let position: number;
		if (input.position === undefined) {
			// Sin posición: al final.
			const [top] = await tx
				.select({ position: projectSections.position })
				.from(projectSections)
				.orderBy(desc(projectSections.position))
				.limit(1);
			position = (top?.position ?? 0) + 1;
		} else {
			// Con posición ocupada: se inserta ahí y el resto se recorre.
			position = requireInt(input.position, 'position', 1);
			await shiftUp(tx, position);
		}

		const [row] = await tx
			.insert(projectSections)
			.values({ kind, title: values.title ?? null, body, position })
			.returning();

		if (!row) throw new Error('No se pudo crear la sección.');
		return toProjectSection(row);
	});
}

export async function updateProjectSection(
	id: number,
	input: ProjectSectionInput
): Promise<ProjectSection | undefined> {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select()
			.from(projectSections)
			.where(eq(projectSections.id, id))
			.limit(1);
		if (!current) return undefined;

		const values = buildValues(input, true, current.kind);
		// La clase o el cuerpo pueden venir de antes: el resultado efectivo
		// también debe cumplir (un capítulo sin párrafos quedaría vacío).
		const effectiveKind = values.kind ?? current.kind;
		const effectiveBody = values.body ?? current.body;
		if (effectiveKind !== 'hero' && effectiveBody.length === 0) {
			throw new ValidationError('El campo "body" debe tener al menos un párrafo.');
		}
		if (input.position !== undefined) {
			const next = requireInt(input.position, 'position', 1);
			if (next !== current.position) {
				await moveGap(tx, current.position, next);
				values.position = next;
			}
		}

		if (Object.keys(values).length === 0) {
			throw new ValidationError('No se envió ningún campo para actualizar.');
		}

		const [row] = await tx
			.update(projectSections)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(projectSections.id, id))
			.returning();

		return row ? toProjectSection(row) : undefined;
	});
}

export async function deleteProjectSection(id: number): Promise<boolean> {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ position: projectSections.position })
			.from(projectSections)
			.where(eq(projectSections.id, id))
			.limit(1);
		if (!current) return false;

		await tx.delete(projectSections).where(eq(projectSections.id, id));

		// Se cierra el hueco: las que estaban encima bajan un puesto.
		const following = await tx
			.select({ id: projectSections.id, position: projectSections.position })
			.from(projectSections)
			.where(gt(projectSections.position, current.position))
			.orderBy(asc(projectSections.position));
		for (const row of following) {
			await tx
				.update(projectSections)
				.set({ position: row.position - 1, updatedAt: new Date() })
				.where(eq(projectSections.id, row.id));
		}

		return true;
	});
}
