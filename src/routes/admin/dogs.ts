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
import { getDogNewsItem } from '../../repositories/dog-news.js';
import {
	createDogNews,
	deleteDogNews,
	updateDogNews,
	type DogNewsInput
} from '../../repositories/dog-news-write.js';
import {
	getDogAccessoryItem,
	getDogHealth,
	getDogVaccineItem
} from '../../repositories/dog-health.js';
import {
	createDogAccessory,
	createDogVaccine,
	deleteDogAccessory,
	deleteDogVaccine,
	updateDogAccessory,
	updateDogVaccine,
	upsertDogHealth,
	type DogAccessoryInput,
	type DogHealthInput,
	type DogVaccineInput
} from '../../repositories/dog-health-write.js';
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

/** Lee un id de sub-recurso (vacuna, accesorio…); `null` si no es válido. */
function itemId(req: Request, res: Response, label: string): number | null {
	const raw = routeParam(req, res, 'id');
	if (raw === null) return null;

	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) {
		badRequest(res, `El id del ${label} debe ser un entero mayor que cero.`);
		return null;
	}
	return id;
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

/** POST /api/admin/dogs/:slug/news — crea un comunicado del perrito. */
router.post(
	'/:slug/news',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const dog = await getDog(slug);
		if (!dog) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		try {
			const item = await createDogNews(slug, req.body as DogNewsInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_news',
				entityKey: `${slug}:${item.id}`,
				action: 'crear',
				after: item
			});
			res.status(201).json(item);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/dogs/:slug/news/:id — edita un comunicado. */
router.patch(
	'/:slug/news/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'comunicado');
		if (id === null) return;

		const before = await getDogNewsItem(slug, id);
		if (!before) {
			notFound(res, `No existe el comunicado ${id} de "${slug}".`);
			return;
		}

		try {
			const item = await updateDogNews(slug, id, req.body as DogNewsInput);
			if (!item) {
				notFound(res, `No existe el comunicado ${id} de "${slug}".`);
				return;
			}

			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_news',
				entityKey: `${slug}:${id}`,
				action: 'editar',
				before,
				after: item
			});
			res.json(item);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/dogs/:slug/news/:id — borra un comunicado. Solo `admin`. */
router.delete(
	'/:slug/news/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'comunicado');
		if (id === null) return;

		const before = await getDogNewsItem(slug, id);
		if (!before) {
			notFound(res, `No existe el comunicado ${id} de "${slug}".`);
			return;
		}

		await deleteDogNews(slug, id);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'dog_news',
			entityKey: `${slug}:${id}`,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

/**
 * PUT /api/admin/dogs/:slug/health — guarda el bloque de salud (1:1).
 *
 * Crea la fila si no existe y actualiza la que haya. Es `PUT` porque el
 * recurso es único por perrito.
 */
router.put(
	'/:slug/health',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const dog = await getDog(slug);
		if (!dog) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		const before = await getDogHealth(slug);

		try {
			const health = await upsertDogHealth(slug, req.body as DogHealthInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_health',
				entityKey: slug,
				action: before ? 'editar' : 'crear',
				before: before ?? undefined,
				after: health
			});
			res.json(health);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** POST /api/admin/dogs/:slug/vaccines — crea una vacuna. */
router.post(
	'/:slug/vaccines',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const dog = await getDog(slug);
		if (!dog) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		try {
			const vaccine = await createDogVaccine(slug, req.body as DogVaccineInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_vaccines',
				entityKey: `${slug}:${vaccine.id}`,
				action: 'crear',
				after: vaccine
			});
			res.status(201).json(vaccine);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/dogs/:slug/vaccines/:id — edita una vacuna. */
router.patch(
	'/:slug/vaccines/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'vacuna');
		if (id === null) return;

		const before = await getDogVaccineItem(slug, id);
		if (!before) {
			notFound(res, `No existe la vacuna ${id} de "${slug}".`);
			return;
		}

		try {
			const vaccine = await updateDogVaccine(slug, id, req.body as DogVaccineInput);
			if (!vaccine) {
				notFound(res, `No existe la vacuna ${id} de "${slug}".`);
				return;
			}

			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_vaccines',
				entityKey: `${slug}:${id}`,
				action: 'editar',
				before,
				after: vaccine
			});
			res.json(vaccine);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/dogs/:slug/vaccines/:id — borra una vacuna. Solo `admin`. */
router.delete(
	'/:slug/vaccines/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'vacuna');
		if (id === null) return;

		const before = await getDogVaccineItem(slug, id);
		if (!before) {
			notFound(res, `No existe la vacuna ${id} de "${slug}".`);
			return;
		}

		await deleteDogVaccine(slug, id);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'dog_vaccines',
			entityKey: `${slug}:${id}`,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

/** POST /api/admin/dogs/:slug/accessories — crea un accesorio. */
router.post(
	'/:slug/accessories',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const dog = await getDog(slug);
		if (!dog) {
			notFound(res, `No existe un perrito con el slug "${slug}".`);
			return;
		}

		try {
			const accessory = await createDogAccessory(slug, req.body as DogAccessoryInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_accessories',
				entityKey: `${slug}:${accessory.id}`,
				action: 'crear',
				after: accessory
			});
			res.status(201).json(accessory);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/dogs/:slug/accessories/:id — edita un accesorio. */
router.patch(
	'/:slug/accessories/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'accesorio');
		if (id === null) return;

		const before = await getDogAccessoryItem(slug, id);
		if (!before) {
			notFound(res, `No existe el accesorio ${id} de "${slug}".`);
			return;
		}

		try {
			const accessory = await updateDogAccessory(slug, id, req.body as DogAccessoryInput);
			if (!accessory) {
				notFound(res, `No existe el accesorio ${id} de "${slug}".`);
				return;
			}

			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'dog_accessories',
				entityKey: `${slug}:${id}`,
				action: 'editar',
				before,
				after: accessory
			});
			res.json(accessory);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/dogs/:slug/accessories/:id — borra un accesorio. Solo `admin`. */
router.delete(
	'/:slug/accessories/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;
		const id = itemId(req, res, 'accesorio');
		if (id === null) return;

		const before = await getDogAccessoryItem(slug, id);
		if (!before) {
			notFound(res, `No existe el accesorio ${id} de "${slug}".`);
			return;
		}

		await deleteDogAccessory(slug, id);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'dog_accessories',
			entityKey: `${slug}:${id}`,
			action: 'borrar',
			before
		});
		res.status(204).end();
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
