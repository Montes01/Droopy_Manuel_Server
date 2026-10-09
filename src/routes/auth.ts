import { Router, type Request, type Response } from 'express';
import {
	SESSION_COOKIE,
	requireAdmin,
	sessionCookieOptions
} from '../auth/middleware.js';
import { listAudit, listSessions, login, logout } from '../auth/users.js';
import { asyncHandler, badRequest, unauthorized } from '../routes/helpers.js';

const router = Router();

/** Una semana, igual que la vida de la sesión en la base. */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/login — abre sesión.
 *
 * Espera `{ email, password }`. Devuelve el usuario y deja una cookie
 * httpOnly; el token nunca viaja en el cuerpo de la respuesta.
 */
router.post(
	'/login',
	asyncHandler(async (req: Request, res: Response) => {
		const { email, password } = (req.body ?? {}) as {
			email?: unknown;
			password?: unknown;
		};

		if (typeof email !== 'string' || email.trim() === '') {
			badRequest(res, 'El correo es obligatorio.');
			return;
		}
		if (typeof password !== 'string' || password === '') {
			badRequest(res, 'La contraseña es obligatoria.');
			return;
		}

		const result = await login(email, password, req.headers['user-agent']);

		if (!result) {
			// Mismo mensaje para «no existe» y «contraseña mal»: no damos pistas.
			unauthorized(res, 'Correo o contraseña incorrectos.');
			return;
		}

		res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions(SESSION_MAX_AGE_MS));
		res.json({ user: result.user });
	})
);

/** POST /api/auth/logout — cierra la sesión actual. */
router.post(
	'/logout',
	asyncHandler(async (req: Request, res: Response) => {
		const header = req.headers.cookie ?? '';
		for (const part of header.split(';')) {
			const [name, ...rest] = part.trim().split('=');
			if (name === SESSION_COOKIE) {
				await logout(decodeURIComponent(rest.join('=')));
			}
		}
		res.clearCookie(SESSION_COOKIE, { path: '/' });
		res.status(204).end();
	})
);

/** GET /api/auth/me — quién soy, para que el panel pinte la interfaz. */
router.get(
	'/me',
	requireAdmin(),
	(req: Request, res: Response) => {
		res.json({
			user: req.adminUser ?? { id: 0, email: '', name: 'script', role: 'admin' },
			source: req.adminSource
		});
	}
);

/** GET /api/auth/sessions — sesiones activas de la persona autenticada. */
router.get(
	'/sessions',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		if (!req.adminUser) {
			res.json({ sessions: [] });
			return;
		}
		res.json({ sessions: await listSessions(req.adminUser.id) });
	})
);

/** GET /api/auth/audit — últimos cambios registrados. */
router.get(
	'/audit',
	requireAdmin('admin'),
	asyncHandler(async (_req: Request, res: Response) => {
		res.json({ entries: await listAudit(50) });
	})
);

export default router;
