import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { dogEnergyEnum, dogSexEnum, dogSizeEnum, dogStatusEnum } from './enums.js';

/**
 * Perritos de la fundación.
 *
 * `goodWith*` estaba anidado en el tipo del dominio (`goodWith: {kids, dogs,
 * cats}`); aquí se aplana en tres columnas porque en SQL no aporta nada
 * anidarlo, y el repositorio lo vuelve a componer al responder.
 *
 * `featured` decide si aparece en la portada. `sortOrder` permite fijar el
 * orden manualmente en el panel en vez de depender del id.
 */
export const dogs = pgTable(
	'dogs',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: varchar('slug', { length: 120 }).notNull().unique(),

		name: varchar('name', { length: 120 }).notNull(),
		breed: varchar('breed', { length: 120 }).notNull(),
		/** Fecha de nacimiento estimada (YYYY-MM-DD). Null si no se conoce. */
		birthDate: varchar('birth_date', { length: 10 }),
		/** true = edad aproximada de la fundación (por ejemplo, edad de rescate sin fecha exacta). */
		isApprox: boolean('is_approx').notNull().default(false),
		sex: dogSexEnum('sex').notNull(),
		size: dogSizeEnum('size').notNull(),
		energy: dogEnergyEnum('energy').notNull(),

		goodWithKids: boolean('good_with_kids').notNull().default(false),
		goodWithDogs: boolean('good_with_dogs').notNull().default(false),
		goodWithCats: boolean('good_with_cats').notNull().default(false),

		sterilized: boolean('sterilized').notNull().default(false),
		status: dogStatusEnum('status').notNull(),

		/** Fecha de llegada a la fundación (YYYY-MM-DD como date). */
		arrival: varchar('arrival', { length: 10 }).notNull(),

		traits: text('traits').array().notNull().default([]),
		story: text('story').notNull(),
		/** Ruta en el static del frontend, o null si aún no hay foto. */
		photo: varchar('photo', { length: 255 }),

		/**
		 * Color principal en hex (`#rrggbb`), o null = marrón de la marca.
		 * Opcional para no obligar a reeditar la manada existente.
		 */
		color: varchar('color', { length: 7 }),

		featured: boolean('featured').notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('dogs_status_idx').on(table.status),
		index('dogs_featured_idx').on(table.featured),
		index('dogs_sort_idx').on(table.sortOrder)
	]
);

export type DogRow = typeof dogs.$inferSelect;
export type NewDogRow = typeof dogs.$inferInsert;
