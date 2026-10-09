/**
 * Prueba de integración front ↔ back.
 *
 * Ejecuta el código real de `Front/src/lib/api/*.ts` contra la API con la base
 * de datos real, comprobando que el contrato encaja: las mismas rutas, los
 * mismos campos y los mismos tipos que consumen los componentes.
 *
 *   node --env-file=.env tests/integration.mjs
 *
 * OJO: crea pedidos reales, así que descuenta stock. Ejecuta `pnpm db:reset`
 * antes, o usa `pnpm test`, que ya lo hace.
 */
import { createApp } from '../dist/app.js';
import { closeDb } from '../dist/db/index.js';

const port = 3998;
process.env.PUBLIC_API_URL = `http://127.0.0.1:${port}`;

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
	if (condition) {
		passed++;
		console.log(`  ✓ ${label}`);
	} else {
		failed++;
		console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
	}
}

const server = createApp().listen(port);

try {
	// El código del front se compila a `test-build/` por el script
	// `build-front-for-test.mjs`: es el mismo código fuente de
	// `Front/src/lib/api/*.ts`, ejecutado como JS para poder importarlo aquí.
	const api = '../test-build/lib/api';
	const data = '../test-build/lib/data';

	const shop = await import(`${api}/shop.js`);
	const news = await import(`${api}/news.js`);
	const dogs = await import(`${api}/dogs.js`);
	const site = await import(`${api}/site.js`);
	const format = await import(`${data}/format.js`);

	console.log('\n── Tienda (Front/src/lib/api/shop.ts) ──');

	const categories = await shop.getCategories();
	check('getCategories() → 6', categories.length === 6, `len=${categories.length}`);

	const category = await shop.getCategory('ropa');
	check('getCategory("ropa")', category?.name === 'Ropa', category?.name);

	const missingCategory = await shop.getCategory('no-existe');
	check('getCategory inexistente → null', missingCategory === null);

	const allItems = await shop.getItems();
	check('getItems() → 18', allItems.length === 18, `len=${allItems.length}`);

	const ropa = await shop.getItems('ropa');
	check('getItems("ropa") → 3', ropa.length === 3, `len=${ropa.length}`);

	const item = await shop.getItem('camiseta-solidaria');
	check(
		'getItem con variantes',
		item?.variants.length === 4,
		`variants=${item?.variants.length}`
	);

	const missingItem = await shop.getItem('no-existe');
	check('getItem inexistente → null', missingItem === null);

	const featured = await shop.getFeaturedItems();
	check('getFeaturedItems() → 6', featured.length === 6, `len=${featured.length}`);

	const shipping = await shop.getShippingOptions();
	check('getShippingOptions() → 2', shipping.length === 2, `len=${shipping.length}`);

	console.log('\n── formato local (Front/src/lib/data/format.ts) ──');

	const camiseta = await shop.getItem('camiseta-solidaria');
	const variantM = camiseta.variants.find((v) => v.id === 'm');
	check('unitPriceCents sin variante', format.unitPriceCents(camiseta, null) === 5500000);
	check('unitPriceCents con variante', format.unitPriceCents(camiseta, variantM) === 5500000);
	// El stock cambia al crear pedidos, así que se compara contra el dato vivo
	// en lugar de contra un número fijo: la prueba no depende del estado previo.
	check(
		'unitStock refleja el stock real',
		format.unitStock(camiseta, variantM) === variantM.stock,
		`${format.unitStock(camiseta, variantM)} vs ${variantM.stock}`
	);
	check(
		'unitStock sin variante usa el del producto',
		format.unitStock(camiseta, null) === camiseta.stock,
		`${format.unitStock(camiseta, null)} vs ${camiseta.stock}`
	);
	check('cartLineKey', format.cartLineKey('camiseta-solidaria', 'm') === 'camiseta-solidaria::m');
	check('formatCOP', format.formatCOP(5500000).includes('55'), format.formatCOP(5500000));

	console.log('\n── Pedido (createOrder) ──');

	const order = await shop.createOrder({
		customer: {
			nombres: 'Ana',
			apellidos: 'Pérez',
			pais: 'Colombia',
			direccion: 'Calle 1 #2-3',
			ciudad: 'Bogotá',
			telefono: '3001234567',
			email: 'ana@example.com'
		},
		lines: [{ slug: 'camiseta-solidaria', variantId: 'm', quantity: 2 }],
		shipping: 'domicilio'
	});
	check('createOrder → total correcto', order.totalCents === 5500000 * 2 + 600000, `${order.totalCents}`);
	check('createOrder → orderNumber', /^DM-/.test(order.orderNumber), order.orderNumber);
	check('createOrder → línea con variante', order.lines[0].name === 'Camiseta Solidaria · Talla M');

	// Un pedido inválido debe lanzar ApiRequestError con el mensaje del server.
	let threw = null;
	try {
		await shop.createOrder({
			customer: {
				nombres: 'Ana',
				apellidos: 'Pérez',
				pais: 'Colombia',
				direccion: 'Calle 1',
				ciudad: 'Bogotá',
				telefono: '3001234567',
				email: 'ana@example.com'
			},
			lines: [{ slug: 'pelota-resistente', variantId: 'l', quantity: 1 }],
			shipping: 'recogida'
		});
	} catch (error) {
		threw = error;
	}
	check('agotado → lanza error', threw !== null && threw.status === 400, `status=${threw?.status}`);
	check('el mensaje viene del servidor', /agotado/i.test(threw?.message ?? ''), threw?.message);

	console.log('\n── Noticias (Front/src/lib/api/news.ts) ──');

	const newsAll = await news.getNews();
	check('getNews() → 12', newsAll.length === 12, `len=${newsAll.length}`);

	const newsCategories = await news.getNewsCategories();
	check('getNewsCategories() → 5', newsCategories.length === 5, `len=${newsCategories.length}`);
	check(
		'las categorías traen label',
		newsCategories.every((c) => typeof c.label === 'string' && c.label.length > 0)
	);

	const page1 = await news.getNewsPage(0, 6);
	check('getNewsPage(0,6)', page1.items.length === 6 && page1.hasMore === true);

	const page2 = await news.getNewsPage(6, 6);
	check('getNewsPage(6,6) → última', page2.items.length === 6 && page2.hasMore === false, `items=${page2.items.length} hasMore=${page2.hasMore}`);

	const article = await news.getNewsItem('luna-encontro-hogar');
	check('getNewsItem()', article?.title === 'Luna encontró hogar');

	const missingArticle = await news.getNewsItem('no-existe');
	check('getNewsItem inexistente → null', missingArticle === null);

	console.log('\n── Manada (Front/src/lib/api/dogs.ts) ──');

	const allDogs = await dogs.getDogs();
	check('getDogs() → 14', allDogs.length === 14, `len=${allDogs.length}`);

	const featuredDogs = await dogs.getFeaturedDogs();
	check('getFeaturedDogs() → 4', featuredDogs.length === 4, `len=${featuredDogs.length}`);

	const alive = await dogs.getPack('alive');
	const heaven = await dogs.getPack('heaven');
	check('getPack("alive") → 4', alive.length === 4, `len=${alive.length}`);
	check('getPack("heaven") → 2', heaven.length === 2, `len=${heaven.length}`);
	check(
		'la manada del cielo es la esperada',
		heaven.map((d) => d.slug).sort().join(',') === 'duque,manuel',
		heaven.map((d) => d.slug).join(',')
	);
	check(
		'la manada viva respeta el orden curado',
		alive.map((d) => d.slug).join(',') === 'toby,luna,thor,chiquis',
		alive.map((d) => d.slug).join(',')
	);

	// El cielo se deriva de `status`: la lista y el estado no pueden divergir.
	const enMemoria = allDogs.filter((d) => d.status === 'en-memoria').map((d) => d.slug).sort();
	check(
		'todo perrito en-memoria aparece en el cielo',
		enMemoria.every((slug) => heaven.some((d) => d.slug === slug)),
		`en-memoria=${enMemoria.join(',')} heaven=${heaven.map((d) => d.slug).join(',')}`
	);
	check(
		'el cielo no incluye perritos vivos',
		heaven.every((d) => d.status === 'en-memoria'),
		heaven.map((d) => `${d.slug}:${d.status}`).join(',')
	);
	check(
		'ningún perrito del cielo está en la manada viva',
		heaven.every((d) => !alive.some((a) => a.slug === d.slug)),
		heaven.map((d) => d.slug).join(',')
	);

	const luna = await dogs.getDog('luna');
	check('getDog("luna")', luna?.name === 'Luna');

	const missingDog = await dogs.getDog('no-existe');
	check('getDog inexistente → null', missingDog === null);

	console.log('\n── Sitio (Front/src/lib/api/site.ts) ──');

	const content = await site.getSiteContent();
	check('getSiteContent()', typeof content.aboutBlurb === 'string' && content.stats.rescued === 248);

	const stats = await site.getStats();
	check('getStats()', stats.adopted === 196 && stats.inCare === 34);

	const tiers = await site.getDonationTiers();
	check('getDonationTiers() → 4 con priceCents', tiers.length === 4 && tiers[0].priceCents === 5000, `first=${tiers[0]?.priceCents}`);

	const testimonialList = await site.getTestimonials();
	check('getTestimonials() → 4', testimonialList.length === 4, `len=${testimonialList.length}`);

	const targets = await site.getDonationTargets();
	check(
		'getDonationTargets() → 4 envueltos',
		targets.length === 4 && targets[0].dog.slug === 'toby',
		`len=${targets.length}`
	);
	check(
		'cada target trae un Dog completo',
		targets.every((t) => t.dog && typeof t.dog.name === 'string' && Array.isArray(t.dog.traits))
	);

	const accounts = await site.getBankAccounts();
	check('getBankAccounts() → 4', accounts.length === 4, `len=${accounts.length}`);
	check(
		'cada cuenta trae campos copiables',
		accounts.every((a) => a.fields.some((f) => f.copyable))
	);

	console.log('\n── Contacto (fuente única del WhatsApp) ──');

	const contact = await site.getSiteContact();
	check('getSiteContact() trae número', /^\d{10,15}$/.test(contact.whatsappNumber), contact.whatsappNumber);
	check(
		'whatsappDisplay formatea el número',
		contact.whatsappDisplay === '322 643 8857',
		contact.whatsappDisplay
	);
	check(
		'whatsappUrl usa el número',
		contact.whatsappUrl === `https://wa.me/${contact.whatsappNumber}`,
		contact.whatsappUrl
	);
	check(
		'el número aparece en las redes',
		contact.socials.find((s) => s.label === 'WhatsApp')?.href === contact.whatsappUrl
	);
	check(
		'las redes traen icono y enlace',
		contact.socials.length === 5 &&
			contact.socials.every((s) => s.icon.startsWith('/') && s.href.startsWith('http')),
		`len=${contact.socials.length}`
	);
	check('trae correo de contacto', contact.email.includes('@'), contact.email);

	// Regresión: el display no puede divergir del número en formato internacional.
	check(
		'whatsappDisplay se deriva del número',
		contact.whatsappDisplay.replace(/\s/g, '') ===
			contact.whatsappNumber.replace(/^57/, ''),
		`${contact.whatsappDisplay} vs ${contact.whatsappNumber}`
	);

	console.log('\n──────────────────────────────');
	console.log(`  ${passed} correctas, ${failed} fallidas`);
	console.log('──────────────────────────────\n');
} finally {
	server.close();
	// Sin cerrar el pool, el proceso se queda vivo esperando conexiones.
	await closeDb();
}

process.exit(failed === 0 ? 0 : 1);
