import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
	bankAccounts,
	contactChannels,
	donationTiers,
	siteSettings,
	testimonials
} from '../db/schema/index.js';
import type { BankAccount, DonationTier, PaymentMethod, Testimonial } from '../types.js';
import { toBankAccount, toDonationTier, toTestimonial } from './mappers.js';
import { ValidationError, optionalString, requireInt, requireString, requireStringArray, slugify } from './validation.js';

/**
 * Escritura del contenido del sitio (panel de administración).
 *
 * Incluye el número de WhatsApp: vive en el canal `whatsapp` de
 * `contact_channels`, que sigue siendo su única definición.
 */

// ----------------------------------------------------- Configuración suelta

/** Claves permitidas en `site_settings`. Evita escribir claves arbitrarias. */
const SETTING_KEYS = ['about_blurb', 'contact_email', 'stats'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function setSetting(key: string, value: unknown): Promise<void> {
	if (!SETTING_KEYS.includes(key as SettingKey)) {
		throw new ValidationError(
			`Clave desconocida "${key}". Las válidas son: ${SETTING_KEYS.join(', ')}.`
		);
	}

	if (value === undefined || value === null) {
		throw new ValidationError(`El valor de "${key}" no puede estar vacío.`);
	}

	// Comprobaciones por clave: son datos que la portada muestra tal cual.
	if (key === 'about_blurb' && typeof value !== 'string') {
		throw new ValidationError('"about_blurb" debe ser texto.');
	}
	if (key === 'contact_email') {
		const email = requireString(value, 'contact_email', 255);
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			throw new ValidationError('"contact_email" debe ser un correo válido.');
		}
	}

	if (key === 'stats') {
		const stats = value as Record<string, unknown>;
		for (const field of ['rescued', 'adopted', 'sterilized', 'inCare']) {
			requireInt(stats?.[field], `stats.${field}`);
		}
	}

	await db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value, updatedAt: new Date() }
		});
}

// ------------------------------------------------------------ Niveles de donación

export interface DonationTierInput {
	stars?: number;
	name?: string;
	priceCents?: number;
	currency?: string;
	blurb?: string;
	perks?: string[];
	sortOrder?: number;
}

export async function createDonationTier(
	input: DonationTierInput
): Promise<DonationTier> {
	const stars = requireInt(input.stars, 'stars', 1);

	const [existing] = await db
		.select()
		.from(donationTiers)
		.where(eq(donationTiers.stars, stars))
		.limit(1);
	if (existing) throw new ValidationError(`Ya existe un nivel con ${stars} estrellas.`);

	const [row] = await db
		.insert(donationTiers)
		.values({
			stars,
			name: requireString(input.name, 'name', 160),
			priceCents: requireInt(input.priceCents, 'priceCents'),
			currency: input.currency ? String(input.currency) : 'COP',
			blurb: requireString(input.blurb, 'blurb', 2000),
			perks: input.perks ? requireStringArray(input.perks, 'perks') : [],
			sortOrder: input.sortOrder !== undefined ? requireInt(input.sortOrder, 'sortOrder') : 0
		})
		.returning();

	if (!row) throw new Error('No se pudo crear el nivel.');
	return toDonationTier(row);
}

export async function updateDonationTier(
	stars: number,
	input: DonationTierInput
): Promise<DonationTier | undefined> {
	const values: Record<string, unknown> = {};
	if (input.name !== undefined) values.name = requireString(input.name, 'name', 160);
	if (input.priceCents !== undefined) values.priceCents = requireInt(input.priceCents, 'priceCents');
	if (input.currency !== undefined) values.currency = String(input.currency);
	if (input.blurb !== undefined) values.blurb = requireString(input.blurb, 'blurb', 2000);
	if (input.perks !== undefined) values.perks = requireStringArray(input.perks, 'perks');
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(donationTiers)
		.set(values)
		.where(eq(donationTiers.stars, stars))
		.returning();

	return row ? toDonationTier(row) : undefined;
}

export async function deleteDonationTier(stars: number): Promise<boolean> {
	const deleted = await db
		.delete(donationTiers)
		.where(eq(donationTiers.stars, stars))
		.returning({ id: donationTiers.id });
	return deleted.length > 0;
}

// ---------------------------------------------------------------- Testimonios

export interface TestimonialInput {
	name?: string;
	role?: string;
	quote?: string;
	dog?: string | null;
	sortOrder?: number;
}

export async function createTestimonial(input: TestimonialInput): Promise<Testimonial> {
	const [row] = await db
		.insert(testimonials)
		.values({
			name: requireString(input.name, 'name', 160),
			role: requireString(input.role, 'role', 160),
			quote: requireString(input.quote, 'quote', 2000),
			dogSlug: input.dog ? String(input.dog) : null,
			sortOrder: input.sortOrder !== undefined ? requireInt(input.sortOrder, 'sortOrder') : 0
		})
		.returning();

	if (!row) throw new Error('No se pudo crear el testimonio.');
	return toTestimonial(row);
}

