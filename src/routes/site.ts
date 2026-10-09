import { Router, type Request, type Response } from 'express';
import {
	getBankAccounts,
	getDonationTargets,
	getDonationTiers,
	getSiteContact,
	getSiteContent,
	getStats,
	getTestimonials
} from '../repositories/site.js';
import { asyncHandler } from './helpers.js';

const router = Router();

/** GET /api/site/content — texto "sobre nosotros" y estadísticas. */
router.get(
	'/content',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getSiteContent());
	})
);

/** GET /api/site/contact — WhatsApp, correo y redes de la fundación. */
router.get(
	'/contact',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getSiteContact());
	})
);

/** GET /api/site/stats — solo las estadísticas. */
router.get(
	'/stats',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getStats());
	})
);

/** GET /api/site/donation-tiers — niveles de donación con precios. */
router.get(
	'/donation-tiers',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getDonationTiers());
	})
);

/** GET /api/site/testimonials — testimonios de adoptantes y voluntarios. */
router.get(
	'/testimonials',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getTestimonials());
	})
);

/** GET /api/site/donation-targets — perritos a los que dirigir una estrella. */
router.get(
	'/donation-targets',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getDonationTargets());
	})
);

/** GET /api/site/bank-accounts — cuentas para transferencias y donaciones. */
router.get(
	'/bank-accounts',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getBankAccounts());
	})
);

export default router;
