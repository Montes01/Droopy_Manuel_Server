import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { orderLines, orders, shopItems, shopVariants } from '../db/schema/index.js';
import type {
	Order,
	OrderCustomer,
	OrderLineInput,
	OrderLineResult,
	OrderPayload,
	OrderResult,
	OrderStatus,
	PaymentStatus
} from '../types.js';
import { getShippingOption } from './shop.js';

/**
 * Pedidos.
 *
 * Todo el pedido se crea en una transacción: si falta stock en la última
 * línea, no debe quedar un pedido a medias ni stock descontado de las
 * anteriores.
 */

/** Error de validación del pedido: se traduce a un 400 en la ruta. */
export class OrderValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OrderValidationError';
	}
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_CUSTOMER_FIELDS: (keyof OrderCustomer)[] = [
	'nombres',
	'apellidos',
	'pais',
	'direccion',
	'ciudad',
	'telefono',
	'email'
];

export function validateCustomer(customer: OrderCustomer): void {
	if (!customer || typeof customer !== 'object') {
		throw new OrderValidationError('Faltan los datos del comprador.');
	}

	for (const field of REQUIRED_CUSTOMER_FIELDS) {
		const value = customer[field];
		if (typeof value !== 'string' || value.trim() === '') {
			throw new OrderValidationError(`El campo "${field}" es obligatorio.`);
		}
	}

	if (!EMAIL_RE.test(customer.email)) {
		throw new OrderValidationError('El correo electrónico no es válido.');
	}
}

/** Genera un número de pedido legible: DM-<base36>. */
function generateOrderNumber(): string {
	const random = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `DM-${Date.now().toString(36).toUpperCase().slice(-5)}${random}`;
}

interface PricedLine extends OrderLineResult {
	itemSlug: string;
	variantId: string | null;
	unitPriceCents: number;
}

/**
 * Crea un pedido.
 *
 * Los precios y el stock salen del catálogo de la base; nunca del cliente.
 * El stock se descuenta con una condición `stock >= cantidad`, así que dos
 * compras simultáneas de la última unidad no pueden pasar ambas.
 */
export async function createOrder(payload: OrderPayload): Promise<OrderResult> {
	if (!payload || typeof payload !== 'object') {
		throw new OrderValidationError('El cuerpo del pedido es inválido.');
	}

	const { customer, lines, shipping } = payload;

	validateCustomer(customer);

	const shippingOption = getShippingOption(shipping);
	if (!shippingOption) {
		throw new OrderValidationError(`Método de entrega desconocido: ${String(shipping)}.`);
	}

	if (!Array.isArray(lines) || lines.length === 0) {
		throw new OrderValidationError('El pedido debe incluir al menos un producto.');
	}

	return db.transaction(async (tx) => {
		const priced: PricedLine[] = [];
		let subtotalCents = 0;

		for (const line of lines as OrderLineInput[]) {
			if (!line || typeof line.slug !== 'string') {
				throw new OrderValidationError('Hay una línea del pedido sin producto.');
			}

			const quantity = line.quantity;
			if (!Number.isInteger(quantity) || quantity < 1) {
				throw new OrderValidationError(
					`La cantidad de "${line.slug}" debe ser un entero mayor que cero.`
				);
			}

			const [item] = await tx
				.select()
				.from(shopItems)
				.where(eq(shopItems.slug, line.slug))
				.limit(1);

			if (!item) {
				throw new OrderValidationError(`El producto "${line.slug}" no existe.`);
			}

			const variantId = line.variantId ?? null;
			let unitPrice = item.priceCents;
			let name = item.name;

			if (variantId !== null) {
				const [variant] = await tx
					.select()
					.from(shopVariants)
					.where(
						and(
							eq(shopVariants.itemSlug, line.slug),
							eq(shopVariants.variantId, variantId)
						)
					)
					.limit(1);

				if (!variant) {
					throw new OrderValidationError(
						`La variante "${variantId}" no existe para "${item.name}".`
					);
				}

				unitPrice = variant.priceCents ?? item.priceCents;
				name = `${item.name} · ${variant.label}`;

				// Descuento atómico: solo pasa si queda stock suficiente.
				const updated = await tx
					.update(shopVariants)
					.set({ stock: sql`${shopVariants.stock} - ${quantity}` })
					.where(
						and(
							eq(shopVariants.id, variant.id),
							sql`${shopVariants.stock} >= ${quantity}`
						)
					)
					.returning({ stock: shopVariants.stock });

				if (updated.length === 0) {
					throw new OrderValidationError(
						variant.stock === 0
							? `"${item.name} · ${variant.label}" está agotado.`
							: `Solo quedan ${variant.stock} unidades de "${item.name} · ${variant.label}".`
					);
				}
			} else {
				const updated = await tx
					.update(shopItems)
					.set({ stock: sql`${shopItems.stock} - ${quantity}` })
					.where(
						and(eq(shopItems.id, item.id), sql`${shopItems.stock} >= ${quantity}`)
					)
					.returning({ stock: shopItems.stock });

				if (updated.length === 0) {
					throw new OrderValidationError(
						item.stock === 0
							? `"${item.name}" está agotado.`
							: `Solo quedan ${item.stock} unidades de "${item.name}".`
					);
				}
			}

			const totalCents = unitPrice * quantity;
			subtotalCents += totalCents;
			priced.push({
				itemSlug: line.slug,
				variantId,
				name,
				quantity,
				unitPriceCents: unitPrice,
				totalCents
			});
		}

		const shippingCents = shippingOption.costCents;
		const orderNumber = generateOrderNumber();

		const [order] = await tx
			.insert(orders)
			.values({
				orderNumber,
				customerNombres: customer.nombres.trim(),
				customerApellidos: customer.apellidos.trim(),
				customerPais: customer.pais.trim(),
				customerDireccion: customer.direccion.trim(),
				customerCiudad: customer.ciudad.trim(),
				customerTelefono: customer.telefono.trim(),
				customerEmail: customer.email.trim(),
				customerNotas: customer.notas?.trim() || null,
				subtotalCents,
				shippingCents,
				totalCents: subtotalCents + shippingCents,
				shipping: shippingOption.id,
				shippingLabel: shippingOption.label,
				status: 'pendiente',
				paymentStatus: 'sin-pago'
			})
			.returning();

		if (!order) throw new Error('No se pudo crear el pedido.');

		await tx.insert(orderLines).values(
			priced.map((line) => ({
				orderId: order.id,
				itemSlug: line.itemSlug,
				variantId: line.variantId,
				name: line.name,
				unitPriceCents: line.unitPriceCents,
				quantity: line.quantity,
				totalCents: line.totalCents
			}))
		);

		return {
			orderNumber: order.orderNumber,
			subtotalCents: order.subtotalCents,
			shippingCents: order.shippingCents,
			totalCents: order.totalCents,
			lines: priced.map(({ name, quantity, totalCents }) => ({ name, quantity, totalCents })),
			shippingLabel: order.shippingLabel
		};
	});
}

