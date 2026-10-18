import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { dogNewsKindEnum } from './enums.js';
import { dogs } from './dogs.js';

/**
 * Comunicados por perrito.
 *
 * Son las novedades que la comunidad ve en el perfil de un perrito: exámenes
 * pendientes, tratamientos en curso, cirugías… Cada fila pertenece a un solo
 * perrito (FK a `dogs.slug`) y el feed se ordena por `date`, más reciente
 * primero.
 *
 * `urgent` resalta lo que necesita ayuda. `photo` es opcional: null = sin
 * imagen. Al borrar el perrito, sus comunicados caen con él (`on delete
 * cascade`), igual que las relaciones de `news`.
 */
export const dogNews = pgTable(
	'dog_news',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		dogSlug: varchar('dog_slug', { length: 120 })
			.notNull()
			.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
		kind: dogNewsKindEnum('kind').notNull().default('general'),
		title: varchar('title', { length: 160 }).notNull(),
		body: text('body').notNull(),
		/** Fecha ISO (YYYY-MM-DD). Ordena el feed: más reciente primero. */
		date: varchar('date', { length: 10 }).notNull(),
		/** Fecha final del tratamiento (YYYY-MM-DD). null = sin cierre. */
		endDate: varchar('end_date', { length: 10 }),
		photo: varchar('photo', { length: 255 }),
		urgent: boolean('urgent').notNull().default(false),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('dog_news_dog_idx').on(table.dogSlug),
		index('dog_news_date_idx').on(table.date)
	]
);

export type DogNewsRow = typeof dogNews.$inferSelect;
export type NewDogNewsRow = typeof dogNews.$inferInsert;
