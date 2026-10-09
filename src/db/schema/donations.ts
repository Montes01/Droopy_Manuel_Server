import { boolean, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { paymentMethodEnum } from './enums.js';
import { dogs } from './dogs.js';

/** Niveles de donación («estrellas»). */
export const donationTiers = pgTable('donation_tiers', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	stars: integer('stars').notNull().unique(),
	name: varchar('name', { length: 160 }).notNull(),
	/** Precio en centavos, coherente con el resto del dinero. */
	priceCents: integer('price_cents').notNull(),
	currency: varchar('currency', { length: 8 }).notNull().default('COP'),
	blurb: text('blurb').notNull(),
	perks: text('perks').array().notNull().default([]),
	sortOrder: integer('sort_order').notNull().default(0)
});

/** Testimonios de adoptantes y voluntarios. */
export const testimonials = pgTable('testimonials', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	name: varchar('name', { length: 160 }).notNull(),
	role: varchar('role', { length: 160 }).notNull(),
	quote: text('quote').notNull(),
	/** Perrito relacionado, opcional. */
	dogSlug: varchar('dog_slug', { length: 120 }).references(() => dogs.slug, {
		onUpdate: 'cascade',
		onDelete: 'set null'
	}),
	sortOrder: integer('sort_order').notNull().default(0)
});

/** Cuentas bancarias para transferencias y donaciones. */
export const bankAccounts = pgTable('bank_accounts', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	bank: varchar('bank', { length: 160 }).notNull(),
	emoji: varchar('emoji', { length: 16 }).notNull(),
	method: paymentMethodEnum('method').notNull(),
	holder: varchar('holder', { length: 255 }).notNull(),
	/** Campos de la cuenta, en orden: [{label, value, copyable}] */
	fields: jsonb('fields').notNull().default([]),
	sortOrder: integer('sort_order').notNull().default(0)
});

/**
 * Perritos a los que se puede dirigir una donación.
 *
 * Reusa los de la manada viva: es una tabla propia porque en el panel se
 * podrá elegir cuáles aparecen y con qué meta.
 */
export const donationTargets = pgTable('donation_targets', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	dogSlug: varchar('dog_slug', { length: 120 })
		.notNull()
		.unique()
		.references(() => dogs.slug, { onUpdate: 'cascade', onDelete: 'cascade' }),
	/** Meta de recaudación en centavos, si existe. */
	goalCents: integer('goal_cents'),
	active: boolean('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0)
});

export type DonationTierRow = typeof donationTiers.$inferSelect;
export type TestimonialRow = typeof testimonials.$inferSelect;
export type BankAccountRow = typeof bankAccounts.$inferSelect;
export type DonationTargetRow = typeof donationTargets.$inferSelect;
export type NewDonationTierRow = typeof donationTiers.$inferInsert;
export type NewBankAccountRow = typeof bankAccounts.$inferInsert;