export async function updateTestimonial(
	id: number,
	input: TestimonialInput
): Promise<Testimonial | undefined> {
	const values: Record<string, unknown> = {};
	if (input.name !== undefined) values.name = requireString(input.name, 'name', 160);
	if (input.role !== undefined) values.role = requireString(input.role, 'role', 160);
	if (input.quote !== undefined) values.quote = requireString(input.quote, 'quote', 2000);
	if (input.dog !== undefined) values.dogSlug = input.dog ? String(input.dog) : null;
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(testimonials)
		.set(values)
		.where(eq(testimonials.id, id))
		.returning();

	return row ? toTestimonial(row) : undefined;
}

export async function deleteTestimonial(id: number): Promise<boolean> {
	const deleted = await db
		.delete(testimonials)
		.where(eq(testimonials.id, id))
		.returning({ id: testimonials.id });
	return deleted.length > 0;
}

// ------------------------------------------------------------ Cuentas bancarias

const PAYMENT_METHODS: PaymentMethod[] = ['transferencia', 'billetera', 'internacional'];

export interface BankAccountInput {
	bank?: string;
	emoji?: string;
	method?: PaymentMethod;
	holder?: string;
	fields?: { label: string; value: string; copyable?: boolean }[];
	sortOrder?: number;
}

function buildFields(input: BankAccountInput['fields']) {
	if (!Array.isArray(input) || input.length === 0) {
		throw new ValidationError('La cuenta debe tener al menos un campo.');
	}
	return input.map((field, index) => ({
		label: requireString(field?.label, `fields[${index}].label`, 120),
		value: requireString(field?.value, `fields[${index}].value`, 255),
		...(field?.copyable ? { copyable: true } : {})
	}));
}

export async function createBankAccount(input: BankAccountInput): Promise<BankAccount> {
	if (!input.method || !PAYMENT_METHODS.includes(input.method)) {
		throw new ValidationError(
			`El campo "method" debe ser uno de: ${PAYMENT_METHODS.join(', ')}.`
		);
	}

	const [row] = await db
		.insert(bankAccounts)
		.values({
			bank: requireString(input.bank, 'bank', 160),
			emoji: optionalString(input.emoji, 'emoji', 16),
			method: input.method,
			holder: requireString(input.holder, 'holder', 255),
			fields: buildFields(input.fields),
			sortOrder: input.sortOrder !== undefined ? requireInt(input.sortOrder, 'sortOrder') : 0
		})
		.returning();

	if (!row) throw new Error('No se pudo crear la cuenta.');
	return toBankAccount(row);
}

export async function updateBankAccount(
	id: number,
	input: BankAccountInput
): Promise<BankAccount | undefined> {
	const values: Record<string, unknown> = {};
	if (input.bank !== undefined) values.bank = requireString(input.bank, 'bank', 160);
	if (input.emoji !== undefined) values.emoji = optionalString(input.emoji, 'emoji', 16);
	if (input.holder !== undefined) values.holder = requireString(input.holder, 'holder', 255);
	if (input.fields !== undefined) values.fields = buildFields(input.fields);
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');
	if (input.method !== undefined) {
		if (!PAYMENT_METHODS.includes(input.method)) {
			throw new ValidationError(
				`El campo "method" debe ser uno de: ${PAYMENT_METHODS.join(', ')}.`
			);
		}
		values.method = input.method;
	}

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(bankAccounts)
		.set(values)
		.where(eq(bankAccounts.id, id))
		.returning();

	return row ? toBankAccount(row) : undefined;
}

export async function deleteBankAccount(id: number): Promise<boolean> {
	const deleted = await db
		.delete(bankAccounts)
		.where(eq(bankAccounts.id, id))
		.returning({ id: bankAccounts.id });
	return deleted.length > 0;
}

// ------------------------------------------------------------ Contacto y redes

export interface ContactChannelInput {
	key?: string;
	label?: string;
	icon?: string;
	href?: string;
	phoneNumber?: string | null;
	phoneDisplay?: string | null;
	sortOrder?: number;
}

/** Los enlaces de redes deben abrir algo: nada de texto suelto. */
function requireHref(value: unknown): string {
	const href = requireString(value, 'href', 500);
	if (!/^https?:\/\/.+\..+/.test(href)) {
		throw new ValidationError('El enlace debe ser una URL completa, por ejemplo https://instagram.com/….');
	}
	return href;
}

/**
 * Crea un canal de contacto (una red social).
 *
 * La `key` se deriva del nombre («TikTok» → «tiktok»): es lo que el panel
 * usa después para editar o borrar. El icono es opcional: si no viene, se
 * usa `/icons/<key>.png`.
 */
