import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shopCategories, shopItems, shopVariants } from '../db/schema/index.js';
import type { ShopCategory, ShopItem } from '../types.js';
import { toShopCategory, toShopItem } from './mappers.js';
import { ValidationError, optionalString, requireEnum, requireInt, requireString, slugify } from './validation.js';

/**
 * Escritura del catálogo de la tienda (panel de administración).
 *
 * Los productos y sus variantes se guardan en tablas distintas, así que crear
 * o editar un producto con variantes se hace en una transacción: o se guarda
 * todo, o no se guarda nada.
 */

export interface ShopCategoryInput {
	slug?: string;
	name?: string;
	emoji?: string;
	blurb?: string;
	sortOrder?: number;
}

export interface ShopVariantInput {
	id?: string;
	label?: string;
	priceCents?: number | null;
	stock?: number;
	sku?: string | null;
}

export interface ShopItemInput {
	slug?: string;
	name?: string;
	category?: string;
	priceCents?: number;
	description?: string;
	details?: string;
	photo?: string | null;
	emoji?: string;
	tags?: string[];
	stock?: number;
	featured?: boolean;
	sortOrder?: number;
	/** Si viene, reemplaza por completo las variantes del producto. */
	variants?: ShopVariantInput[];
}

// ------------------------------------------------------------- Categorías

export async function createCategory(input: ShopCategoryInput): Promise<ShopCategory> {
	const name = requireString(input.name, 'name', 120);
	const slug = input.slug ? slugify(input.slug) : slugify(name);
	if (!slug) throw new ValidationError('No se pudo derivar un slug válido.');

	const [existing] = await db
		.select()
		.from(shopCategories)
		.where(eq(shopCategories.slug, slug))
		.limit(1);
	if (existing) throw new ValidationError(`Ya existe la categoría "${slug}".`);

	const [row] = await db
		.insert(shopCategories)
		.values({
			slug,
			name,
			emoji: optionalString(input.emoji, 'emoji', 16),
			blurb: requireString(input.blurb, 'blurb', 2000),
			sortOrder: input.sortOrder !== undefined ? requireInt(input.sortOrder, 'sortOrder') : 0
		})
		.returning();

	if (!row) throw new Error('No se pudo crear la categoría.');
	return toShopCategory(row);
}

export async function updateCategory(
	slug: string,
	input: ShopCategoryInput
): Promise<ShopCategory | undefined> {
	const values: Record<string, unknown> = {};
	if (input.name !== undefined) values.name = requireString(input.name, 'name', 120);
	if (input.emoji !== undefined) values.emoji = optionalString(input.emoji, 'emoji', 16);
	if (input.blurb !== undefined) values.blurb = requireString(input.blurb, 'blurb', 2000);
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(shopCategories)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(shopCategories.slug, slug))
		.returning();

	return row ? toShopCategory(row) : undefined;
}

/**
 * Borra una categoría.
 *
 * Falla si todavía tiene productos: la clave foránea es `restrict` a propósito,
 * para no dejar productos huérfanos.
 */
export async function deleteCategory(slug: string): Promise<boolean | 'tiene-productos'> {
	const items = await db
		.select({ id: shopItems.id })
		.from(shopItems)
		.where(eq(shopItems.categorySlug, slug));

	if (items.length > 0) return 'tiene-productos';

	const deleted = await db
		.delete(shopCategories)
		.where(eq(shopCategories.slug, slug))
		.returning({ id: shopCategories.id });
	return deleted.length > 0;
}

// -------------------------------------------------------------- Productos

/** Valida y normaliza las variantes que llegan del panel. */
function buildVariants(itemSlug: string, input: ShopVariantInput[]) {
	if (!Array.isArray(input)) {
		throw new ValidationError('El campo "variants" debe ser una lista.');
	}

	const seen = new Set<string>();

	return input.map((variant, index) => {
		const label = requireString(variant.label, 'variants[].label', 120);
		const rawId = variant.id ? String(variant.id) : slugify(label);
		const variantId = rawId || `v${index + 1}`;

		if (seen.has(variantId)) {
			throw new ValidationError(`La variante "${variantId}" está repetida.`);
		}
		seen.add(variantId);

		let priceCents: number | null = null;
		if (variant.priceCents !== undefined && variant.priceCents !== null) {
			priceCents = requireInt(variant.priceCents, `variants[${variantId}].priceCents`);
		}

		return {
			itemSlug,
			variantId,
			label,
			priceCents,
			stock: requireInt(variant.stock ?? 0, `variants[${variantId}].stock`),
			sku: variant.sku ? String(variant.sku).trim() : null,
			sortOrder: index
		};
	});
}

