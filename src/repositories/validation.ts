/**
 * Validación compartida por las capas de escritura del panel.
 *
 * Vivía duplicada dentro de `dogs-write.ts`; se extrajo aquí para que las
 * reglas (obligatorio, longitud máxima, entero no negativo) sean idénticas en
 * todos los recursos.
 */

/** Error de validación: se traduce a un 400 en la ruta. */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/** Convierte texto libre en slug: «Chiquis » → «chiquis». */
export function slugify(value: string): string {
	return value
		.normalize('NFD')
		// Quita los diacríticos: «juguetón» → «jugueton».
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function requireString(value: unknown, field: string, max = 255): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new ValidationError(`El campo "${field}" es obligatorio.`);
	}
	if (value.length > max) {
		throw new ValidationError(`El campo "${field}" no puede pasar de ${max} caracteres.`);
	}
	return value.trim();
}

export function requireEnum<T extends string>(value: unknown, allowed: T[], field: string): T {
	if (typeof value !== 'string' || !allowed.includes(value as T)) {
		throw new ValidationError(`El campo "${field}" debe ser uno de: ${allowed.join(', ')}.`);
	}
	return value as T;
}

export function requireInt(value: unknown, field: string, min = 0): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
		throw new ValidationError(
			`El campo "${field}" debe ser un entero mayor o igual a ${min}.`
		);
	}
	return value;
}

export function requireStringArray(value: unknown, field: string): string[] {
	if (!Array.isArray(value)) {
		throw new ValidationError(`El campo "${field}" debe ser una lista.`);
	}
	return value.map((entry) => String(entry).trim()).filter(Boolean);
}

/** Fecha ISO sencilla (YYYY-MM-DD). */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
