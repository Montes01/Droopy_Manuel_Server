import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import { getDog } from '../../repositories/dogs.js';
import {
	createDog,
	deleteDog,
	reorderDogs,
	updateDog,
	type DogInput
} from '../../repositories/dogs-write.js';
import { ValidationError } from '../../repositories/validation.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/**
 * Administración de la manada.
 *
 * Todo pasa por `requireAdmin`: leer es público, escribir no. Borrar exige rol
 * `admin`, no basta con ser `editor`.
 */
const router = Router();

/** Traduce un error de validación a 400 y deja pasar el resto. */
function handleValidation(error: unknown, res: Response): void {
	if (error instanceof ValidationError) {
		badRequest(res, error.message);
		return;
	}
	throw error;
}

/** POST /api/admin/dogs — crea un perrito. */
router.post(
	'/',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const dog = await createDog(req.body as DogInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dogs',
				entityKey: dog.slug,
				action: 'crear',
				after: dog
			});
			res.status(201).json(dog);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/**
 * PUT /api/admin/dogs/order — reordena la manada.
 *
 * Va antes de `/:slug` a propósito: si no, Express tomaría «order» como slug.
 */
router.put(
	'/order',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const { slugs } = (req.body ?? {}) as { slugs?: unknown };

		if (!Array.isArray(slugs)) {
			badRequest(res, 'Se esperaba { slugs: [...] }.');
			return;
		}

		try {
			const dogs = await reorderDogs(slugs as string[]);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dogs',
				entityKey: 'order',
				action: 'editar',
				after: slugs
			});
			res.json(dogs);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/dogs/:slug — edita campos sueltos. */
router.patch(
	'/:slug',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getDog(slug);
		if (!before) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		try {
			const dog = await updateDog(slug, req.body as DogInput);
			if (!dog) {
				notFound(res, `No existe un perrito con el slug "${slug}".`);
				return;
			}

			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dogs',
				entityKey: slug,
				action: 'editar',
				before,
				after: dog
			});
			res.json(dog);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/dogs/:slug — borra un perrito. Solo `admin`. */
router.delete(
	'/:slug',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getDog(slug);
		if (!before) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		await deleteDog(slug);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'dogs',
			entityKey: slug,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

export default router;
