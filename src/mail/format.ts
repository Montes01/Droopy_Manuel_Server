import type { Cents } from '../types.js';

/**
 * Formato de dinero.
 *
 * Existe también en el frontend (`Front/src/lib/data/format.ts`) para pintar
 * precios sin esperar al servidor. Esta copia es para los correos, que se
 * componen aquí.
 */
export function formatCOP(cents: Cents): string {
	return '$' + Math.round(cents / 100).toLocaleString('es-CO');
}