function buildItemValues(input: ShopItemInput, partial: boolean) {
	const values: Record<string, unknown> = {};

	if (!partial || input.name !== undefined) {
		values.name = requireString(input.name, 'name', 160);
	}
	if (!partial || input.category !== undefined) {
		values.categorySlug = requireString(input.category, 'category', 120);
	}
	if (!partial || input.priceCents !== undefined) {
		values.priceCents = requireInt(input.priceCents, 'priceCents');
	}
	if (!partial || input.description !== undefined) {
		values.description = requireString(input.description, 'description', 2000);
	}
	if (!partial || input.details !== undefined) {
		values.details = requireString(input.details, 'details', 5000);
	}
	if (!partial || input.emoji !== undefined) {
		values.emoji = optionalString(input.emoji, 'emoji', 16);
	}

	if (input.photo !== undefined) values.photo = input.photo || null;
	if (input.stock !== undefined) values.stock = requireInt(input.stock, 'stock');
	if (input.featured !== undefined) values.featured = Boolean(input.featured);
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');
	if (input.tags !== undefined) {
		if (!Array.isArray(input.tags)) {
			throw new ValidationError('El campo "tags" debe ser una lista.');
		}
		values.tags = input.tags.map((tag) => String(tag).trim()).filter(Boolean);
	}

	return values;
}

export async function createItem(input: ShopItemInput): Promise<ShopItem> {
	const values = buildItemValues(input, false);
	const name = String(values.name);
	const slug = input.slug ? slugify(input.slug) : slugify(name);
	if (!slug) throw new ValidationError('No se pudo derivar un slug válido.');

	const [existing] = await db
		.select()
		.from(shopItems)
		.where(eq(shopItems.slug, slug))
		.limit(1);
	if (existing) throw new ValidationError(`Ya existe un producto con el slug "${slug}".`);

	const [category] = await db
		.select()
		.from(shopCategories)
		.where(eq(shopCategories.slug, String(values.categorySlug)))
		.limit(1);
	if (!category) {
		throw new ValidationError(`No existe la categoría "${values.categorySlug}".`);
	}

	const variants = input.variants ? buildVariants(slug, input.variants) : [];

	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(shopItems)
			.values({ ...(values as typeof shopItems.$inferInsert), slug })
			.returning();

		if (!row) throw new Error('No se pudo crear el producto.');

		if (variants.length > 0) {
			await tx.insert(shopVariants).values(variants);
		}

		return toShopItem(row, await tx.select().from(shopVariants).where(eq(shopVariants.itemSlug, slug)));
	});
}

export async function updateItem(
	slug: string,
	input: ShopItemInput
): Promise<ShopItem | undefined> {
	const values = buildItemValues(input, true);

	// Si cambia la categoría, debe existir.
	if (values.categorySlug !== undefined) {
		const [category] = await db
			.select()
			.from(shopCategories)
			.where(eq(shopCategories.slug, String(values.categorySlug)))
			.limit(1);
		if (!category) {
			throw new ValidationError(`No existe la categoría "${values.categorySlug}".`);
		}
	}

	const replaceVariants = input.variants !== undefined;
	const variants = replaceVariants ? buildVariants(slug, input.variants ?? []) : [];

	if (Object.keys(values).length === 0 && !replaceVariants) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	return db.transaction(async (tx) => {
		const [row] = await tx
			.update(shopItems)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(shopItems.slug, slug))
			.returning();

		if (!row) return undefined;

		// Reemplazo completo: más predecible que intentar diferenciar altas,
		// bajas y cambios desde el panel.
		if (replaceVariants) {
			await tx.delete(shopVariants).where(eq(shopVariants.itemSlug, slug));
			if (variants.length > 0) {
				await tx.insert(shopVariants).values(variants);
			}
		}

		const finalVariants = await tx
			.select()
			.from(shopVariants)
			.where(eq(shopVariants.itemSlug, slug));

		return toShopItem(row, finalVariants);
	});
}

export async function deleteItem(slug: string): Promise<boolean> {
	// Las variantes caen solas: la FK es `on delete cascade`.
	const deleted = await db.delete(shopItems).where(eq(shopItems.slug, slug)).returning({
		id: shopItems.id
	});
	return deleted.length > 0;
}

/** Ajusta el stock de una variante concreta (o del producto si no hay variante). */
export async function setStock(
	slug: string,
	variantId: string | null,
	stock: number
): Promise<ShopItem | undefined> {
	const value = requireInt(stock, 'stock');

	return db.transaction(async (tx) => {
		if (variantId === null) {
			const [row] = await tx
				.update(shopItems)
				.set({ stock: value, updatedAt: new Date() })
				.where(eq(shopItems.slug, slug))
				.returning();
			if (!row) return undefined;

			const variants = await tx
				.select()
				.from(shopVariants)
				.where(eq(shopVariants.itemSlug, slug));
			return toShopItem(row, variants);
		}

		const updated = await tx
			.update(shopVariants)
			.set({ stock: value })
			.where(
				and(eq(shopVariants.itemSlug, slug), eq(shopVariants.variantId, variantId))
			)
			.returning();

		if (updated.length === 0) return undefined;

		const [row] = await tx.select().from(shopItems).where(eq(shopItems.slug, slug)).limit(1);
		if (!row) return undefined;

		const variants = await tx
			.select()
			.from(shopVariants)
			.where(eq(shopVariants.itemSlug, slug));
		return toShopItem(row, variants);
	});
}

export { requireEnum };
