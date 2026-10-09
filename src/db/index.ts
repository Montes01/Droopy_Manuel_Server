import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

/**
 * Conexión a PostgreSQL.
 *
 * `DATABASE_URL` es obligatoria: si falta, preferimos fallar al arrancar y no
 * a mitad de una petición. El contenedor de desarrollo vive en el puerto 2121
 * (ver docker-compose.yml).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		'Falta DATABASE_URL. Copia .env.example a .env y ajusta la cadena de conexión.'
	);
}

/**
 * Cliente de bajo nivel.
 *
 * `max: 10` acota el pool; para pruebas se usa un valor menor. `onnotice` se
 * silencia porque Postgres avisa de cosas que no nos interesan (por ejemplo,
 * que una tabla ya existía).
 */
export const client = postgres(connectionString, {
	max: 10,
	onnotice: () => {}
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

/** Cierra el pool. Necesario en pruebas para que el proceso termine. */
export async function closeDb(): Promise<void> {
	await client.end();
}

export { schema };
