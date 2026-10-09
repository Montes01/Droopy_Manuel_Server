import { and, desc, eq, gt, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { adminAuditLog, adminSessions, adminUsers } from '../db/schema/index.js';
import type { AdminRole } from '../types.js';
import {
	generateSessionToken,
	hashPassword,
	hashSessionToken,
	verifyPassword
} from '../auth/crypto.js';

/**
 * Cuentas y sesiones del panel.
 *
 * Separado de `repositories/` para dejar claro que esto es infraestructura de
 * acceso, no contenido de la fundación.
 */

/** Duración de una sesión: 7 días. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminUser {
	id: number;
	email: string;
	name: string;
	role: AdminRole;
	active: boolean;
	lastLoginAt: Date | null;
}

function toAdminUser(row: typeof adminUsers.$inferSelect): AdminUser {
	return {
		id: row.id,
		email: row.email,
		name: row.name,
		role: row.role,
		active: row.active,
		lastLoginAt: row.lastLoginAt
	};
}

export async function findUserByEmail(
	email: string
): Promise<(AdminUser & { passwordHash: string }) | undefined> {
	const [row] = await db
		.select()
		.from(adminUsers)
		.where(eq(adminUsers.email, email.toLowerCase().trim()))
		.limit(1);

	if (!row) return undefined;
	return { ...toAdminUser(row), passwordHash: row.passwordHash };
}

export async function getUserById(id: number): Promise<AdminUser | undefined> {
	const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
	return row ? toAdminUser(row) : undefined;
}

export async function listUsers(): Promise<AdminUser[]> {
	const rows = await db.select().from(adminUsers).orderBy(adminUsers.id);
	return rows.map(toAdminUser);
}

export async function createUser(input: {
	email: string;
	password: string;
	name: string;
	role: AdminRole;
}): Promise<AdminUser> {
	const [row] = await db
		.insert(adminUsers)
		.values({
			email: input.email.toLowerCase().trim(),
			passwordHash: await hashPassword(input.password),
			name: input.name.trim(),
			role: input.role
		})
		.returning();

	if (!row) throw new Error('No se pudo crear el usuario.');
	return toAdminUser(row);
}

/**
 * Crea el usuario si no existe, o le actualiza la contraseña si ya está.
 *
 * Pensado para el arranque y para los scripts: permite provisionar la primera
 * cuenta administradora desde variables de entorno sin duplicarla al reiniciar.
 */
export async function upsertUser(input: {
	email: string;
	password: string;
	name: string;
	role: AdminRole;
}): Promise<AdminUser> {
	const existing = await findUserByEmail(input.email);

	if (!existing) return createUser(input);

	await db
		.update(adminUsers)
		.set({
			passwordHash: await hashPassword(input.password),
			name: input.name.trim(),
			role: input.role,
			active: true,
			updatedAt: new Date()
		})
		.where(eq(adminUsers.id, existing.id));

	const updated = await getUserById(existing.id);
	if (!updated) throw new Error('No se pudo actualizar el usuario.');
	return updated;
}

/** Comprueba una contraseña contra el hash guardado de un correo. */
export async function verifyPasswordOf(email: string, password: string): Promise<boolean> {
	const found = await findUserByEmail(email);
	if (!found) return false;
	return verifyPassword(password, found.passwordHash);
}

export async function updateUserPassword(userId: number, password: string): Promise<void> {
	await db
		.update(adminUsers)
		.set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
		.where(eq(adminUsers.id, userId));
}

/**
 * Verifica credenciales y abre una sesión.
 *
 * Devuelve el token en claro (para la cookie) y el usuario. Si las credenciales
 * fallan devuelve undefined, sin distinguir entre «no existe» y «contraseña
 * mal»: eso evita enumerar cuentas.
 */
export async function login(
	email: string,
	password: string,
	userAgent?: string
): Promise<{ token: string; user: AdminUser } | undefined> {
	const found = await findUserByEmail(email);
	if (!found || !found.active) return undefined;

	const ok = await verifyPassword(password, found.passwordHash);
	if (!ok) return undefined;

	const token = generateSessionToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await db.insert(adminSessions).values({
		tokenHash: hashSessionToken(token),
		userId: found.id,
		expiresAt,
		userAgent: userAgent ?? null
	});

	await db
		.update(adminUsers)
		.set({ lastLoginAt: new Date() })
		.where(eq(adminUsers.id, found.id));

	const { passwordHash: _passwordHash, ...user } = found;
	return { token, user: { ...user, lastLoginAt: new Date() } };
}

/** Resuelve una sesión por su token, si sigue vigente. */
export async function resolveSession(token: string): Promise<AdminUser | undefined> {
	const [row] = await db
		.select({ user: adminUsers })
		.from(adminSessions)
		.innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
		.where(
			and(
				eq(adminSessions.tokenHash, hashSessionToken(token)),
				gt(adminSessions.expiresAt, new Date()),
				eq(adminUsers.active, true)
			)
		)
		.limit(1);

	return row ? toAdminUser(row.user) : undefined;
}

/** Cierra una sesión concreta. */
export async function logout(token: string): Promise<void> {
	await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)));
}

/** Cierra todas las sesiones de una persona (al cambiar contraseña, por ejemplo). */
export async function logoutAll(userId: number): Promise<void> {
	await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}

/** Limpia sesiones caducadas. Se puede llamar al arrancar. */
export async function purgeExpiredSessions(): Promise<number> {
	const deleted = await db
		.delete(adminSessions)
		.where(lt(adminSessions.expiresAt, new Date()))
		.returning({ id: adminSessions.id });
	return deleted.length;
}

/** Lista sesiones activas, para que una persona pueda revisarlas. */
export async function listSessions(userId: number) {
	return db
		.select({
			id: adminSessions.id,
			createdAt: adminSessions.createdAt,
			expiresAt: adminSessions.expiresAt,
			userAgent: adminSessions.userAgent
		})
		.from(adminSessions)
		.where(and(eq(adminSessions.userId, userId), gt(adminSessions.expiresAt, new Date())))
		.orderBy(desc(adminSessions.createdAt));
}

/**
 * Registra un cambio en el log de auditoría.
 *
 * No debe romper la operación principal: si el log falla, se avisa pero no se
 * propaga el error.
 */
export async function recordAudit(input: {
	userId?: number;
	entity: string;
	entityKey: string;
	action: 'crear' | 'editar' | 'borrar';
	before?: unknown;
	after?: unknown;
}): Promise<void> {
	try {
		await db.insert(adminAuditLog).values({
			userId: input.userId ?? null,
			entity: input.entity,
			entityKey: input.entityKey,
			action: input.action,
			before: input.before === undefined ? null : JSON.stringify(input.before),
			after: input.after === undefined ? null : JSON.stringify(input.after)
		});
	} catch (error) {
		console.error('[audit] no se pudo registrar el cambio:', error);
	}
}

export async function listAudit(limit = 50) {
	return db
		.select({
			id: adminAuditLog.id,
			userId: adminAuditLog.userId,
			entity: adminAuditLog.entity,
			entityKey: adminAuditLog.entityKey,
			action: adminAuditLog.action,
			createdAt: adminAuditLog.createdAt
		})
		.from(adminAuditLog)
		.orderBy(desc(adminAuditLog.createdAt))
		.limit(limit);
}
