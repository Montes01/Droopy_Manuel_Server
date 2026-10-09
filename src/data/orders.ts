import type {
	Order,
	OrderCustomer,
	OrderLineInput,
	OrderLineResult,
	OrderPayload,
	OrderResult
} from '../types.js';
import { itemBySlug, shippingById, unitPriceCents } from '../data/shop.js';

/**
 * Almacén de pedidos en memoria.
 *
 * Los pedidos viven mientras el proceso esté vivo: al reiniciar el servidor
 * se pierden. Si necesitas persistencia real, sustituye estas funciones por
 * una base de datos (SQLite, Postgres…) manteniendo la misma firma.
 */
const orders = new Map<string, Order>();

/** Error de validación del pedido: se traduce a un 400 en la ruta. */
export class OrderValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OrderValidationError';
	}
}

/** Número de pedido legible: DM-<base36>. */
function nextOrderNumber(): string {
	let candidate: string;
	do {
		candidate = 'DM-' + Date.now().toString(36).toUpperCase().slice(-6);
	} while (orders.has(candidate));
	return candidate;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida los datos del comprador. Lanza si algo obligatorio falta. */
function validateCustomer(customer: OrderCustomer): void {
	const required: (keyof OrderCustomer)[] = [
		'nombres',
		'apellidos',
		'pais',
		'direccion',
		'ciudad',
		'telefono',
		'email'
	];

	for (const field of required) {
		const value = customer[field];
		if (typeof value !== 'string' || value.trim() === '') {
			throw new OrderValidationError(`El campo "${field}" es obligatorio.`);
		}
	}

	if (!EMAIL_RE.test(customer.email)) {
		throw new OrderValidationError('El correo electrónico no es válido.');
	}
}

/**
 * Crea un pedido.
 *
 * Los totales se calculan aquí, nunca se aceptan del cliente: el precio y el
 * stock salen del catálogo del servidor, y se verifica que cada variante
 * exista y tenga unidades disponibles.
 */
export function createOrder(payload: OrderPayload): OrderResult {
	if (!payload || typeof payload !== 'object') {
		throw new OrderValidationError('El cuerpo del pedido es inválido.');
	}

	const { customer, lines, shipping } = payload;

	if (!customer || typeof customer !== 'object') {
		throw new OrderValidationError('Faltan los datos del comprador.');
	}
	validateCustomer(customer);

	const shippingOption = shippingById(shipping);
	if (!shippingOption) {
		throw new OrderValidationError(`Método de entrega desconocido: ${String(shipping)}.`);
	}

	if (!Array.isArray(lines) || lines.length === 0) {
		throw new OrderValidationError('El pedido debe incluir al menos un producto.');
	}

	const resultLines: OrderLineResult[] = [];
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

		const item = itemBySlug(line.slug);
		if (!item) {
			throw new OrderValidationError(`El producto "${line.slug}" no existe.`);
		}

		const variantId = line.variantId ?? null;
		if (variantId !== null && !item.variants.some((variant) => variant.id === variantId)) {
			throw new OrderValidationError(
				`La variante "${variantId}" no existe para "${item.name}".`
			);
		}

		const available = variantId
			? (item.variants.find((variant) => variant.id === variantId)?.stock ?? 0)
			: item.stock;
		if (quantity > available) {
			throw new OrderValidationError(
				available === 0
					? `"${item.name}" está agotado.`
					: `Solo quedan ${available} unidades de "${item.name}".`
			);
		}

		const unit = unitPriceCents(item, variantId);
		if (unit === null) {
			throw new OrderValidationError(`No se pudo resolver el precio de "${item.name}".`);
		}

		const variant = variantId
			? item.variants.find((entry) => entry.id === variantId)
			: undefined;
		const name = variant ? `${item.name} · ${variant.label}` : item.name;
		const totalCents = unit * quantity;

		subtotalCents += totalCents;
		resultLines.push({ name, quantity, totalCents });
	}

	const shippingCents = shippingOption.costCents;
	const orderNumber = nextOrderNumber();
	const createdAt = new Date().toISOString();

	const order: Order = {
		orderNumber,
		subtotalCents,
		shippingCents,
		totalCents: subtotalCents + shippingCents,
		lines: resultLines,
		shippingLabel: shippingOption.label,
		customer,
		shipping: shippingOption.id,
		status: 'pendiente',
		paymentStatus: 'sin-pago',
		createdAt
	};

	orders.set(orderNumber, order);

	return {
		orderNumber: order.orderNumber,
		subtotalCents: order.subtotalCents,
		shippingCents: order.shippingCents,
		totalCents: order.totalCents,
		lines: order.lines,
		shippingLabel: order.shippingLabel
	};
}

/** Pedido completo por número, o undefined si no existe. */
export function getOrder(orderNumber: string): Order | undefined {
	return orders.get(orderNumber);
}

/** Todos los pedidos, más reciente primero. */
export function allOrders(): Order[] {
	return [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
