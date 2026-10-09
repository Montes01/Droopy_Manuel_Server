import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shopCategories, shopItems, shopVariants } from '../db/schema/index.js';
import type { ShippingOption, ShopCategory, ShopItem, ShopVariant } from '../types.js';
import { toShopCategory, toShopItem } from './mappers.js';

/**
 * Acceso a la tienda solidaria.
 *
 * Los productos se leen con sus variantes en dos consultas (productos y
 * variantes) en lugar de un join que duplicaría filas: se agrupan en memoria,
 * que es más simple y evita el problema clásico de N+1.
 */

const CATEGORY_ORDER = [asc(shopCategories.sortOrder), asc(shopCategories.id)];
const ITEM_ORDER = [asc(shopItems.sortOrder), asc(shopItems.id)];
const VARIANT_ORDER = [asc(shopVariants.sortOrder), asc(shopVariants.id)];

/** Costos de envío. Son reglas de negocio, no contenido editable. */
const SHIPPING_OPTIONS: ShippingOption[] = [
	{
		id: 'recogida',
		label: 'Recogida local',
		detail: 'Gratis · coordinamos el punto',
		costCents: 0
	},
	{
		id: 'domicilio',
		label: 'Envío a domicilio',
		detail: 'Entrega puerta a puerta',
		costCents: 600000
	}
];

export function getShippingOptions(): ShippingOption[] {
	return SHIPPING_OPTIONS;
}

export function getShippingOption(id: string): ShippingOption | undefined {
	return SHIPPING_OPTIONS.find((option) => option.id === id);
}

/** Carga las variantes de varios productos y las agrupa por slug. */
async function variantsByItem(slugs: string[]): Promise<Map<string, (typeof shopVariants.$inferSelect)[]>> {
	const grouped = new Map<string, (typeof shopVariants.$inferSelect)[]>();
	if (slugs.length === 0) return grouped;

	const rows = await db
		.select()
		.from(shopVariants)
		.where(inArray(shopVariants.itemSlug, slugs))
		.orderBy(...VARIANT_ORDER);

	for (const row of rows) {
		const list = grouped.get(row.itemSlug) ?? [];
		list.push(row);
		grouped.set(row.itemSlug, list);
	}
	return grouped;
}

export async function getCategories(): Promise<ShopCategory[]> {
	const rows = await db.select().from(shopCategories).orderBy(...CATEGORY_ORDER);
	return rows.map(toShopCategory);
}

export async function getCategory(slug: string): Promise<ShopCategory | undefined> {
	const [row] = await db
		.select()
		.from(shopCategories)
		.where(eq(shopCategories.slug, slug))
		.limit(1);
	return row ? toShopCategory(row) : undefined;
}

export async function getItems(categorySlug?: string): Promise<ShopItem[]> {
	const rows = categorySlug
		? await db
				.select()
				.from(shopItems)
				.where(eq(shopItems.categorySlug, categorySlug))
				.orderBy(...ITEM_ORDER)
		: await db.select().from(shopItems).orderBy(...ITEM_ORDER);

	const variants = await variantsByItem(rows.map((row) => row.slug));
	return rows.map((row) => toShopItem(row, variants.get(row.slug) ?? []));
}

export async function getItem(slug: string): Promise<ShopItem | undefined> {
	const [row] = await db.select().from(shopItems).where(eq(shopItems.slug, slug)).limit(1);
	if (!row) return undefined;

	const variants = await variantsByItem([slug]);
	return toShopItem(row, variants.get(slug) ?? []);
}

export async function getFeaturedItems(): Promise<ShopItem[]> {
	const rows = await db
		.select()
		.from(shopItems)
		.where(eq(shopItems.featured, true))
		.orderBy(...ITEM_ORDER);

	const variants = await variantsByItem(rows.map((row) => row.slug));
	return rows.map((row) => toShopItem(row, variants.get(row.slug) ?? []));
}

/**
 * Precio efectivo de un producto según su variante (en centavos).
 * Devuelve null si el producto o la variante no existen.
 */
export async function unitPriceCents(
	itemSlug: string,
	variantId: string | null
): Promise<number | null> {
	const [item] = await db
		.select()
		.from(shopItems)
		.where(eq(shopItems.slug, itemSlug))
		.limit(1);
	if (!item) return null;

	if (variantId === null) return item.priceCents;

	const variant = await getVariant(itemSlug, variantId);
	if (!variant) return null;
	return variant.priceCents ?? item.priceCents;
}

/** Variante concreta de un producto, o undefined. */
export async function getVariant(
	itemSlug: string,
	variantId: string
): Promise<ShopVariant | undefined> {
	const [row] = await db
		.select()
		.from(shopVariants)
		.where(and(eq(shopVariants.itemSlug, itemSlug), eq(shopVariants.variantId, variantId)))
		.limit(1);

	if (!row) return undefined;

	const variant: ShopVariant = { id: row.variantId, label: row.label, stock: row.stock };
	if (row.priceCents !== null) variant.priceCents = row.priceCents;
	if (row.sku !== null) variant.sku = row.sku;
	return variant;
}
