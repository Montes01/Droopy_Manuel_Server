import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import { getProjectSection } from '../../repositories/project.js';
import {
	createProjectSection,
	deleteProjectSection,
	updateProjectSection,
	type ProjectSectionInput
} from '../../repositories/project-write.js';
import { ValidationError } from '../../repositories/validation.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/**
 * Administración de la página `/project`.
 *
 * Las secciones se identifican por `id` numérico y se ordenan por `position`
 * (único pero modificable: el repositorio recorre las demás al mover).
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

/** Extrae el `id` numérico de la ruta. */
function routeId(req: Request, res: Response): number | null {
	const raw = routeParam(req, res, 'id');
	if (raw === null) return null;
	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) {
		badRequest(res, 'El "id" debe ser un entero mayor que cero.');
		return null;
	}
	return id;
}

/** POST /api/admin/project — crea una sección. */
router.post(
	'/',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const section = await createProjectSection(req.body as ProjectSectionInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'project_sections',
				entityKey: String(section.id),
				action: 'crear',
				after: section
			});
			res.status(201).json(section);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/project/:id — edita campos sueltos (incluida `position`). */
router.patch(
	'/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const id = routeId(req, res);
		if (id === null) return;

		const before = await getProjectSection(id);
		if (!before) {
			notFound(res, `No existe la sección "${id}".`);
			return;
		}

		try {
			const section = await updateProjectSection(id, req.body as ProjectSectionInput);
			if (!section) {
				notFound(res, `No existe la sección "${id}".`);
				return;
			}

			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'project_sections',
				entityKey: String(id),
				action: 'editar',
				before,
				after: section
			});
			res.json(section);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/project/:id — borra una sección. Solo `admin`. */
router.delete(
	'/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const id = routeId(req, res);
		if (id === null) return;

		const before = await getProjectSection(id);
		if (!before) {
			notFound(res, `No existe la sección "${id}".`);
			return;
		}

		await deleteProjectSection(id);
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'project_sections',
			entityKey: String(id),
			action: 'borrar',
			before
		});
		res.status(204).end();
	})
);

export default router;
