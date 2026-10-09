import type { Cents, ShippingId, ShippingOption, ShopCategory, ShopItem } from '../types.js';

/**
 * Tienda solidaria: catálogo de la fundación.
 * Precios en centavos de COP (entero). 4500000 === $45.000.
 */

/** Envío a domicilio, en centavos. La recogida local es gratis. */
export const SHIPPING_COST_CENTS: Cents = 600000;

export const shippingOptions: ShippingOption[] = [
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
		costCents: SHIPPING_COST_CENTS
	}
];

export const shopCategories: ShopCategory[] = [
	{
		slug: 'alimento',
		name: 'Alimento',
		emoji: '🍖',
		blurb: 'Croquetas, snacks y premios que también alimentan a la manada.'
	},
	{
		slug: 'juguetes',
		name: 'Juguetes',
		emoji: '🎾',
		blurb: 'Pelotas, mordedores y juguetes para consentir a tu peludo.'
	},
	{
		slug: 'accesorios',
		name: 'Accesorios',
		emoji: '🦮',
		blurb: 'Collares, correas, platos y todo para el día a día.'
	},
	{
		slug: 'ropa',
		name: 'Ropa',
		emoji: '👕',
		blurb: 'Camisetas, buzos y gorras para vestir a la manada con orgullo.'
	},
	{
		slug: 'hogar',
		name: 'Hogar',
		emoji: '🏠',
		blurb: 'Camas, cobijas y cojines para descansar con mucho amor.'
	},
	{
		slug: 'merch',
		name: 'Merch solidario',
		emoji: '🐾',
		blurb: 'Llaveros, tazas, stickers y detalles de Droopy Manuel.'
	}
];