/** Pedido completo por número, con sus líneas. */
export async function getOrder(orderNumber: string): Promise<Order | undefined> {
	const [row] = await db
		.select()
		.from(orders)
		.where(eq(orders.orderNumber, orderNumber))
		.limit(1);

	if (!row) return undefined;
	return assembleOrder(row);
}

async function assembleOrder(row: typeof orders.$inferSelect): Promise<Order> {
	const lines = await db
		.select()
		.from(orderLines)
		.where(eq(orderLines.orderId, row.id))
		.orderBy(orderLines.id);

	return {
		orderNumber: row.orderNumber,
		subtotalCents: row.subtotalCents,
		shippingCents: row.shippingCents,
		totalCents: row.totalCents,
		lines: lines.map((line) => ({
			name: line.name,
			quantity: line.quantity,
			totalCents: line.totalCents
		})),
		shippingLabel: row.shippingLabel,
		customer: {
			nombres: row.customerNombres,
			apellidos: row.customerApellidos,
			pais: row.customerPais,
			direccion: row.customerDireccion,
			ciudad: row.customerCiudad,
			telefono: row.customerTelefono,
			email: row.customerEmail,
			...(row.customerNotas ? { notas: row.customerNotas } : {})
		},
		shipping: row.shipping,
		status: row.status,
		paymentStatus: row.paymentStatus,
		createdAt: row.createdAt.toISOString()
	};
}

/** Todos los pedidos, más reciente primero. */
export async function getAllOrders(): Promise<Order[]> {
	const rows = await db.select().from(orders).orderBy(desc(orders.createdAt), desc(orders.id));
	return Promise.all(rows.map(assembleOrder));
}

/** Cambia el estado de un pedido (para el panel). */
export async function setOrderStatus(
	orderNumber: string,
	status: OrderStatus,
	paymentStatus?: PaymentStatus
): Promise<Order | undefined> {
	const [row] = await db
		.update(orders)
		.set({
			status,
			...(paymentStatus ? { paymentStatus } : {}),
			updatedAt: new Date()
		})
		.where(eq(orders.orderNumber, orderNumber))
		.returning();

	return row ? assembleOrder(row) : undefined;
}
