import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { sql } from 'drizzle-orm';

import { db } from './db/index.js';
import dogsRouter from './routes/dogs.js';
import projectRouter from './routes/project.js';
import shopRouter from './routes/shop.js';
import newsRouter from './routes/news.js';
import ordersRouter from './routes/orders.js';
import siteRouter from './routes/site.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin/index.js';

/**
 * Orígenes permitidos por CORS.
 *
 * Son los del *frontend* (SvelteKit en 5173), no los del propio server.
 * En producción define PUBLIC_ORIGINS con tu dominio real.
 */
const DEV_ORIGINS = [
	'http://localhost:5173',
	'http://127.0.0.1:5173',
	'http://localhost:4173',
	'http://127.0.0.1:4173'
];

function corsOrigins(): string[] {
	const fromEnv = process.env.PUBLIC_ORIGINS?.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	return fromEnv && fromEnv.length > 0 ? fromEnv : DEV_ORIGINS;
}

export function createApp(): Express {
	const app: Express = express();

	app.use(
		cors({
			origin: corsOrigins(),
			methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'x-admin-token'],
			// El panel usa cookie de sesión, así que el navegador debe enviarla.
			credentials: true
		})
	);
	app.use(express.json({ limit: '256kb' }));

	/**
	 * Salud del servicio. Comprueba también la base de datos: un «ok» que no
	 * toca Postgres no sirve para detectar que la base se cayó.
	 */
	app.get('/api/health', async (_req: Request, res: Response) => {
		let database = 'ok';
		try {
			await db.execute(sql`select 1`);
		} catch {
			database = 'error';
		}

		const healthy = database === 'ok';
		res.status(healthy ? 200 : 503).json({
			status: healthy ? 'ok' : 'degraded',
			database,
			uptime: Math.round(process.uptime())
		});
	});

	app.use('/api/auth', authRouter);
	app.use('/api/admin', adminRouter);
	app.use('/api/dogs', dogsRouter);
	app.use('/api/project', projectRouter);
	app.use('/api/shop', shopRouter);
	app.use('/api/news', newsRouter);
	app.use('/api/orders', ordersRouter);
	app.use('/api/site', siteRouter);

	/** Índice de la API, para descubrir las rutas a mano. */
	app.get('/', (_req: Request, res: Response) => {
		res.json({
			name: 'Droopy Manuel API',
			endpoints: [
				'GET  /api/health',
				'POST /api/auth/login',
				'POST /api/auth/logout',
				'GET  /api/auth/me',
				'GET  /api/auth/sessions',
				'GET  /api/auth/audit',
				'GET  /api/dogs',
				'GET  /api/dogs/featured',
				'GET  /api/dogs/pack?view=alive|heaven',
				'GET  /api/dogs/:slug',
				'GET  /api/project',
				'GET  /api/shop/categories',
				'GET  /api/shop/categories/:slug',
				'GET  /api/shop/items?category=',
				'GET  /api/shop/items/featured',
				'GET  /api/shop/items/:slug',
				'GET  /api/shop/shipping',
				'GET  /api/news?offset=&limit=',
				'GET  /api/news/categories',
				'GET  /api/news/:slug',
				'POST /api/orders',
				'GET  /api/orders/:orderNumber',
				'GET  /api/site/content',
				'GET  /api/site/contact',
				'GET  /api/site/stats',
				'GET  /api/site/donation-tiers',
				'GET  /api/site/testimonials',
				'GET  /api/site/donation-targets',
				'GET  /api/site/bank-accounts'
			]
		});
	});

	/** 404 uniforme en JSON. */
	app.use((req: Request, res: Response) => {
		res.status(404).json({
			error: 'not_found',
			message: `No existe la ruta ${req.method} ${req.originalUrl}.`
		});
	});

	/** Manejador de errores: siempre JSON, nunca HTML de Express. */
	app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
		console.error('[error]', error);
		res.status(500).json({
			error: 'internal_error',
			message: 'Ocurrió un error inesperado en el servidor.'
		});
	});

	return app;
}
