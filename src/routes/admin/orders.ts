import { Router, type Request, type Response } from 'express';
import type { OrderStatus, PaymentStatus } from '../../types.js';
import { requireAdmin } from '../../auth/middleware.js';
import { recordAudit } from '../../auth/users.js';
import { findOrders, getOrder, setOrderStatus } from '../../repositories/orders.js';
import { asyncHandler, badRequest, notFound, routeParam } from '../helpers.js';

/**
 * Administración de pedidos.
 *
 * A diferencia del catálogo, los pedidos **no se crean ni se borran** desde el
 * panel: los crea la tienda y son un registro histórico. Aquí solo se consultan
 * y se cambia su estado (y el estado de pago).
 */
const router = Router();

const ORDER_STATUSES: OrderStatus[] = [
	'pendiente',
	'confirmado',
	'enviado',
	'entregado',
	'cancelado'
];

const PAYMENT_STATUSES: PaymentStatus[] = ['sin-pago', 'en-revision', 'pagado', 'rechazado'];

/** GET /api/admin/orders?status=&paymentStatus=&q=&limit=&offset= */
router.get(
	'/',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const { status, paymentStatus, q, limit, offset } = req.query as Record<string, string>;

		if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
			badRequest(res, `El estado debe ser uno de: ${ORDER_STATUSES.join(', ')}.`);
			return;
		}
		if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)) {
			badRequest(res, `El estado de pago debe ser uno de: ${PAYMENT_STATUSES.join(', ')}.`);
			return;
		}

		const parsedLimit = limit !== undefined ? Number(limit) : 50;
		const parsedOffset = offset !== undefined ? Number(offset) : 0;

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
			badRequest(res, 'El parámetro "limit" debe ser un entero entre 1 y 200.');
			return;
		}
		if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
			badRequest(res, 'El parámetro "offset" debe ser un entero mayor o igual a cero.');
			return;
		}

		const result = await findOrders({
			status: status as OrderStatus | undefined,
			paymentStatus: paymentStatus as PaymentStatus | undefined,
			q: q || undefined,
			limit: parsedLimit,
			offset: parsedOffset
		});

		res.json(result);
	})
);

/** GET /api/admin/orders/:orderNumber — detalle completo. */
router.get(
	'/:orderNumber',
	requireAdmin(),
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

/**
 * PATCH /api/admin/orders/:orderNumber — cambia estado y/o estado de pago.
 *
 * Se permite enviar solo uno de los dos campos. El cambio queda en auditoría
 * con el estado anterior, que es lo que hace falta para reconstruir qué pasó.
 */
router.patch(
	'/:orderNumber',
	requireAdmin(),
	asyncHandler(async (req: Request, res: Response) => {
		const orderNumber = routeParam(req, res, 'orderNumber');
		if (orderNumber === null) return;

		const { status, paymentStatus } = (req.body ?? {}) as {
			status?: unknown;
			paymentStatus?: unknown;
		};

		if (status === undefined && paymentStatus === undefined) {
			badRequest(res, 'Envía "status", "paymentStatus" o ambos.');
			return;
		}

		if (status !== undefined && !ORDER_STATUSES.includes(status as OrderStatus)) {
			badRequest(res, `El estado debe ser uno de: ${ORDER_STATUSES.join(', ')}.`);
			return;
		}
		if (
			paymentStatus !== undefined &&
			!PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)
		) {
			badRequest(res, `El estado de pago debe ser uno de: ${PAYMENT_STATUSES.join(', ')}.`);
			return;
		}

		const before = await getOrder(orderNumber);
		if (!before) {
			notFound(res, `No existe el pedido "${orderNumber}".`);
			return;
		}

		const order = await setOrderStatus(
			orderNumber,
			(status as OrderStatus | undefined) ?? before.status,
			paymentStatus as PaymentStatus | undefined
		);

		if (!order) {
			notFound(res, `No existe el pedido "${orderNumber}".`);
			return;
		}

		await recordAudit({
			userId: req.adminUser?.id,
			entity: 'orders',
			entityKey: orderNumber,
			action: 'editar',
			before: { status: before.status, paymentStatus: before.paymentStatus },
			after: { status: order.status, paymentStatus: order.paymentStatus }
		});

		res.json(order);
	})
);

export default router;
