import { Router, type Request, type Response } from 'express';
import {
	getCategories,
	getCategory,
	getFeaturedItems,
	getItem,
	getItems,
	getShippingOptions
} from '../repositories/shop.js';
import { asyncHandler, notFound, queryParam, routeParam } from './helpers.js';

const router = Router();

/** GET /api/shop/categories — todas las categorías. */
router.get(
	'/categories',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getCategories());
	})
);

/** GET /api/shop/categories/:slug — una categoría concreta. */
router.get(
	'/categories/:slug',
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const category = await getCategory(slug);
		if (!category) {
			notFound(res, `No existe la categoría "${slug}".`);
			return;
		}
		res.json(category);
	})
);

/** GET /api/shop/items?category=<slug> — productos, filtrados por categoría. */
router.get(
	'/items',
	asyncHandler(async (req: Request, res: Response) => {
		const category = queryParam(req, 'category');

		if (category) {
			// Distinguimos «categoría sin productos» de «categoría inexistente».
			if (!(await getCategory(category))) {
				notFound(res, `No existe la categoría "${category}".`);
				return;
			}
			res.json(await getItems(category));
			return;
		}

		res.json(await getItems());
	})
);

/** GET /api/shop/items/featured — productos destacados. */
router.get(
	'/items/featured',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getFeaturedItems());
	})
);

/** GET /api/shop/items/:slug — un producto concreto. */
router.get(
	'/items/:slug',
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const item = await getItem(slug);
		if (!item) {
			notFound(res, `No existe el producto "${slug}".`);
			return;
		}
		res.json(item);
	})
);

/** GET /api/shop/shipping — opciones de entrega con sus costos. */
router.get('/shipping', (_req: Request, res: Response) => {
	res.json(getShippingOptions());
});

export default router;
