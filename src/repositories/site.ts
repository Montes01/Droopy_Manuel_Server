import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
	bankAccounts,
	contactChannels,
	donationTargets,
	donationTiers,
	siteSettings,
	testimonials
} from '../db/schema/index.js';
import type {
	BankAccount,
	DonationTarget,
	DonationTier,
	SiteContact,
	SiteContent,
	SiteStats,
	Testimonial
} from '../types.js';
import {
	toBankAccount,
	toDonationTier,
	toSiteContact,
	toSiteContent,
	toTestimonial
} from './mappers.js';
import { getAlivePack } from './dogs.js';

/**
 * Acceso al contenido del sitio: estadísticas, contacto, donaciones.
 *
 * Parte de estos datos son valores únicos guardados como clave/valor en
 * `site_settings` (texto «sobre nosotros», correo, estadísticas) para no crear
 * una tabla de una sola fila.
 */

const DEFAULT_STATS: SiteStats = { rescued: 0, adopted: 0, sterilized: 0, inCare: 0 };

async function getSetting<T>(key: string): Promise<T | undefined> {
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, key))
		.limit(1);
	return row ? (row.value as T) : undefined;
}

export async function getAboutBlurb(): Promise<string> {
	return (await getSetting<string>('about_blurb')) ?? '';
}

export async function getStats(): Promise<SiteStats> {
	return (await getSetting<SiteStats>('stats')) ?? DEFAULT_STATS;
}

export async function getSiteContent(): Promise<SiteContent> {
	const [aboutBlurb, stats] = await Promise.all([getAboutBlurb(), getStats()]);
	return toSiteContent(aboutBlurb, stats);
}

export async function getContactChannels() {
	return db
		.select()
		.from(contactChannels)
		.orderBy(asc(contactChannels.sortOrder), asc(contactChannels.id));
}

export async function getSiteContact(): Promise<SiteContact> {
	const [channels, email] = await Promise.all([
		getContactChannels(),
		getSetting<string>('contact_email')
	]);
	return toSiteContact(channels, email ?? '');
}

export async function getDonationTiers(): Promise<DonationTier[]> {
	const rows = await db
		.select()
		.from(donationTiers)
		.orderBy(asc(donationTiers.sortOrder), asc(donationTiers.stars));
	return rows.map(toDonationTier);
}

export async function getTestimonials(): Promise<Testimonial[]> {
	const rows = await db
		.select()
		.from(testimonials)
		.orderBy(asc(testimonials.sortOrder), asc(testimonials.id));
	return rows.map(toTestimonial);
}

export async function getBankAccounts(): Promise<BankAccount[]> {
	const rows = await db
		.select()
		.from(bankAccounts)
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.id));
	return rows.map(toBankAccount);
}

/**
 * Perritos a los que se puede dirigir una donación, con su meta si la tienen.
 *
 * Son los mismos de la manada viva (/manada): todo perrito que se agregue
 * desde el panel aparece aquí solo. La tabla `donation_targets` solo aporta
 * extras: `goalCents` cuando hay meta y `active = false` para ocultar a un
 * perrito sin borrarlo.
 */
export async function getDonationTargets(): Promise<DonationTarget[]> {
	const [pack, rows] = await Promise.all([
		getAlivePack(),
		db.select().from(donationTargets)
	]);

	const hidden = new Set(rows.filter((row) => !row.active).map((row) => row.dogSlug));
	const goals = new Map(
		rows
			.filter((row) => row.active && row.goalCents !== null)
			.map((row) => [row.dogSlug, row.goalCents as number])
	);

	return pack
		.filter((dog) => !hidden.has(dog.slug))
		.map((dog) =>
			goals.has(dog.slug) ? { dog, goalCents: goals.get(dog.slug)! } : { dog }
		);
}
