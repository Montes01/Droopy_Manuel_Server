import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { dogs } from './dogs.js';

/**
 * Salud de un perrito: baños y visita anual.
 *
 * Es 1:1 con `dogs` (la PK es el slug). No existe fila separada «vacía»: si el
 * perrito no tiene datos, la fila puede faltar y la web simplemente no muestra
 * la sección.
 */
export const dogHealth = pgTable('dog_health', {
	dogSlug: varchar('dog_slug', { length: 120 })
		.primaryKey()
		.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
	/** Último baño integral (YYYY-MM-DD). Null = sin dato. */
	lastBath: varchar('last_bath', { length: 10 }),
	/** Próximo baño integral (YYYY-MM-DD). Null = sin dato. */
	nextBath: varchar('next_bath', { length: 10 }),
	/** true = ya se hizo la visita anual del veterinario. */
	vetVisitDone: boolean('vet_visit_done').notNull().default(false),
	/** Fecha de la visita anual (hecha o agendada). Null = sin dato. */
	vetVisitDate: varchar('vet_visit_date', { length: 10 }),

	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Vacunas por perrito.
 *
 * Cada fila es una vacuna con su estado (aplicada o pendiente) y una
 * recomendación de texto libre: la indicación que ve la comunidad. Al borrar el
 * perrito caen con él (`on delete cascade`).
 */
export const dogVaccines = pgTable(
	'dog_vaccines',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		dogSlug: varchar('dog_slug', { length: 120 })
			.notNull()
			.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
		name: varchar('name', { length: 120 }).notNull(),
		applied: boolean('applied').notNull().default(false),
		appliedDate: varchar('applied_date', { length: 10 }),
		/** Recomendación/indicación visible. */
		recommendation: text('recommendation').notNull().default(''),
		sortOrder: integer('sort_order').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('dog_vaccines_dog_idx').on(table.dogSlug)]
);

/**
 * Accesorios y elementos de seguridad por perrito.
 *
 * `provided` distingue lo que ya tiene de lo que le falta; `value` es una nota
 * libre (talla, color, estado…). Igual que las vacunas, caen con el perrito.
 */
export const dogAccessories = pgTable(
	'dog_accessories',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		dogSlug: varchar('dog_slug', { length: 120 })
			.notNull()
			.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
		label: varchar('label', { length: 120 }).notNull(),
		value: varchar('value', { length: 160 }),
		/** true = lo tiene; false = le falta. */
		provided: boolean('provided').notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('dog_accessories_dog_idx').on(table.dogSlug)]
);

export type DogHealthRow = typeof dogHealth.$inferSelect;
export type NewDogHealthRow = typeof dogHealth.$inferInsert;
export type DogVaccineRow = typeof dogVaccines.$inferSelect;
export type NewDogVaccineRow = typeof dogVaccines.$inferInsert;
export type DogAccessoryRow = typeof dogAccessories.$inferSelect;
export type NewDogAccessoryRow = typeof dogAccessories.$inferInsert;