export async function createContactChannel(input: ContactChannelInput): Promise<unknown> {
	const label = requireString(input.label, 'label', 120);
	const key = slugify(input.key ?? label);
	if (!key) throw new ValidationError('No se pudo derivar un identificador a partir del nombre.');
	if (key === 'whatsapp') {
		throw new ValidationError('El canal de WhatsApp ya existe: se edita desde el número, no se crea.');
	}
	const href = requireHref(input.href);
	const icon = input.icon !== undefined ? requireString(input.icon, 'icon', 255) : `/icons/${key}.png`;

	const [existing] = await db
		.select()
		.from(contactChannels)
		.where(eq(contactChannels.key, key))
		.limit(1);
	if (existing) throw new ValidationError(`Ya existe el canal "${key}".`);

	const [top] = await db
		.select({ sortOrder: contactChannels.sortOrder })
		.from(contactChannels)
		.orderBy(desc(contactChannels.sortOrder))
		.limit(1);

	const [row] = await db
		.insert(contactChannels)
		.values({
			key,
			label,
			icon,
			href,
			phoneNumber: null,
			phoneDisplay: null,
			sortOrder: input.sortOrder !== undefined ? requireInt(input.sortOrder, 'sortOrder') : (top?.sortOrder ?? -1) + 1
		})
		.returning();

	if (!row) throw new Error('No se pudo crear el canal.');
	return row;
}

/**
 * Borra un canal de contacto. WhatsApp está protegido: es el número de la
 * fundación y se gestiona desde su propio formulario.
 */
export async function deleteContactChannel(key: string): Promise<boolean> {
	const normalizedKey = key.trim().toLowerCase();
	if (normalizedKey === 'whatsapp') {
		throw new ValidationError('El canal de WhatsApp no se puede borrar.');
	}

	const deleted = await db
		.delete(contactChannels)
		.where(eq(contactChannels.key, normalizedKey))
		.returning({ id: contactChannels.id });
	return deleted.length > 0;
}

/**
 * Actualiza un canal de contacto. Si el canal no existe, lo crea: así el
 * panel nunca queda bloqueado con "No existe el canal…" por una fila
 * faltante en `contact_channels` (p. ej. base sin seed o fila borrada).
 *
 * Para WhatsApp se recalcula `phoneDisplay` y `href` (`https://wa.me/...`)
 * a partir del número, de modo que el texto visible y el enlace no puedan
 * divergir del número que se usa en el enlace.
 */
export async function updateContactChannel(
	key: string,
	input: ContactChannelInput
): Promise<unknown | undefined> {
	const normalizedKey = key.trim().toLowerCase();
	const values: Record<string, unknown> = {};
	if (input.label !== undefined) values.label = requireString(input.label, 'label', 120);
	if (input.icon !== undefined) values.icon = requireString(input.icon, 'icon', 255);
	if (input.href !== undefined) values.href = requireHref(input.href);
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	let phoneNumber: string | null | undefined;
	if (input.phoneNumber !== undefined) {
		const number = input.phoneNumber === null ? null : requireString(input.phoneNumber, 'phoneNumber', 30);
		if (number !== null && !/^\d{10,15}$/.test(number)) {
			throw new ValidationError(
				'El número debe ir en formato internacional sin signos, por ejemplo 573226438857.'
			);
		}
		phoneNumber = number;
		values.phoneNumber = number;
		// Se deriva del número para que no puedan contradecirse.
		values.phoneDisplay = number === null ? null : formatPhone(number);
		// El enlace del canal WhatsApp también sale del número. Sin esto,
		// la lista de redes seguiría apuntando al número viejo aunque
		// `whatsappUrl` (derivado) ya mostrara el nuevo.
		if (normalizedKey === 'whatsapp' && number !== null && input.href === undefined) {
			values.href = `https://wa.me/${number}`;
		}
	}

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [updated] = await db
		.update(contactChannels)
		.set(values)
		.where(eq(contactChannels.key, normalizedKey))
		.returning();

	if (updated) return updated;

	// La fila no existía: crearla en vez de devolver 404.
	const label =
		input.label !== undefined
			? (values.label as string)
			: normalizedKey === 'whatsapp'
				? 'WhatsApp'
				: normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1);
	const icon =
		input.icon !== undefined
			? (values.icon as string)
			: `/icons/${normalizedKey}.png`;
	const href =
		values.href !== undefined
			? (values.href as string)
			: normalizedKey === 'whatsapp' && phoneNumber
				? `https://wa.me/${phoneNumber}`
				: '';
	const [inserted] = await db
		.insert(contactChannels)
		.values({
			key: normalizedKey,
			label,
			icon,
			href,
			phoneNumber: (values.phoneNumber as string | null) ?? null,
			phoneDisplay: (values.phoneDisplay as string | null) ?? null,
			sortOrder: (values.sortOrder as number) ?? 0
		})
		.onConflictDoNothing({ target: contactChannels.key })
		.returning();

	if (inserted) return inserted;

	// Otro proceso la creó entre el UPDATE y el INSERT: releer.
	const [row] = await db
		.select()
		.from(contactChannels)
		.where(eq(contactChannels.key, normalizedKey))
		.limit(1);
	return row;
}

/** Presenta 573226438857 como «322 643 8857». */
export function formatPhone(raw: string): string {
	const local = raw.startsWith('57') ? raw.slice(2) : raw;
	return local.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}
