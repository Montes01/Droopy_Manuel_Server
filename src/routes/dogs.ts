import { Router, type Request, type Response } from 'express';
import type { PackView } from '../types.js';
import { getAllDogs, getDog, getFeaturedDogs, getPack } from '../repositories/dogs.js';
import { asyncHandler, badRequest, notFound, routeParam } from './helpers.js';

const router = Router();

/** GET /api/dogs — toda la manada. */
router.get(
	'/',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getAllDogs());
	})
);

/** GET /api/dogs/featured — los destacados de la portada. */
router.get(
	'/featured',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getFeaturedDogs());
	})
);

/**
 * GET /api/dogs/pack?view=alive|heaven — la manada de /manada.
 * Sin `view`, devuelve la manada viva.
 */
router.get(
	'/pack',
	asyncHandler(async (req: Request, res: Response) => {
		const view = (req.query.view as PackView | undefined) ?? 'alive';
		if (view !== 'alive' && view !== 'heaven') {
			badRequest(res, 'El parámetro "view" debe ser "alive" o "heaven".');
			return;
		}
		res.json(await getPack(view));
	})
);

/** GET /api/dogs/:slug — un perrito concreto. */
router.get(
	'/:slug',
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const dog = await getDog(slug);
		if (!dog) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}
		res.json(dog);
	})
);

export default router;
