/**
 * Conversión de filas de base de datos a tipos de dominio.
 *
 * La API expone exactamente los mismos objetos que antes de la migración: la
 * base usa columnas planas (`good_with_kids`, `category_slug`) y el contrato
 * usa objetos anidados (`goodWith.kids`, `category`). Todo ese reacomodo vive
 * aquí y en ningún otro sitio.
 */
import type {
	BankAccount,
	Dog,
	DogNews,
	DonationTarget,
	DonationTier,
	NewsItem,
	ProjectSection,
	SiteContact,
	SiteContent,
	SiteStats,
	ShippingOption,
	ShopCategory,
	ShopItem,
	ShopVariant,
	Testimonial
} from '../types.js';
import type {
	BankAccountRow,
	ContactChannelRow,
	DogNewsRow,
	DogRow,
	DonationTargetRow,
	DonationTierRow,
	NewsRow,
	ProjectSectionRow,
	ShopCategoryRow,
	ShopItemRow,
	ShopVariantRow,
	TestimonialRow
} from '../db/schema/index.js';

export function toDog(row: DogRow): Dog {
	const dog: Dog = {
		slug: row.slug,
		name: row.name,
		breed: row.breed,
		birthDate: row.birthDate,
		isApprox: row.isApprox,
		sex: row.sex,
		size: row.size,
		energy: row.energy,
		goodWith: {
			kids: row.goodWithKids,
			dogs: row.goodWithDogs,
			cats: row.goodWithCats
		},
		vaccinated: row.vaccinated,
		sterilized: row.sterilized,
		status: row.status,
		arrival: row.arrival,
		traits: row.traits,
		story: row.story,
		photo: row.photo
	};

	// Opcional: solo se incluye cuando es true, para que el JSON no arrastre
	// `featured: false` en cada perrito como antes.
	if (row.featured) dog.featured = true;

	// Opcional: null/ausente = marrón de la marca en el frontend.
	if (row.color) dog.color = row.color;

	return dog;
}

export function toShopCategory(row: ShopCategoryRow): ShopCategory {
	return {
		slug: row.slug,
		name: row.name,
		emoji: row.emoji,
		blurb: row.blurb
	};
}

export function toShopVariant(row: ShopVariantRow): ShopVariant {
	const variant: ShopVariant = {
		id: row.variantId,
		label: row.label,
		stock: row.stock
	};
	if (row.priceCents !== null) variant.priceCents = row.priceCents;
	if (row.sku !== null) variant.sku = row.sku;
	return variant;
}

/** Compone un producto con sus variantes ya resueltas. */
export function toShopItem(row: ShopItemRow, variants: ShopVariantRow[]): ShopItem {
	const item: ShopItem = {
		slug: row.slug,
		name: row.name,
		category: row.categorySlug,
		priceCents: row.priceCents,
		description: row.description,
		details: row.details,
		photo: row.photo,
		emoji: row.emoji,
		tags: row.tags,
		variants: variants.map(toShopVariant),
		stock: row.stock
	};
	if (row.featured) item.featured = true;
	return item;
}

export function toDogNews(row: DogNewsRow): DogNews {
	const item: DogNews = {
		id: row.id,
		dogSlug: row.dogSlug,
		kind: row.kind,
		title: row.title,
		body: row.body,
		date: row.date,
		photo: row.photo
	};

	// Opcional: solo se incluye cuando es true, como `featured` en toDog.
	if (row.urgent) item.urgent = true;

	return item;
}

export function toNewsItem(row: NewsRow, relatedDogSlugs: string[]): NewsItem {
	const item: NewsItem = {
		slug: row.slug,
		title: row.title,
		excerpt: row.excerpt,
		body: row.body,
		date: row.date,
		category: row.category,
		tags: row.tags,
		photo: row.photo,
		emoji: row.emoji,
		relatedDogSlugs
	};
	if (row.featured) item.featured = true;
	return item;
}

/** Una fila de `project_sections` tal como la consume el frontend. */
export function toProjectSection(row: ProjectSectionRow): ProjectSection {
	return {
		id: row.id,
		position: row.position,
		kind: row.kind,
		title: row.title,
		body: row.body
	};
}

export function toDonationTier(row: DonationTierRow): DonationTier {
	return {
		stars: row.stars,
		name: row.name,
		priceCents: row.priceCents,
		currency: row.currency,
		blurb: row.blurb,
		perks: row.perks
	};
}

export function toTestimonial(row: TestimonialRow): Testimonial {
	const testimonial: Testimonial = {
		id: row.id,
		name: row.name,
		role: row.role,
		quote: row.quote
	};
	if (row.dogSlug) testimonial.dog = row.dogSlug;
	return testimonial;
}

export function toBankAccount(row: BankAccountRow): BankAccount {
	return {
		id: row.id,
		bank: row.bank,
		emoji: row.emoji,
		method: row.method,
		holder: row.holder,
		// `fields` viene como jsonb: se valida la forma mínima.
		fields: Array.isArray(row.fields)
			? (row.fields as BankAccount['fields'])
			: []
	};
}

export function toDonationTarget(row: DonationTargetRow, dog: Dog): DonationTarget {
	const target: DonationTarget = { dog };
	if (row.goalCents !== null) target.goalCents = row.goalCents;
	return target;
}

export function toShippingOption(row: {
	id: ShippingOption['id'];
	label: string;
	detail: string;
	costCents: number;
}): ShippingOption {
	return {
		id: row.id,
		label: row.label,
		detail: row.detail,
		costCents: row.costCents
	};
}

/**
 * Compone el contacto del sitio a partir de los canales y la configuración.
 *
 * El número de WhatsApp sale del canal marcado como tal: sigue habiendo una
 * sola definición, ahora en la base.
 */
export function toSiteContact(
	channels: ContactChannelRow[],
	email: string
): SiteContact {
	const whatsapp = channels.find((channel) => channel.key === 'whatsapp');
	const number = whatsapp?.phoneNumber ?? '';
	const display = whatsapp?.phoneDisplay ?? '';

	return {
		whatsappNumber: number,
		whatsappDisplay: display,
		whatsappUrl: number ? `https://wa.me/${number}` : '',
		email,
		socials: channels.map((channel) => ({
			key: channel.key,
			label: channel.label,
			icon: channel.icon,
			href: channel.href
		}))
	};
}

export function toSiteContent(aboutBlurb: string, stats: SiteStats): SiteContent {
	return { aboutBlurb, stats };
}
