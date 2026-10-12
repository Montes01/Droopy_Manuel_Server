import { eq } from 'drizzle-orm';
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
import { ValidationError, optionalString, requireInt, requireString, requireStringArray } from './validation.js';

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

/**
 * Actualiza un canal de contacto.
 *
 * Para WhatsApp se recalcula `phoneDisplay` a partir del número, de modo que
 * el texto visible no pueda divergir del número que se usa en el enlace.
 */
export async function updateContactChannel(
	key: string,
	input: ContactChannelInput
): Promise<unknown | undefined> {
	const values: Record<string, unknown> = {};
	if (input.label !== undefined) values.label = requireString(input.label, 'label', 120);
	if (input.icon !== undefined) values.icon = requireString(input.icon, 'icon', 255);
	if (input.href !== undefined) values.href = requireString(input.href, 'href', 500);
	if (input.sortOrder !== undefined) values.sortOrder = requireInt(input.sortOrder, 'sortOrder');

	if (input.phoneNumber !== undefined) {
		const number = input.phoneNumber === null ? null : requireString(input.phoneNumber, 'phoneNumber', 30);
		if (number !== null && !/^\d{10,15}$/.test(number)) {
			throw new ValidationError(
				'El número debe ir en formato internacional sin signos, por ejemplo 573226438857.'
			);
		}
		values.phoneNumber = number;
		// Se deriva del número para que no puedan contradecirse.
		values.phoneDisplay = number === null ? null : formatPhone(number);
	}

	if (Object.keys(values).length === 0) {
		throw new ValidationError('No se envió ningún campo para actualizar.');
	}

	const [row] = await db
		.update(contactChannels)
		.set(values)
		.where(eq(contactChannels.key, key))
		.returning();

	return row;
}

/** Presenta 573226438857 como «322 643 8857». */
export function formatPhone(raw: string): string {
	const local = raw.startsWith('57') ? raw.slice(2) : raw;
	return local.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}
