import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enums del dominio.
 *
 * Los valores son los mismos que usa la API en español, tal como se acordó:
 * así no hay capa de traducción entre la base y el contrato del frontend.
 * Renombrar un valor aquí exige una migración que reescriba los datos.
 */

export const dogStatusEnum = pgEnum('dog_status', [
	'en-adopcion',
	'hogar-temporal',
	'adoptado',
	'en-memoria'
]);

export const dogSizeEnum = pgEnum('dog_size', ['pequeño', 'mediano', 'grande']);

export const dogSexEnum = pgEnum('dog_sex', ['macho', 'hembra']);

export const dogEnergyEnum = pgEnum('dog_energy', ['tranquilo', 'moderado', 'juguetón']);

export const shippingIdEnum = pgEnum('shipping_id', ['recogida', 'domicilio']);

export const orderStatusEnum = pgEnum('order_status', [
	'pendiente',
	'confirmado',
	'enviado',
	'entregado',
	'cancelado'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
	'sin-pago',
	'en-revision',
	'pagado',
	'rechazado'
]);

export const newsCategoryEnum = pgEnum('news_category', [
	'rescate',
	'adopcion',
	'salud',
	'evento',
	'tienda'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
	'transferencia',
	'billetera',
	'internacional'
]);

/** Rol de una persona con acceso al panel. */
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'editor']);
