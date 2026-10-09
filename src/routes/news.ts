import { Router, type Request, type Response } from 'express';
import {
	NEWS_CATEGORIES,
	getAllNews,
	getNewsItem,
	getNewsPage
} from '../repositories/news.js';
import { asyncHandler, badRequest, notFound, routeParam } from './helpers.js';

const router = Router();

const DEFAULT_PAGE_LIMIT = 6;

/** GET /api/news/categories — categorías con su etiqueta visible. */
router.get('/categories', (_req: Request, res: Response) => {
	res.json(NEWS_CATEGORIES);
});

/**
 * GET /api/news?offset=0&limit=6 — noticias paginadas.
 *
 * Sin parámetros devuelve el feed completo. Con `offset`/`limit` devuelve el
 * trozo y `hasMore`, que es lo que usa el scroll infinito.
 */
router.get(
	'/',
	asyncHandler(async (req: Request, res: Response) => {
		const hasPaging = req.query.offset !== undefined || req.query.limit !== undefined;

		if (!hasPaging) {
			res.json(await getAllNews());
			return;
		}

		const offset = Number(req.query.offset ?? 0);
		const limit = Number(req.query.limit ?? DEFAULT_PAGE_LIMIT);

		if (!Number.isInteger(offset) || offset < 0) {
			badRequest(res, 'El parámetro "offset" debe ser un entero mayor o igual a cero.');
			return;
		}
		if (!Number.isInteger(limit) || limit < 1) {
			badRequest(res, 'El parámetro "limit" debe ser un entero mayor que cero.');
			return;
		}

		res.json(await getNewsPage(offset, limit));
	})
);

/** GET /api/news/:slug — una noticia concreta. */
router.get(
	'/:slug',
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const item = await getNewsItem(slug);
		if (!item) {
			notFound(res, `No existe la noticia "${slug}".`);
			return;
		}
		res.json(item);
	})
);

export default router;
