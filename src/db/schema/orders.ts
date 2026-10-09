import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/pg-core';
import { orderStatusEnum, paymentStatusEnum, shippingIdEnum } from './enums.js';

/**
 * Pedidos.
 *
 * A diferencia del store en memoria, aquí un pedido guarda su cliente y sus
 * líneas como filas reales. Los totales se persisten tal como se calcularon:
 * si mañana cambia el precio de un producto, el pedido histórico no debe
 * cambiar.
 */
export const orders = pgTable(
	'orders',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		/** Número público: DM-XXXXXX. Es lo que la persona usa como referencia. */
		orderNumber: varchar('order_number', { length: 32 }).notNull().unique(),

		// --- Datos del comprador, desnormalizados a propósito ---
		// El pedido debe conservar a quién se le envió, aunque el cliente
		// cambie sus datos después.
		customerNombres: varchar('customer_nombres', { length: 120 }).notNull(),
		customerApellidos: varchar('customer_apellidos', { length: 120 }).notNull(),
		customerPais: varchar('customer_pais', { length: 120 }).notNull(),
		customerDireccion: text('customer_direccion').notNull(),
		customerCiudad: varchar('customer_ciudad', { length: 120 }).notNull(),
		customerTelefono: varchar('customer_telefono', { length: 60 }).notNull(),
		customerEmail: varchar('customer_email', { length: 255 }).notNull(),
		customerNotas: text('customer_notas'),

		// --- Totales en centavos, congelados al crear el pedido ---
		subtotalCents: integer('subtotal_cents').notNull(),
		shippingCents: integer('shipping_cents').notNull(),
		totalCents: integer('total_cents').notNull(),
		shipping: shippingIdEnum('shipping').notNull(),
		shippingLabel: varchar('shipping_label', { length: 120 }).notNull(),

		status: orderStatusEnum('status').notNull().default('pendiente'),
		paymentStatus: paymentStatusEnum('payment_status').notNull().default('sin-pago'),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('orders_email_idx').on(table.customerEmail),
		index('orders_status_idx').on(table.status),
		index('orders_payment_idx').on(table.paymentStatus),
		index('orders_created_idx').on(table.createdAt)
	]
);

/**
 * Líneas de un pedido.
 *
 * Guardan copia del nombre y del precio unitario en el momento de la compra:
 * el pedido es un documento histórico, no una vista del catálogo actual.
 * Por eso no hay foreign key al producto (si se borra, la línea sobrevive).
 */
export const orderLines = pgTable(
	'order_lines',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		orderId: integer('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),

		/** Slug del producto comprado, para referencia (no FK). */
		itemSlug: varchar('item_slug', { length: 120 }).notNull(),
		variantId: varchar('variant_id', { length: 60 }),

		/** Nombre tal como se mostró: «Camiseta Solidaria · Talla M». */
		name: varchar('name', { length: 255 }).notNull(),
		unitPriceCents: integer('unit_price_cents').notNull(),
		quantity: integer('quantity').notNull(),
		totalCents: integer('total_cents').notNull()
	},
	(table) => [index('order_lines_order_idx').on(table.orderId)]
);

/**
 * Canales de contacto y redes.
 *
 * `key` identifica el canal (whatsapp, instagram…). El número de WhatsApp vive
 * en una sola fila, que es lo que permite que exista una única definición.
 */
export const contactChannels = pgTable('contact_channels', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	key: varchar('key', { length: 60 }).notNull().unique(),
	label: varchar('label', { length: 120 }).notNull(),
	icon: varchar('icon', { length: 255 }).notNull(),
	href: text('href').notNull(),
	/** Número internacional sin signos, solo para canales telefónicos. */
	phoneNumber: varchar('phone_number', { length: 30 }),
	/** El mismo número presentable: «322 643 8857». */
	phoneDisplay: varchar('phone_display', { length: 40 }),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * Configuración suelta del sitio (clave/valor).
 *
 * Para datos únicos y simples que no merecen su propia tabla: el correo de
 * contacto, el texto «sobre nosotros». `jsonb` permite guardar números y
 * objetos sin inventar una columna por caso.
 */
export const siteSettings = pgTable('site_settings', {
	key: varchar('key', { length: 60 }).primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderLineRow = typeof orderLines.$inferSelect;
export type NewOrderLineRow = typeof orderLines.$inferInsert;
export type ContactChannelRow = typeof contactChannels.$inferSelect;
