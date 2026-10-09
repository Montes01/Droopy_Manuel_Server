import { defineConfig } from 'drizzle-kit';

/**
 * Configuración de drizzle-kit: generación y aplicación de migraciones.
 *
 *   pnpm db:generate   genera SQL a partir del esquema
 *   pnpm db:migrate    aplica las migraciones pendientes
 *   pnpm db:push       sincroniza el esquema sin migración (solo desarrollo)
 *   pnpm db:studio     abre el explorador de datos
 */
const url = process.env.DATABASE_URL;

if (!url) {
	throw new Error('Falta DATABASE_URL. Copia .env.example a .env.');
}

export default defineConfig({
	schema: './src/db/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: true
});
