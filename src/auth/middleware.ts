import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '../types.js';
import { safeEqual } from './crypto.js';
import { resolveSession } from './users.js';
import { forbidden, unauthorized } from '../routes/helpers.js';

/**
 * Control de acceso al panel.
 *
 * Dos estrategias conviven a propósito:
 *
 *  1. **Sesión** (personas): cookie `dm_session` con un token opaco guardado en
 *     la base. Se puede cerrar sesión de inmediato y saber quién hizo qué.
 *  2. **Token de entorno** (scripts y CI): cabecera `x-admin-token` comparada
 *     con `ADMIN_TOKEN`. No identifica a nadie, así que solo se permite cuando
 *     no hay alternativa; queda registrado como «script».
 *
 * Todo endpoint de escritura pasa por aquí, de modo que cambiar de estrategia
 * es un cambio en este archivo y no en cada ruta.
 */

export const SESSION_COOKIE = 'dm_session';

/** Nombre bajo el que se identifica un acceso por token de entorno. */
export const SCRIPT_ACTOR_ID = 0;

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			/** Persona autenticada, o undefined si entró por token de script. */
			adminUser?: { id: number; email: string; name: string; role: AdminRole };
			/** Origen de la autenticación, para el log de auditoría. */
			adminSource?: 'session' | 'token';
		}
	}
}

/** Lee el token de sesión de la cookie, sin depender de cookie-parser. */
function readSessionCookie(req: Request): string | undefined {
	const header = req.headers.cookie;
	if (!header) return undefined;

	for (const part of header.split(';')) {
		const [name, ...rest] = part.trim().split('=');
		if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
	}
	return undefined;
}

/** Lee el token de entorno de la cabecera. */
function readHeaderToken(req: Request): string | undefined {
	const raw = req.headers['x-admin-token'];
	return typeof raw === 'string' && raw !== '' ? raw : undefined;
}

/** Comprueba el token de entorno, si está configurado. */
function isValidScriptToken(token: string): boolean {
	const expected = process.env.ADMIN_TOKEN;
	// Si no hay token configurado, esta vía está deshabilitada: no queremos un
	// acceso de emergencia abierto por olvido.
	if (!expected || expected.length < 16) return false;
	return safeEqual(token, expected);
}

/**
 * Resuelve quién hace la petición. Devuelve la fuente y el usuario (si aplica),
 * o null si no hay credencial válida.
 */
async function authenticate(
	req: Request
): Promise<{ source: 'session' | 'token'; user?: Express.Request['adminUser'] } | null> {
	const sessionToken = readSessionCookie(req);
	if (sessionToken) {
		const user = await resolveSession(sessionToken);
		if (user) {
			return {
				source: 'session',
				user: { id: user.id, email: user.email, name: user.name, role: user.role }
			};
		}
	}

	const headerToken = readHeaderToken(req);
	if (headerToken && isValidScriptToken(headerToken)) {
		return { source: 'token' };
	}

	return null;
}

/**
 * Exige autenticación. Opcionalmente exige un rol concreto.
 *
 * Uso:
 *   router.post('/', requireAdmin(), handler)
 *   router.delete('/:slug', requireAdmin('admin'), handler)
 */
export function requireAdmin(minRole?: AdminRole) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const auth = await authenticate(req);

			if (!auth) {
				unauthorized(res, 'Necesitas iniciar sesión para hacer esto.');
				return;
			}

			// El token de entorno actúa como admin: es para scripts de confianza.
			const isAdmin = auth.source === 'token' || auth.user?.role === 'admin';

			if (minRole === 'admin' && !isAdmin) {
				forbidden(res, 'Esta acción requiere permisos de administrador.');
				return;
			}

			req.adminSource = auth.source;
			if (auth.user) req.adminUser = auth.user;

			next();
		} catch (error) {
			next(error);
		}
	};
}

/** Opciones de cookie para la sesión. */
export function sessionCookieOptions(maxAgeMs: number) {
	return {
		httpOnly: true,
		// En producción (HTTPS) la cookie no debe viajar en claro.
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/',
		maxAge: maxAgeMs
	};
}
