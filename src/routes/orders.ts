import { Router, type Request, type Response } from 'express';
import type { OrderPayload } from '../types.js';
import {
	OrderValidationError,
	createOrder,
	getAllOrders,
	getOrder
} from '../repositories/orders.js';
import { asyncHandler, notFound, routeParam } from './helpers.js';

const router = Router();

/**
 * POST /api/orders — crea un pedido.
 *
 * El servidor recalcula precios, envío y totales a partir de su catálogo y
 * descuenta stock en una transacción; nunca confía en los montos del cliente.
 */
router.post(
	'/',
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const result = await createOrder(req.body as OrderPayload);
			res.status(201).json(result);
		} catch (error) {
			if (error instanceof OrderValidationError) {
				res.status(400).json({ error: 'invalid_order', message: error.message });
				return;
			}
			throw error;
		}
	})
);

/** GET /api/orders — listado de pedidos (apoyo para desarrollo). */
router.get(
	'/',
	asyncHandler(async (_req: Request, res: Response) => {
		res.json(await getAllOrders());
	})
);

/** GET /api/orders/:orderNumber — pedido completo, con estado de pago. */
router.get(
	'/:orderNumber',
	asyncHandler(async (req: Request, res: Response) => {
		const orderNumber = routeParam(req, res, 'orderNumber');
		if (orderNumber === null) return;

		const order = await getOrder(orderNumber);
		if (!order) {
			notFound(res, `No existe el pedido "${orderNumber}".`);
			return;
		}
		res.json(order);
	})
);

export default router;
