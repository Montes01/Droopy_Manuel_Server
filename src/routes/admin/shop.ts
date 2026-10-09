import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import { getCategory, getItem } from '../../repositories/shop.js';
import {
	createCategory,
	createItem,
	deleteCategory,
	deleteItem,
	setStock,
	updateCategory,
	updateItem,
	type ShopCategoryInput,
	type ShopItemInput
} from '../../repositories/shop-write.js';
import { ValidationError } from '../../repositories/validation.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/** Administración de la tienda solidaria. */
const router = Router();

function handleValidation(error: unknown, res: Response): void {
	if (error instanceof ValidationError) {
		badRequest(res, error.message);
		return;
	}
	throw error;
}

// ------------------------------------------------------------- Categorías

/** POST /api/admin/shop/categories */
router.post(
	'/categories',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const category = await createCategory(req.body as ShopCategoryInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'shop_categories',
				entityKey: category.slug,
				action: 'crear',
				after: category
			});
			res.status(201).json(category);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/shop/categories/:slug */
router.patch(
	'/categories/:slug',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getCategory(slug);
		if (!before) {
			notFound(res, `No existe la categoría "${slug}".`);
			return;
		}

		try {
			const category = await updateCategory(slug, req.body as ShopCategoryInput);
			if (!category) {
				notFound(res, `No existe la categoría "${slug}".`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'shop_categories',
				entityKey: slug,
				action: 'editar',
				before,
				after: category
			});
			res.json(category);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/shop/categories/:slug — solo `admin`. */
router.delete(
	'/categories/:slug',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getCategory(slug);
		if (!before) {
			notFound(res, `No existe la categoría "${slug}".`);
			return;
		}

		const result = await deleteCategory(slug);
		if (result === 'tiene-productos') {
			// Evita dejar productos apuntando a una categoría que ya no existe.
			badRequest(
				res,
				'No se puede borrar una categoría que todavía tiene productos. Muévelos o bórralos primero.'
			);
			return;
		}

		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'shop_categories',
			entityKey: slug,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

// -------------------------------------------------------------- Productos

/** POST /api/admin/shop/items */
router.post(
	'/items',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const item = await createItem(req.body as ShopItemInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'shop_items',
				entityKey: item.slug,
				action: 'crear',
				after: item
			});
			res.status(201).json(item);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/**
 * PATCH /api/admin/shop/items/:slug/stock — ajusta el stock.
 *
 * Va antes de `/:slug` para que «stock» no se confunda con un slug.
 */
router.patch(
	'/items/:slug/stock',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const { variantId, stock } = (req.body ?? {}) as {
			variantId?: string | null;
			stock?: unknown;
		};

		if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
			badRequest(res, 'El campo "stock" debe ser un entero mayor o igual a cero.');
			return;
		}

		try {
			const item = await setStock(slug, variantId ?? null, stock);
			if (!item) {
				notFound(res, `No existe el producto "${slug}" o su variante.`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'shop_items',
				entityKey: slug,
				action: 'editar',
				after: { variantId: variantId ?? null, stock }
			});
			res.json(item);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/shop/items/:slug */
router.patch(
	'/items/:slug',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getItem(slug);
		if (!before) {
			notFound(res, `No existe el producto "${slug}".`);
			return;
		}

		try {
			const item = await updateItem(slug, req.body as ShopItemInput);
			if (!item) {
				notFound(res, `No existe el producto "${slug}".`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'shop_items',
				entityKey: slug,
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

/** DELETE /api/admin/shop/items/:slug — solo `admin`. */
router.delete(
	'/items/:slug',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getItem(slug);
		if (!before) {
			notFound(res, `No existe el producto "${slug}".`);
			return;
		}

		await deleteItem(slug);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'shop_items',
			entityKey: slug,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

export default router;
