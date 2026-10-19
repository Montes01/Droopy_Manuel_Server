import { Router, type Request, type Response } from 'express';
import {
	NEWS_CATEGORIES,
	getAllNews,
	getNewsItem,
	getNewsPage
} from '../repositories/news.js';
import { NEWS_CATEGORY_SLUGS, type NewsCategory, type NewsFilter } from '../types.js';
import { asyncHandler, badRequest, notFound, queryParam, routeParam } from './helpers.js';

const router = Router();

const DEFAULT_PAGE_LIMIT = 6;

/** GET /api/news/categories — categorías con su etiqueta visible. */
router.get('/categories', (_req: Request, res: Response) => {
	res.json(NEWS_CATEGORIES);
});

/**
 * GET /api/news?offset=0&limit=6&q=texto&category=rescate — noticias filtradas.
 *
 * Sin parámetros devuelve el feed completo. Con `offset`/`limit`, o con algún
 * filtro (`q`, `category`), devuelve el trozo y `hasMore`, que es lo que usa el
 * scroll infinito.
 */
router.get(
	'/',
	asyncHandler(async (req: Request, res: Response) => {
		const q = queryParam(req, 'q');
		const rawCategory = queryParam(req, 'category');

		let category: NewsCategory | undefined;
		if (rawCategory) {
			if (!(NEWS_CATEGORY_SLUGS as readonly string[]).includes(rawCategory)) {
				badRequest(res, `La categoría "${rawCategory}" no es válida.`);
				return;
			}
			category = rawCategory as NewsCategory;
		}

		const filter: NewsFilter = { q, category };
		const hasPaging = req.query.offset !== undefined || req.query.limit !== undefined;

		if (!hasPaging && !q && !category) {
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

		res.json(await getNewsPage(offset, limit, filter));
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
