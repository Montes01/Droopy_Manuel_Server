import { boolean, index, integer, pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

/** Categorías de la tienda solidaria. `slug` se usa en /tienda/[slug]. */
export const shopCategories = pgTable('shop_categories', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	slug: varchar('slug', { length: 120 }).notNull().unique(),
	name: varchar('name', { length: 120 }).notNull(),
	emoji: varchar('emoji', { length: 16 }).notNull(),
	blurb: text('blurb').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Productos. Se referencian a su categoría por `slug` (no por id) porque el
 * contrato de la API expone `category: 'ropa'`, y así la respuesta no necesita
 * un join para saber el slug.
 */
export const shopItems = pgTable(
	'shop_items',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		slug: varchar('slug', { length: 120 }).notNull().unique(),
		name: varchar('name', { length: 160 }).notNull(),
		categorySlug: varchar('category_slug', { length: 120 })
			.notNull()
			.references(() => shopCategories.slug, { onUpdate: 'cascade', onDelete: 'restrict' }),

		/** Precio base en centavos de COP. Entero, nunca decimal. */
		priceCents: integer('price_cents').notNull(),

		description: text('description').notNull(),
		details: text('details').notNull(),
		photo: varchar('photo', { length: 255 }),
		emoji: varchar('emoji', { length: 16 }).notNull(),
		tags: text('tags').array().notNull().default([]),

		/** Unidades cuando el producto no tiene variantes. */
		stock: integer('stock').notNull().default(0),
		featured: boolean('featured').notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('shop_items_category_idx').on(table.categorySlug),
		index('shop_items_featured_idx').on(table.featured)
	]
);

/**
 * Variantes de un producto (talla, color…). Es una tabla propia en vez de un
 * array embebido porque el stock cambia por variante y necesitamos poder
 * descontarlo con una condición atómica al crear un pedido.
 *
 * `priceCents` nulo significa «usa el precio del producto».
 */
export const shopVariants = pgTable(
	'shop_variants',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		itemSlug: varchar('item_slug', { length: 120 })
			.notNull()
			.references(() => shopItems.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),

		/** Identificador de la variante dentro del producto: 's', 'm', 'xl'. */
		variantId: varchar('variant_id', { length: 60 }).notNull(),
		label: varchar('label', { length: 120 }).notNull(),
		priceCents: integer('price_cents'),
		stock: integer('stock').notNull().default(0),
		sku: varchar('sku', { length: 60 }),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(table) => [
		unique('shop_variants_item_variant_unique').on(table.itemSlug, table.variantId),
		index('shop_variants_item_idx').on(table.itemSlug)
	]
);

export type ShopCategoryRow = typeof shopCategories.$inferSelect;
export type ShopItemRow = typeof shopItems.$inferSelect;
export type ShopVariantRow = typeof shopVariants.$inferSelect;
export type NewShopItemRow = typeof shopItems.$inferInsert;
export type NewShopVariantRow = typeof shopVariants.$inferInsert;