export const shopItems: ShopItem[] = [
	// --- Alimento ---
	{
		slug: 'croquetas-adulto-3kg',
		name: 'Croquetas Adulto 3 kg',
		category: 'alimento',
		priceCents: 4500000,
		description: 'Bulto de 3 kg de croquetas balanceadas para perro adulto.',
		details:
			'Fórmula completa con proteína de pollo y arroz. Apta para perros de todas las razas desde el año de edad. Cada compra financia una semana de comida para un rescatado.',
		photo: null,
		emoji: '🍖',
		tags: ['3 kg', 'Pollo y arroz', 'Adulto'],
		variants: [],
		stock: 24,
		featured: true
	},
	{
		slug: 'croquetas-cachorro-2kg',
		name: 'Croquetas Cachorro 2 kg',
		category: 'alimento',
		priceCents: 3800000,
		description: 'Croquetas con calcio y DHA para cachorros en crecimiento.',
		details:
			'Bulto de 2 kg pensado para cachorros de 2 a 12 meses. Más pequeños y fáciles de masticar, con calcio y DHA para un desarrollo sano.',
		photo: null,
		emoji: '🐶',
		tags: ['2 kg', 'Cachorro', 'DHA'],
		variants: [],
		stock: 18
	},
	{
		slug: 'snacks-entrenamiento',
		name: 'Snacks de Entrenamiento',
		category: 'alimento',
		priceCents: 1800000,
		description: 'Bolsita de premios suaves para premiar buenas conductas.',
		details:
			'Premios blandos y pequeños, ideales para sesiones de entrenamiento. Sin colorantes artificiales.',
		photo: null,
		emoji: '🦴',
		tags: ['150 g', 'Premio'],
		variants: [],
		stock: 40
	},

	// --- Juguetes ---
	{
		slug: 'pelota-resistente',
		name: 'Pelota Resistente',
		category: 'juguetes',
		priceCents: 2200000,
		description: 'Pelota de caucho natural resistente a mordidas fuertes.',
		details:
			'Caucho no tóxico de alta resistencia, rebota mucho y flota. Perfecta para lanzar y morder sin romperse al primer intento.',
		photo: null,
		emoji: '🎾',
		tags: ['Caucho', 'Flota', 'Antimordida'],
		variants: [
			{ id: 's', label: 'Talla S', stock: 15, sku: 'PEL-S' },
			{ id: 'm', label: 'Talla M', stock: 12, sku: 'PEL-M' },
			{ id: 'l', label: 'Talla L', stock: 0, sku: 'PEL-L' }
		],
		stock: 0,
		featured: true
	},
	{
		slug: 'cuerda-tres-nudos',
		name: 'Cuerda de Tres Nudos',
		category: 'juguetes',
		priceCents: 2000000,
		description: 'Cuerda de algodón para jalar y limpiar los dientes.',
		details:
			'Juguete de jalar con tres nudos, ayuda a la limpieza dental y a gastar energía. Algodón resistente y seguro.',
		photo: null,
		emoji: '🪢',
		tags: ['Algodón', 'Dental'],
		variants: [],
		stock: 30
	},
	{
		slug: 'mordedor-kong',
		name: 'Mordedor Rellenable',
		category: 'juguetes',
		priceCents: 3200000,
		description: 'Mordedor de caucho que puedes rellenar con premios.',
		details:
			'Rellénalo con pasta o premios y congélalo: horas de entretenimiento para perros ansiosos o enérgicos.',
		photo: null,
		emoji: '🧩',
		tags: ['Rellenable', 'Anti-estrés'],
		variants: [],
		stock: 16
	},

	// --- Accesorios ---
	{
		slug: 'collar-ajustable',
		name: 'Collar Ajustable',
		category: 'accesorios',
		priceCents: 2800000,
		description: 'Collar de nylon con hebilla metálica y talla ajustable.',
		details:
			'Disponible en tallas S, M y L. Nylon suave pero resistente, con anillo metálico reforzado para el arnés o la placa.',
		photo: null,
		emoji: '🦮',
		tags: ['Nylon', 'Ajustable'],
		variants: [
			{ id: 's', label: 'Talla S', stock: 10, sku: 'COL-S' },
			{ id: 'm', label: 'Talla M', stock: 14, sku: 'COL-M' },
			{ id: 'l', label: 'Talla L', stock: 8, sku: 'COL-L' }
		],
		stock: 0,
		featured: true
	},
	{
		slug: 'correa-reflectiva',
		name: 'Correa Reflectiva',
		category: 'accesorios',
		priceCents: 3500000,
		description: 'Correa de 1.5 m con costura reflectiva para paseos de noche.',
		details:
			'Correa de 1,5 metros con cinta reflectiva en toda la longitud. Mango acolchado para un agarre cómodo y seguro.',
		photo: null,
		emoji: '🌙',
		tags: ['1.5 m', 'Reflectiva'],
		variants: [],
		stock: 22
	},
	{
		slug: 'comedero-silicona',
		name: 'Comedero Plegable',
		category: 'accesorios',
		priceCents: 2500000,
		description: 'Plato de silicona plegable para viajes y paseos.',
		details:
			'Dos compartimentos plegables, fácil de lavar y llevar. Ideal para el parque, la calle o de viaje.',
		photo: null,
		emoji: '🥣',
		tags: ['Silicona', 'Plegable'],
		variants: [],
		stock: 27
	},

	// --- Ropa ---
	{
		slug: 'camiseta-solidaria',
		name: 'Camiseta Solidaria',
		category: 'ropa',
		priceCents: 5500000,
		description: 'Camiseta de algodón con el logo de la fundación.',
		details:
			'Camiseta unisex 100% algodón peinado, estampado de Droopy Manuel. El 100% de la venta va a la manada.',
		photo: null,
		emoji: '👕',
		tags: ['Algodón', 'Unisex'],
		variants: [
			{ id: 's', label: 'Talla S', stock: 9, sku: 'CAM-S' },
			{ id: 'm', label: 'Talla M', stock: 12, sku: 'CAM-M' },
			{ id: 'l', label: 'Talla L', stock: 7, sku: 'CAM-L' },
			{ id: 'xl', label: 'Talla XL', stock: 4, sku: 'CAM-XL' }
		],
		stock: 0,
		featured: true
	},
	{
		slug: 'buzo-con-capucha',
		name: 'Buzo con Capucha',
		category: 'ropa',
		priceCents: 9500000,
		description: 'Buzo abrigado con capucha y bolsillo canguro.',
		details:
			'Buzo de felpa perchada con capucha, cordón y bolsillo canguro. Interior suave y cálido, con diseño de la manada.',
		photo: null,
		emoji: '🧥',
		tags: ['Felpa', 'Unisex'],
		variants: [
			{ id: 'm', label: 'Talla M', stock: 6, sku: 'BUZ-M' },
			{ id: 'l', label: 'Talla L', stock: 5, sku: 'BUZ-L' }
		],
		stock: 0
	},
	{
		slug: 'gorra-paw',
		name: 'Gorra Paw',
		category: 'ropa',
		priceCents: 4800000,
		description: 'Gorra ajustable con huellita bordada.',
		details:
			'Gorra de algodón con broche ajustable y huellita bordada. Talla única para toda la manada.',
		photo: null,
		emoji: '🧢',
		tags: ['Bordada', 'Talla única'],
		variants: [],
		stock: 20
	},

	// --- Hogar ---
	{
		slug: 'cama-acolchada-m',
		name: 'Cama Acolchada M',
		category: 'hogar',
		priceCents: 8500000,
		description: 'Cama acolchada de 60 × 45 cm, lavable y antideslizante.',
		details:
			'Espuma de alta densidad con funda removible y lavable. Base antideslizante. Tamaño mediano, ideal para perros de 10 a 20 kg.',
		photo: null,
		emoji: '🛏️',
		tags: ['60×45 cm', 'Lavable'],
		variants: [],
		stock: 11,
		featured: true
	},
	{
		slug: 'cobija-termica',
		name: 'Cobija Térmica',
		category: 'hogar',
		priceCents: 4500000,
		description: 'Cobija suave que conserva el calor en noches frías.',
		details:
			'Tela polar doble cara, muy suave y fácil de lavar. Perfecta para el descanso diario o para los perritos en el refugio.',
		photo: null,
		emoji: '🧣',
		tags: ['Polar', 'Suave'],
		variants: [],
		stock: 19
	},
	{
		slug: 'cojin-descanso',
		name: 'Cojín de Descanso',
		category: 'hogar',
		priceCents: 6500000,
		description: 'Cojín ortopédico para perros mayores o con dolencias.',
		details:
			'Espuma viscoelástica que reparte el peso y alivia las articulaciones. Recomendado para perros mayores o con displasia.',
		photo: null,
		emoji: '💤',
		tags: ['Ortopédico', 'Viscoelástica'],
		variants: [],
		stock: 9
	},

	// --- Merch ---
	{
		slug: 'llavero-droopy',
		name: 'Llavero Droopy',
		category: 'merch',
		priceCents: 1500000,
		description: 'Llavero metálico con la silueta de Droopy.',
		details:
			'Llavero de metal con baño dorado y la silueta de Droopy. Un detalle pequeño que apoya a la manada.',
		photo: null,
		emoji: '🔑',
		tags: ['Metal', 'Dorado'],
		variants: [],
		stock: 50
	},
	{
		slug: 'taza-manada',
		name: 'Taza Manada',
		category: 'merch',
		priceCents: 4200000,
		description: 'Taza de cerámica de 350 ml con las huellitas de la manada.',
		details:
			'Taza de cerámica de 350 ml, apta para microondas y lavavajillas. Estampado resistente de la manada comunitaria.',
		photo: null,
		emoji: '☕',
		tags: ['350 ml', 'Cerámica'],
		variants: [],
		stock: 33,
		featured: true
	},
	{
		slug: 'stickers-pack',
		name: 'Pack de Stickers',
		category: 'merch',
		priceCents: 1200000,
		description: 'Pack de 10 stickers resistentes al agua.',
		details:
			'Diez stickers con ilustraciones de la manada, vinilo resistente al agua. Perfectos para el portátil, la botella o el carro.',
		photo: null,
		emoji: '✨',
		tags: ['10 un.', 'Resistente al agua'],
		variants: [],
		stock: 60
	}
];

