/**
 * Siembra la base de datos con el contenido actual de la fundación.
 *
 * La fuente son los módulos de `src/data/*.ts`, que ya están verificados por
 * la suite de pruebas. Así el seed no puede inventar datos distintos a los
 * que el frontend ya conoce.
 *
 * Es idempotente: cada tabla se vacía antes de insertar, de modo que se puede
 * ejecutar tantas veces como haga falta.
 *
 *   pnpm db:seed
 */
import { sql } from 'drizzle-orm';
import { closeDb, db } from './index.js';
import {
	bankAccounts as bankAccountsSeed,
	donationTargets as donationTargetsSeed
} from '../data/fundraisers.js';
import {
	donationTiers as donationTiersSeed,
	siteContact,
	stats,
	aboutBlurb,
	testimonials as testimonialsSeed
} from '../data/content.js';
import { dogs as dogsSeed } from '../data/dogs.js';
import { news as newsSeed } from '../data/news.js';
import { shopCategories as categoriesSeed, shopItems as itemsSeed } from '../data/shop.js';
import {
	bankAccounts,
	contactChannels,
	donationTargets,
	donationTiers,
	dogs,
	news,
	newsRelatedDogs,
	shopCategories,
	shopItems,
	shopVariants,
	siteSettings,
	testimonials
} from './schema/index.js';

/** Borra el contenido antes de sembrar. Los pedidos y usuarios no se tocan. */
async function reset(): Promise<void> {
	// El orden respeta las claves foráneas: primero lo que depende de otros.
	await db.delete(newsRelatedDogs);
	await db.delete(news);
	await db.delete(donationTargets);
	await db.delete(shopVariants);
	await db.delete(shopItems);
	await db.delete(shopCategories);
	await db.delete(testimonials);
	await db.delete(donationTiers);
	await db.delete(bankAccounts);
	await db.delete(contactChannels);
	await db.delete(dogs);
	await db.delete(siteSettings);
}

