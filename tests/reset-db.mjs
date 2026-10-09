/**
 * Restaura el catálogo a su estado inicial.
 *
 * Con la base de datos, las pruebas dejan de ser idempotentes: crear pedidos
 * descuenta stock, así que una segunda ejecución encuentra otros números. Este
 * script vuelve a sembrar el contenido y borra los pedidos de prueba, para que
 * cada corrida parta del mismo punto.
 *
 *   node --env-file=.env tests/reset-db.mjs
 */
import { closeDb, db } from '../dist/db/index.js';
import { orderLines, orders } from '../dist/db/schema/index.js';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, '..');

async function main() {
	// Borra pedidos y líneas (el seed no los toca: son datos de uso, no contenido).
	await db.delete(orderLines);
	await db.delete(orders);

	// Vuelve a sembrar el contenido, que también restaura el stock.
	execFileSync(process.execPath, [join(serverRoot, 'dist', 'db', 'seed.js')], {
		stdio: 'ignore',
		env: process.env
	});
}

try {
	await main();
	console.log('Base restaurada: pedidos borrados y catálogo resembrado.');
} catch (error) {
	console.error('No se pudo restaurar la base:', error);
	process.exitCode = 1;
} finally {
	await closeDb();
}