export function categoryBySlug(slug: string): ShopCategory | undefined {
	return shopCategories.find((category) => category.slug === slug);
}

export function itemsByCategory(slug: string): ShopItem[] {
	return shopItems.filter((item) => item.category === slug);
}

export function itemBySlug(slug: string): ShopItem | undefined {
	return shopItems.find((item) => item.slug === slug);
}

export function featuredItems(): ShopItem[] {
	return shopItems.filter((item) => item.featured);
}

export function shippingById(id: ShippingId): ShippingOption | undefined {
	return shippingOptions.find((option) => option.id === id);
}

/**
 * Precio efectivo de un producto según su variante (en centavos).
 * La variante puede sobreescribir el precio base; si no, se usa el del producto.
 */
export function unitPriceCents(item: ShopItem, variantId: string | null): Cents | null {
	if (variantId === null) return item.priceCents;
	const variant = item.variants.find((entry) => entry.id === variantId);
	if (!variant) return null;
	return variant.priceCents ?? item.priceCents;
}

/** Stock efectivo de un producto según su variante. */
export function unitStock(item: ShopItem, variantId: string | null): number {
	if (variantId === null) return item.stock;
	const variant = item.variants.find((entry) => entry.id === variantId);
	return variant ? variant.stock : 0;
}

/** Formatea centavos en pesos colombianos: 4500000 → "$45.000". */
export function formatCOP(cents: Cents): string {
	return '$' + Math.round(cents / 100).toLocaleString('es-CO');
}
