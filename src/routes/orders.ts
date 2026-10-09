import { Router, type Request, type Response } from 'express';
import type { OrderPayload } from '../types.js';
import {
	OrderValidationError,
	createOrder,
	getAllOrders,
	getOrder
} from '../repositories/orders.js';
import { sendOrderEmails } from '../mail/orders.js';
import { asyncHandler, notFound, routeParam } from './helpers.js';

const router = Router();

/**
 * POST /api/orders — crea un pedido.
 *
 * El servidor recalcula precios, envío y totales a partir de su catálogo y
 * descuenta stock en una transacción; nunca confía en los montos del cliente.
 *
 * Tras guardarlo se disparan los correos (aviso interno y resumen al cliente).
 * El envío no bloquea la respuesta ni puede deshacer el pedido: si el correo
 * falla, se registra y la persona igual recibe su número de pedido.
 */
router.post(
	'/',
	asyncHandler(async (req: Request, res: Response) => {
		try {
			const result = await createOrder(req.body as OrderPayload);
			res.status(201).json(result);

			// Fuera del camino crítico: la respuesta ya salió.
			void notifyOrder(result.orderNumber);
		} catch (error) {
			if (error instanceof OrderValidationError) {
				res.status(400).json({ error: 'invalid_order', message: error.message });
				return;
			}
			throw error;
		}
	})
);

/**
 * Envía los correos de un pedido recién creado.
 *
 * Se relee el pedido completo porque `createOrder` devuelve solo el resumen
 * (`OrderResult`), y los correos necesitan al cliente y la dirección.
 */
async function notifyOrder(orderNumber: string): Promise<void> {
	try {
		const order = await getOrder(orderNumber);
		if (!order) {
			console.warn(`[correo] no se encontró el pedido ${orderNumber} para notificar.`);
			return;
		}

		const results = await sendOrderEmails(order);
		const failed = results.filter((r) => !r.sent);
		if (failed.length > 0) {
			console.warn(
				`[correo] pedido ${orderNumber}: ${failed.length} de ${results.length} no se enviaron.`
			);
		}
	} catch (error) {
		// Nunca debe tumbar la petición: el pedido ya está guardado.
		console.error(`[correo] fallo notificando el pedido ${orderNumber}:`, error);
	}
}

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
