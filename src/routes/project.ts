import { Router } from 'express';
import { getProjectSections } from '../repositories/project.js';
import { asyncHandler } from './helpers.js';

const router = Router();

/** GET /api/project — secciones de la página del proyecto, en orden. */
router.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json(await getProjectSections());
	})
);

export default router;
