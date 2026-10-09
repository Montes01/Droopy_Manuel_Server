import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import { getNewsItem } from '../../repositories/news.js';
import {
	createNews,
	deleteNews,
	updateNews,
	type NewsInput
} from '../../repositories/news-write.js';
import { ValidationError } from '../../repositories/validation.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/** Administración de noticias. */
const router = Router();

function handleValidation(error: unknown, res: Response): void {
	if (error instanceof ValidationError) {
		badRequest(res, error.message);
		return;
	}
	throw error;
}

/** POST /api/admin/news */
router.post(
	'/',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const item = await createNews(req.body as NewsInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'news',
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

/** PATCH /api/admin/news/:slug */
router.patch(
	'/:slug',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getNewsItem(slug);
		if (!before) {
			notFound(res, `No existe la noticia "${slug}".`);
			return;
		}

		try {
			const item = await updateNews(slug, req.body as NewsInput);
			if (!item) {
				notFound(res, `No existe la noticia "${slug}".`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'news',
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

/** DELETE /api/admin/news/:slug — solo `admin`. */
router.delete(
	'/:slug',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const slug = routeParam(req, res, 'slug');
		if (slug === null) return;

		const before = await getNewsItem(slug);
		if (!before) {
			notFound(res, `No existe la noticia "${slug}".`);
			return;
		}

		await deleteNews(slug);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'news',
			entityKey: slug,
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

export default router;
