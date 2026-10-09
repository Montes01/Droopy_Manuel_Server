import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import {
	createBankAccount,
	createDonationTier,
	createTestimonial,
	deleteBankAccount,
	deleteDonationTier,
	deleteTestimonial,
	setSetting,
	updateBankAccount,
	updateContactChannel,
	updateDonationTier,
	updateTestimonial,
	type BankAccountInput,
	type ContactChannelInput,
	type DonationTierInput,
	type TestimonialInput
} from '../../repositories/site-write.js';
import { ValidationError } from '../../repositories/validation.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/** Administración del contenido del sitio. */
const router = Router();

function handleValidation(error: unknown, res: Response): void {
	if (error instanceof ValidationError) {
		badRequest(res, error.message);
		return;
	}
	throw error;
}

/** Lee un id numérico de la ruta. */
function numericParam(req: Request, res: Response, name: string): number | null {
	const raw = routeParam(req, res, name);
	if (raw === null) return null;

	const value = Number(raw);
	if (!Number.isInteger(value) || value < 1) {
		badRequest(res, `El parámetro "${name}" debe ser un identificador válido.`);
		return null;
	}
	return value;
}

// -------------------------------------------------------- Configuración

/** PUT /api/admin/site/settings/:key — texto, correo o estadísticas. */
router.put(
	'/settings/:key',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const key = routeParam(req, res, 'key');
		if (key === null) return;

		const { value } = (req.body ?? {}) as { value?: unknown };

		try {
			await setSetting(key, value);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'site_settings',
				entityKey: key,
				action: 'editar',
				after: value
			});
			res.json({ key, value });
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

// ------------------------------------------------------------ Contacto

/** PATCH /api/admin/site/contact/:key — edita un canal (p. ej. whatsapp). */
router.patch(
	'/contact/:key',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const key = routeParam(req, res, 'key');
		if (key === null) return;

		try {
			const channel = await updateContactChannel(key, req.body as ContactChannelInput);
			if (!channel) {
				notFound(res, `No existe el canal de contacto "${key}".`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'contact_channels',
				entityKey: key,
				action: 'editar',
				after: channel
			});
			res.json(channel);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

// ------------------------------------------------------- Niveles de donación

/** POST /api/admin/site/donation-tiers */
router.post(
	'/donation-tiers',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const tier = await createDonationTier(req.body as DonationTierInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'donation_tiers',
				entityKey: String(tier.stars),
				action: 'crear',
				after: tier
			});
			res.status(201).json(tier);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/site/donation-tiers/:stars */
router.patch(
	'/donation-tiers/:stars',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const stars = numericParam(req, res, 'stars');
		if (stars === null) return;

		try {
			const tier = await updateDonationTier(stars, req.body as DonationTierInput);
			if (!tier) {
				notFound(res, `No existe un nivel con ${stars} estrellas.`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'donation_tiers',
				entityKey: String(stars),
				action: 'editar',
				after: tier
			});
			res.json(tier);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/site/donation-tiers/:stars — solo `admin`. */
router.delete(
	'/donation-tiers/:stars',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const stars = numericParam(req, res, 'stars');
		if (stars === null) return;

		const deleted = await deleteDonationTier(stars);
		if (!deleted) {
			notFound(res, `No existe un nivel con ${stars} estrellas.`);
			return;
		}
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'donation_tiers',
			entityKey: String(stars),
			action: 'borrar'
		});
		res.status(204).end();
	})
);

// --------------------------------------------------------------- Testimonios

/** POST /api/admin/site/testimonials */
router.post(
	'/testimonials',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const testimonial = await createTestimonial(req.body as TestimonialInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'testimonials',
				entityKey: testimonial.name,
				action: 'crear',
				after: testimonial
			});
			res.status(201).json(testimonial);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/site/testimonials/:id */
router.patch(
	'/testimonials/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const id = numericParam(req, res, 'id');
		if (id === null) return;

		try {
			const testimonial = await updateTestimonial(id, req.body as TestimonialInput);
			if (!testimonial) {
				notFound(res, `No existe el testimonio ${id}.`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'testimonials',
				entityKey: String(id),
				action: 'editar',
				after: testimonial
			});
			res.json(testimonial);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/site/testimonials/:id — solo `admin`. */
router.delete(
	'/testimonials/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const id = numericParam(req, res, 'id');
		if (id === null) return;

		const deleted = await deleteTestimonial(id);
		if (!deleted) {
			notFound(res, `No existe el testimonio ${id}.`);
			return;
		}
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'testimonials',
			entityKey: String(id),
			action: 'borrar'
		});
		res.status(204).end();
	})
);

// ---------------------------------------------------------- Cuentas bancarias

/** POST /api/admin/site/bank-accounts */
router.post(
	'/bank-accounts',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const account = await createBankAccount(req.body as BankAccountInput);
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'bank_accounts',
				entityKey: account.bank,
				action: 'crear',
				after: account
			});
			res.status(201).json(account);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** PATCH /api/admin/site/bank-accounts/:id */
router.patch(
	'/bank-accounts/:id',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const id = numericParam(req, res, 'id');
		if (id === null) return;

		try {
			const account = await updateBankAccount(id, req.body as BankAccountInput);
			if (!account) {
				notFound(res, `No existe la cuenta ${id}.`);
				return;
			}
			await recordAudit({
				userId: req.adminUser?.id,
				entity: 'bank_accounts',
				entityKey: String(id),
				action: 'editar',
				after: account
			});
			res.json(account);
		} catch (error) {
			handleValidation(error, res);
		}
	})
);

/** DELETE /api/admin/site/bank-accounts/:id — solo `admin`. */
router.delete(
	'/bank-accounts/:id',
	requireAdmin('admin'),
	asyncHandler(async (req: Request, res: Response) => {
		const id = numericParam(req, res, 'id');
		if (id === null) return;

		const deleted = await deleteBankAccount(id);
		if (!deleted) {
			notFound(res, `No existe la cuenta ${id}.`);
			return;
		}
		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'bank_accounts',
			entityKey: String(id),
			action: 'borrar'
		});
		res.status(204).end();
	})
);

export default router;
