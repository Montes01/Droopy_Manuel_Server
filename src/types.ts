/**
 * Tipos de dominio de Droopy Manuel.
 *
 * Esta es la fuente de verdad del contrato entre el backend y el frontend.
 * El frontend conserva una copia de estos tipos (en `src/lib/data/types.ts`)
 * para tipar sus componentes; si cambias algo aquí, cámbialo también allí.
 */

export type Slug = string;
export type ISODate = string;
export type Cents = number;
export type PhotoPath = string | null;

// ---------------------------------------------------------------- Perritos

export type DogStatus = 'en-adopcion' | 'hogar-temporal' | 'adoptado' | 'en-memoria';
export type DogSize = 'pequeño' | 'mediano' | 'grande';
export type DogSex = 'macho' | 'hembra';
export type DogEnergy = 'tranquilo' | 'moderado' | 'juguetón';

export interface DogGoodWith {
	kids: boolean;
	dogs: boolean;
	cats: boolean;
}

export interface Dog {
	slug: Slug;
	name: string;
	breed: string;
	birthDate: ISODate | null; // YYYY-MM-DD, null = unknown age
	isApprox: boolean;          // true = fundación estimate
	sex: DogSex;
	size: DogSize;
	energy: DogEnergy;
	goodWith: DogGoodWith;
	vaccinated: boolean;
	sterilized: boolean;
	status: DogStatus;
	arrival: ISODate;
	traits: string[];
	story: string;
	photo: PhotoPath;
	featured?: boolean;
	/**
	 * Color principal del perrito (hex `#rrggbb`). Opcional: null o
	 * ausente = marrón de la marca (`#7a3f16`).
	 */
	color?: string | null;
}

/** Vista de la manada: vivos o en el cielo. */
export type PackView = 'alive' | 'heaven';

/** Un perrito al que se puede dirigir una donación. */
export interface DonationTarget {
	dog: Dog;
	/** Meta de recaudación en centavos, si existe. */
	goalCents?: Cents;
}

// ------------------------------------------------------------------ Tienda

export interface ShopCategory {
	slug: Slug;
	name: string;
	emoji: string;
	blurb: string;
}

export interface ShopVariant {
	id: string;
	label: string;
	priceCents?: Cents;
	stock: number;
	sku?: string;
}

export interface ShopItem {
	slug: Slug;
	name: string;
	category: Slug;
	priceCents: Cents;
	description: string;
	details: string;
	photo: PhotoPath;
	emoji: string;
	tags: string[];
	variants: ShopVariant[];
	stock: number;
	featured?: boolean;
}

export type ShippingId = 'recogida' | 'domicilio';

export interface ShippingOption {
	id: ShippingId;
	label: string;
	detail: string;
	costCents: Cents;
}

// ----------------------------------------------------------------- Pedidos

export interface OrderCustomer {
	nombres: string;
	apellidos: string;
	pais: string;
	direccion: string;
	ciudad: string;
	telefono: string;
	email: string;
	notas?: string;
}

export interface OrderLineInput {
	slug: Slug;
	variantId: string | null;
	quantity: number;
}

export interface OrderPayload {
	customer: OrderCustomer;
	lines: OrderLineInput[];
	shipping: ShippingId;
}

export interface OrderLineResult {
	name: string;
	quantity: number;
	totalCents: Cents;
}

export interface OrderResult {
	orderNumber: string;
	subtotalCents: Cents;
	shippingCents: Cents;
	totalCents: Cents;
	lines: OrderLineResult[];
	shippingLabel: string;
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';

export type PaymentStatus = 'sin-pago' | 'en-revision' | 'pagado' | 'rechazado';

/** Pedido completo tal como vive en el servidor. */
export interface Order extends OrderResult {
	customer: OrderCustomer;
	shipping: ShippingId;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	createdAt: ISODate;
}

// ---------------------------------------------------------------- Noticias

export type NewsCategory = 'rescate' | 'adopcion' | 'salud' | 'evento' | 'tienda';

export interface NewsItem {
	slug: Slug;
	title: string;
	excerpt: string;
	body: string[];
	date: ISODate;
	category: NewsCategory;
	tags: string[];
	photo: PhotoPath;
	emoji: string;
	relatedDogSlugs: Slug[];
	featured?: boolean;
}

export interface NewsPage {
	items: NewsItem[];
	hasMore: boolean;
}

// ------------------------------------------------------- Donaciones y sitio

export type PaymentMethod = 'transferencia' | 'billetera' | 'internacional';

export interface AccountField {
	label: string;
	value: string;
	copyable?: boolean;
}

/**
 * Cuenta bancaria para transferencias.
 *
 * `id` es interno: la web pública no lo usa, pero el panel lo necesita para
 * editar y borrar una cuenta concreta.
 */
export interface BankAccount {
	id?: number;
	bank: string;
	emoji: string;
	method: PaymentMethod;
	holder: string;
	fields: AccountField[];
}

export interface DonationTier {
	stars: number;
	name: string;
	priceCents: Cents;
	currency: string;
	blurb: string;
	perks: string[];
}

/**
 * Testimonio de adopción o voluntariado.
 *
 * `id` es interno: la web pública no lo usa, pero el panel lo necesita para
 * poder editar y borrar un testimonio concreto. Es opcional para no romper el
 * contrato que ya consume el frontend.
 */
export interface Testimonial {
	id?: number;
	name: string;
	role: string;
	quote: string;
	dog?: Slug;
}

export interface SiteStats {
	rescued: number;
	adopted: number;
	sterilized: number;
	inCare: number;
}

export interface SiteContent {
	aboutBlurb: string;
	stats: SiteStats;
}

/**
 * Datos de contacto y redes de la fundación.
 *
 * El número de WhatsApp vive aquí y en ningún otro sitio: el frontend lo pide
 * a la API para no repetirlo en plantillas, placeholders y enlaces.
 */
export interface ContactChannel {
	/** Identificador en la base: whatsapp, instagram… */
	key: string;
	/** Nombre visible: WhatsApp, Instagram… */
	label: string;
	/** Icono en el `static` del frontend, ej. /icons/whatsapp.png */
	icon: string;
	href: string;
}

export interface SiteContact {
	/** Número de WhatsApp en formato internacional sin signos: 573226438857 */
	whatsappNumber: string;
	/** El mismo número como se muestra a las personas: 322 643 8857 */
	whatsappDisplay: string;
	/** Enlace listo para usar, sin texto: https://wa.me/573226438857 */
	whatsappUrl: string;
	/** Correo de la fundación. */
	email: string;
	/** Redes sociales, en el orden en que se muestran. */
	socials: ContactChannel[];
}

// ------------------------------------------------- Autenticación del panel

/**
 * Rol de una persona con acceso al panel.
 *
 * `editor` puede corregir y crear contenido; `admin` además puede borrar y
 * gestionar otras cuentas.
 */
export type AdminRole = 'admin' | 'editor';

/** Acción registrada en el log de auditoría. */
export type AuditAction = 'crear' | 'editar' | 'borrar';

// ------------------------------------------------- Respuestas de la API

/** Cuerpo estándar de error de la API. */
export interface ApiError {
	error: string;
	message: string;
}
