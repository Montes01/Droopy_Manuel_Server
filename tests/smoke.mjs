/**
 * Prueba de humo de la API: arranca el servidor en un puerto libre, llama a
 * todos los endpoints y comprueba que respondan con la forma esperada.
 *
 *   node --env-file=.env tests/smoke.mjs
 *
 * OJO: crea pedidos reales, así que descuenta stock. Para que la suite sea
 * repetible ejecuta `pnpm db:reset` antes, o usa `pnpm test`, que ya lo hace.
 */
import { createApp } from '../dist/app.js';
import { closeDb } from '../dist/db/index.js';

const port = 3999;
const base = `http://127.0.0.1:${port}`;
const app = createApp();

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

async function get(path) {
	const res = await fetch(base + path);
	const body = await res.json().catch(() => null);
	return { status: res.status, body };
}

const server = app.listen(port);

try {
	console.log('\n── GET endpoints ──');

	const health = await get('/api/health');
	check('GET /api/health', health.status === 200 && health.body.status === 'ok');

	const dogs = await get('/api/dogs');
	check('GET /api/dogs devuelve 14', Array.isArray(dogs.body) && dogs.body.length === 14, `len=${dogs.body?.length}`);

	const featured = await get('/api/dogs/featured');
	check('GET /api/dogs/featured', Array.isArray(featured.body) && featured.body.length === 4, `len=${featured.body?.length}`);

	const pack = await get('/api/dogs/pack?view=heaven');
	check('GET /api/dogs/pack?view=heaven', Array.isArray(pack.body) && pack.body.length === 2, `len=${pack.body?.length}`);

	// La manada del cielo se deriva de `status`: no puede contradecirlo.
	const heaven = pack.body ?? [];
	const enMemoria = (dogs.body ?? []).filter((d) => d.status === 'en-memoria');
	check(
		'el cielo = todos los en-memoria',
		enMemoria.length === heaven.length &&
			enMemoria.every((d) => heaven.some((h) => h.slug === d.slug)),
		`en-memoria=${enMemoria.length} heaven=${heaven.length}`
	);
	check(
		'el cielo no trae perritos vivos',
		heaven.every((d) => d.status === 'en-memoria'),
		heaven.map((d) => `${d.slug}:${d.status}`).join(',')
	);

	const alivePack = await get('/api/dogs/pack?view=alive');
	const alive = alivePack.body ?? [];
	const vivos = (dogs.body ?? []).filter((d) => d.status !== 'en-memoria');
	check(
		'la manada viva = todos salvo el cielo',
		alive.length === vivos.length &&
			vivos.every((d) => alive.some((a) => a.slug === d.slug)),
		`alive=${alive.length} vivos=${vivos.length}`
	);
	check(
		'la manada viva no trae perritos en-memoria',
		alive.every((d) => d.status !== 'en-memoria'),
		alive.map((d) => `${d.slug}:${d.status}`).join(',')
	);

	const dog = await get('/api/dogs/luna');
	check('GET /api/dogs/luna', dog.status === 200 && dog.body.name === 'Luna');

	const dog404 = await get('/api/dogs/no-existe');
	check('GET /api/dogs/no-existe → 404', dog404.status === 404 && dog404.body.error === 'not_found');

	// Salud del perrito: un solo GET trae baños, vacunas y accesorios.
	const lunaHealth = await get('/api/dogs/luna/health');
	check(
		'GET /api/dogs/luna/health trae el perfil',
		lunaHealth.status === 200 &&
			lunaHealth.body.health?.lastBath === '2026-09-20' &&
			lunaHealth.body.vaccines.length === 2 &&
			lunaHealth.body.accessories.length === 3,
		`health=${lunaHealth.body?.health?.lastBath} vacunas=${lunaHealth.body?.vaccines?.length} accesorios=${lunaHealth.body?.accessories?.length}`
	);

	const healthList = await get('/api/dogs/health');
	check(
		'GET /api/dogs/health lista los perfiles',
		Array.isArray(healthList.body) && healthList.body.some((profile) => profile.dogSlug === 'luna'),
		`len=${healthList.body?.length}`
	);

	const health404 = await get('/api/dogs/no-existe/health');
	check('GET /api/dogs/no-existe/health → 404', health404.status === 404, `status=${health404.status}`);

	const cats = await get('/api/shop/categories');
	check('GET /api/shop/categories devuelve 6', Array.isArray(cats.body) && cats.body.length === 6, `len=${cats.body?.length}`);

	const items = await get('/api/shop/items');
	check('GET /api/shop/items devuelve 18', Array.isArray(items.body) && items.body.length === 18, `len=${items.body?.length}`);

	const byCat = await get('/api/shop/items?category=ropa');
	check('GET /api/shop/items?category=ropa → 3', Array.isArray(byCat.body) && byCat.body.length === 3, `len=${byCat.body?.length}`);

	const item = await get('/api/shop/items/camiseta-solidaria');
	check(
		'GET producto con variantes',
		item.status === 200 && item.body.variants.length === 4,
		`variants=${item.body?.variants?.length}`
	);

	const shipping = await get('/api/shop/shipping');
	check(
		'GET /api/shop/shipping → domicilio 600000',
		Array.isArray(shipping.body) &&
			shipping.body.find((o) => o.id === 'domicilio')?.costCents === 600000
	);

	const newsAll = await get('/api/news');
	check('GET /api/news devuelve 12', Array.isArray(newsAll.body) && newsAll.body.length === 12, `len=${newsAll.body?.length}`);

	const page = await get('/api/news?offset=0&limit=6');
	check(
		'GET /api/news paginado',
		page.status === 200 && page.body.items.length === 6 && page.body.hasMore === true,
		`items=${page.body?.items?.length} hasMore=${page.body?.hasMore}`
	);

	const lastPage = await get('/api/news?offset=11&limit=6');
	check(
		'última página hasMore=false',
		lastPage.body.items.length === 1 && lastPage.body.hasMore === false,
		`items=${lastPage.body?.items?.length} hasMore=${lastPage.body?.hasMore}`
	);

	const badPage = await get('/api/news?offset=-1');
	check('offset inválido → 400', badPage.status === 400);

	const newsItem = await get('/api/news/luna-encontro-hogar');
	check('GET noticia por slug', newsItem.status === 200 && newsItem.body.title === 'Luna encontró hogar');

	const content = await get('/api/site/content');
	check(
		'GET /api/site/content',
		content.status === 200 && typeof content.body.aboutBlurb === 'string' && content.body.stats.rescued === 248
	);

	const tiers = await get('/api/site/donation-tiers');
	check(
		'GET /api/site/donation-tiers (priceCents)',
		Array.isArray(tiers.body) && tiers.body.length === 4 && tiers.body[0].priceCents === 5000,
		`first=${tiers.body?.[0]?.priceCents}`
	);

	const testimonialList = await get('/api/site/testimonials');
	check('GET /api/site/testimonials → 4', Array.isArray(testimonialList.body) && testimonialList.body.length === 4);

	const targets = await get('/api/site/donation-targets');
	check(
		'GET /api/site/donation-targets = manada viva',
		Array.isArray(targets.body) &&
			targets.body.length === alive.length &&
			targets.body.every((t) => t.dog && alive.some((a) => a.slug === t.dog.slug)),
		`len=${targets.body?.length} alive=${alive.length}`
	);

	const accounts = await get('/api/site/bank-accounts');
	check('GET /api/site/bank-accounts → 4', Array.isArray(accounts.body) && accounts.body.length === 4);

	const contact = await get('/api/site/contact');
	check(
		'GET /api/site/contact',
		contact.status === 200 &&
			contact.body.whatsappNumber === '573226438857' &&
			contact.body.whatsappDisplay === '322 643 8857',
		`${contact.body?.whatsappNumber} / ${contact.body?.whatsappDisplay}`
	);
	check(
		'contacto incluye las 5 redes',
		Array.isArray(contact.body?.socials) && contact.body.socials.length === 5,
		`len=${contact.body?.socials?.length}`
	);

	console.log('\n── POST /api/orders ──');

	// Pedido válido: 2 camisetas talla M + envío a domicilio.
	const orderRes = await fetch(base + '/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
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
		})
	});
	const order = await orderRes.json();

	const expectedSubtotal = 5500000 * 2;
	check('POST /api/orders → 201', orderRes.status === 201, `status=${orderRes.status}`);
	check(
		'subtotal calculado en servidor',
		order.subtotalCents === expectedSubtotal,
		`${order.subtotalCents} !== ${expectedSubtotal}`
	);
	check('envío a domicilio aplicado', order.shippingCents === 600000, `got ${order.shippingCents}`);
	check(
		'total = subtotal + envío',
		order.totalCents === expectedSubtotal + 600000,
		`got ${order.totalCents}`
	);
	check(
		'línea con nombre de variante',
		order.lines?.[0]?.name === 'Camiseta Solidaria · Talla M',
		`name=${order.lines?.[0]?.name}`
	);
	check('orderNumber con formato DM-', /^DM-[A-Z0-9]+$/.test(order.orderNumber ?? ''), order.orderNumber);

	// Recogida local: envío gratis.
	const pickupRes = await fetch(base + '/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			customer: {
				nombres: 'Luis',
				apellidos: 'Gómez',
				pais: 'Colombia',
				direccion: 'Cra 4 #5-6',
				ciudad: 'Medellín',
				telefono: '3009999999',
				email: 'luis@example.com'
			},
			lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
			shipping: 'recogida'
		})
	});
	const pickup = await pickupRes.json();
	check('recogida local → envío 0', pickup.shippingCents === 0 && pickup.totalCents === 4200000, `got ${pickup.shippingCents}/${pickup.totalCents}`);

	// Recuperar el pedido creado.
	const fetched = await get(`/api/orders/${order.orderNumber}`);
	check('GET pedido por número', fetched.status === 200 && fetched.body.orderNumber === order.orderNumber);
	check(
		'pedido nuevo nace pendiente / sin-pago',
		fetched.body.status === 'pendiente' && fetched.body.paymentStatus === 'sin-pago',
		`${fetched.body?.status}/${fetched.body?.paymentStatus}`
	);

	console.log('\n── Validaciones de pedido ──');

	async function badOrder(label, payload) {
		const res = await fetch(base + '/api/orders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		check(label, res.status === 400, `status=${res.status}`);
	}

	const validCustomer = {
		nombres: 'Ana',
		apellidos: 'Pérez',
		pais: 'Colombia',
		direccion: 'Calle 1 #2-3',
		ciudad: 'Bogotá',
		telefono: '3001234567',
		email: 'ana@example.com'
	};

	await badOrder('sin líneas → 400', { customer: validCustomer, lines: [], shipping: 'recogida' });
	await badOrder('variante inexistente → 400', {
		customer: validCustomer,
		lines: [{ slug: 'camiseta-solidaria', variantId: 'xxxl', quantity: 1 }],
		shipping: 'recogida'
	});
	await badOrder('producto inexistente → 400', {
		customer: validCustomer,
		lines: [{ slug: 'no-existe', variantId: null, quantity: 1 }],
		shipping: 'recogida'
	});
	await badOrder('cantidad 0 → 400', {
		customer: validCustomer,
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 0 }],
		shipping: 'recogida'
	});
	await badOrder('stock insuficiente → 400', {
		customer: validCustomer,
		lines: [{ slug: 'pelota-resistente', variantId: 'l', quantity: 1 }],
		shipping: 'recogida'
	});
	await badOrder('email inválido → 400', {
		customer: { ...validCustomer, email: 'no-es-correo' },
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
		shipping: 'recogida'
	});
	await badOrder('falta un campo obligatorio → 400', {
		customer: { ...validCustomer, ciudad: '' },
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
		shipping: 'recogida'
	});
	await badOrder('método de envío inválido → 400', {
		customer: validCustomer,
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
		shipping: 'teletransporte'
	});

	// El cliente no puede imponer precios: manda un total falso y se ignora.
	const spoofRes = await fetch(base + '/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			customer: validCustomer,
			lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
			shipping: 'recogida',
			totalCents: 1
		})
	});
	const spoof = await spoofRes.json();
	check('total enviado por el cliente se ignora', spoof.totalCents === 4200000, `got ${spoof.totalCents}`);

	console.log(`\n──────────────────────────────`);
	console.log(`  ${passed} correctas, ${failed} fallidas`);
	console.log(`──────────────────────────────\n`);
} finally {
	server.close();
	// Sin cerrar el pool, el proceso se queda vivo esperando conexiones.
	await closeDb();
}

process.exit(failed === 0 ? 0 : 1);
