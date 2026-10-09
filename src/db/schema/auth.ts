import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { adminRoleEnum } from './enums.js';

/**
 * Personas con acceso al panel.
 *
 * `role` se decide ahora aunque hoy haya una sola persona: añadirlo después
 * obliga a migrar datos vivos. Un `editor` puede corregir contenido; solo un
 * `admin` puede borrar o gestionar otras cuentas.
 */
export const adminUsers = pgTable('admin_users', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	/** Hash bcrypt. Nunca se guarda la contraseña en claro. */
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	name: varchar('name', { length: 160 }).notNull(),
	role: adminRoleEnum('role').notNull().default('editor'),
	active: boolean('active').notNull().default(true),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Sesiones del panel.
 *
 * Sesiones opacas en base de datos en vez de JWT: así se puede cerrar sesión
 * de inmediato (borrar la fila) y revocar a una persona concreta. Un JWT
 * seguiría siendo válido hasta caducar.
 *
 * Se guarda el hash del token, no el token: si alguien lee la tabla, no puede
 * suplantar una sesión activa.
 */
export const adminSessions = pgTable(
	'admin_sessions',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
		userId: integer('user_id')
			.notNull()
			.references(() => adminUsers.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		/** Contexto para auditoría: desde dónde se abrió la sesión. */
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('admin_sessions_user_idx').on(table.userId),
		index('admin_sessions_expires_idx').on(table.expiresAt)
	]
);

/**
 * Registro de cambios del panel.
 *
 * Con varias personas editando, «quién cambió esto» es la primera pregunta.
 * Se guarda el diff mínimo necesario para reconstruir qué pasó.
 */
export const adminAuditLog = pgTable(
	'admin_audit_log',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		userId: integer('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
		/** Tabla afectada: 'dogs', 'shop_items'… */
		entity: varchar('entity', { length: 60 }).notNull(),
		/** Clave del registro afectado (slug o id). */
		entityKey: varchar('entity_key', { length: 160 }).notNull(),
		action: varchar('action', { length: 20 }).notNull(),
		/** Valores anteriores y nuevos, para poder auditar. */
		before: text('before'),
		after: text('after'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('admin_audit_entity_idx').on(table.entity, table.entityKey),
		index('admin_audit_created_idx').on(table.createdAt)
	]
);

export type AdminUserRow = typeof adminUsers.$inferSelect;
export type NewAdminUserRow = typeof adminUsers.$inferInsert;
export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type AdminAuditLogRow = typeof adminAuditLog.$inferSelect;