async function seed(): Promise<void> {
	console.log('Vaciando contenido previo…');
	await reset();

	console.log(`Insertando ${dogsSeed.length} perritos…`);
	await db.insert(dogs).values(
		dogsSeed.map((dog, index) => ({
			slug: dog.slug,
			name: dog.name,
			breed: dog.breed,
			ageYears: dog.ageYears,
			ageLabel: dog.ageLabel,
			sex: dog.sex,
			size: dog.size,
			energy: dog.energy,
			goodWithKids: dog.goodWith.kids,
			goodWithDogs: dog.goodWith.dogs,
			goodWithCats: dog.goodWith.cats,
			vaccinated: dog.vaccinated,
			sterilized: dog.sterilized,
			status: dog.status,
			arrival: dog.arrival,
			traits: dog.traits,
			story: dog.story,
			photo: dog.photo,
			color: dog.color ?? null,
			featured: dog.featured ?? false,
			sortOrder: index
		}))
	);

	console.log(`Insertando ${categoriesSeed.length} categorías…`);
	await db.insert(shopCategories).values(
		categoriesSeed.map((category, index) => ({
			slug: category.slug,
			name: category.name,
			emoji: category.emoji,
			blurb: category.blurb,
			sortOrder: index
		}))
	);

	console.log(`Insertando ${itemsSeed.length} productos…`);
	await db.insert(shopItems).values(
		itemsSeed.map((item, index) => ({
			slug: item.slug,
			name: item.name,
			categorySlug: item.category,
			priceCents: item.priceCents,
			description: item.description,
			details: item.details,
			photo: item.photo,
			emoji: item.emoji,
			tags: item.tags,
			stock: item.stock,
			featured: item.featured ?? false,
			sortOrder: index
		}))
	);

	// Variantes: solo los productos que las tienen.
	const variants = itemsSeed.flatMap((item) =>
		item.variants.map((variant, index) => ({
			itemSlug: item.slug,
			variantId: variant.id,
			label: variant.label,
			priceCents: variant.priceCents ?? null,
			stock: variant.stock,
			sku: variant.sku ?? null,
			sortOrder: index
		}))
	);
	console.log(`Insertando ${variants.length} variantes…`);
	if (variants.length > 0) await db.insert(shopVariants).values(variants);

	console.log(`Insertando ${newsSeed.length} noticias…`);
	await db.insert(news).values(
		newsSeed.map((item) => ({
			slug: item.slug,
			title: item.title,
			excerpt: item.excerpt,
			body: item.body,
			date: item.date,
			category: item.category,
			tags: item.tags,
			photo: item.photo,
			emoji: item.emoji,
			featured: item.featured ?? false
		}))
	);

	// Relaciones noticia ↔ perrito, descartando slugs que no existan.
	const validDogSlugs = new Set(dogsSeed.map((dog) => dog.slug));
	const related = newsSeed.flatMap((item) =>
		item.relatedDogSlugs
			.filter((slug) => validDogSlugs.has(slug))
			.map((slug, index) => ({ newsSlug: item.slug, dogSlug: slug, sortOrder: index }))
	);
	console.log(`Insertando ${related.length} relaciones noticia-perrito…`);
	if (related.length > 0) await db.insert(newsRelatedDogs).values(related);

	console.log(`Insertando ${donationTiersSeed.length} niveles de donación…`);
	await db.insert(donationTiers).values(
		donationTiersSeed.map((tier, index) => ({
			stars: tier.stars,
			name: tier.name,
			priceCents: tier.priceCents,
			currency: tier.currency,
			blurb: tier.blurb,
			perks: tier.perks,
			sortOrder: index
		}))
	);

	console.log(`Insertando ${testimonialsSeed.length} testimonios…`);
	await db.insert(testimonials).values(
		testimonialsSeed.map((testimonial, index) => ({
			name: testimonial.name,
			role: testimonial.role,
			quote: testimonial.quote,
			// Solo si el perrito existe: si no, la FK falla.
			dogSlug:
				testimonial.dog && validDogSlugs.has(testimonial.dog) ? testimonial.dog : null,
			sortOrder: index
		}))
	);

	console.log(`Insertando ${bankAccountsSeed.length} cuentas bancarias…`);
	await db.insert(bankAccounts).values(
		bankAccountsSeed.map((account, index) => ({
			bank: account.bank,
			emoji: account.emoji,
			method: account.method,
			holder: account.holder,
			fields: account.fields,
			sortOrder: index
		}))
	);

	console.log(`Insertando ${donationTargetsSeed.length} objetivos de donación…`);
	await db.insert(donationTargets).values(
		donationTargetsSeed.map((target, index) => ({
			dogSlug: target.dog.slug,
			goalCents: target.goalCents ?? null,
			active: true,
			sortOrder: index
		}))
	);

	console.log('Insertando canales de contacto…');
	await db.insert(contactChannels).values(
		siteContact.socials.map((channel, index) => ({
			key: channel.key,
			label: channel.label,
			icon: channel.icon,
			href: channel.href,
			// Solo WhatsApp guarda número; se toma de la fuente única.
			phoneNumber: channel.label === 'WhatsApp' ? siteContact.whatsappNumber : null,
			phoneDisplay: channel.label === 'WhatsApp' ? siteContact.whatsappDisplay : null,
			sortOrder: index
		}))
	);

	console.log('Insertando configuración del sitio…');
	await db.insert(siteSettings).values([
		{ key: 'about_blurb', value: aboutBlurb },
		{ key: 'contact_email', value: siteContact.email },
		{ key: 'stats', value: stats }
	]);

	console.log('\nSeed completado.');
}

try {
	await seed();

	// Resumen de lo que quedó en la base, para verificación rápida.
	const counts = await db.execute(sql`
		SELECT 'dogs' AS tabla, count(*) AS n FROM dogs
		UNION ALL SELECT 'shop_categories', count(*) FROM shop_categories
		UNION ALL SELECT 'shop_items', count(*) FROM shop_items
		UNION ALL SELECT 'shop_variants', count(*) FROM shop_variants
		UNION ALL SELECT 'news', count(*) FROM news
		UNION ALL SELECT 'news_related_dogs', count(*) FROM news_related_dogs
		UNION ALL SELECT 'donation_tiers', count(*) FROM donation_tiers
		UNION ALL SELECT 'testimonials', count(*) FROM testimonials
		UNION ALL SELECT 'bank_accounts', count(*) FROM bank_accounts
		UNION ALL SELECT 'donation_targets', count(*) FROM donation_targets
		UNION ALL SELECT 'contact_channels', count(*) FROM contact_channels
		UNION ALL SELECT 'site_settings', count(*) FROM site_settings
		ORDER BY tabla
	`);

	console.log('\nContenido en la base:');
	for (const row of counts as unknown as { tabla: string; n: string }[]) {
		console.log(`  ${row.tabla.padEnd(20)} ${row.n}`);
	}
} catch (error) {
	console.error('\nEl seed falló:', error);
	process.exitCode = 1;
} finally {
	await closeDb();
}
