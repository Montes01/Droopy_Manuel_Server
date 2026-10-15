import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { projectSectionKindEnum } from './enums.js';

/**
 * Secciones editables de la página `/project`.
 *
 * Una sola tabla sin relaciones: cada fila trae su `position` (único, pero
 * modificable desde el panel; el repositorio recorre las demás al mover) y el
 * frontend las ordena por ese campo. `title` nulo = sin encabezado visible.
 * `body` son párrafos en texto plano; `**negrita**` es el único formato.
 */
export const projectSections = pgTable('project_sections', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	position: integer('position').notNull().unique(),
	kind: projectSectionKindEnum('kind').notNull(),
	title: varchar('title', { length: 255 }),
	body: text('body').array().notNull().default([]),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type ProjectSectionRow = typeof projectSections.$inferSelect;
export type NewProjectSectionRow = typeof projectSections.$inferInsert;
