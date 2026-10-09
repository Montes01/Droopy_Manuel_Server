/**
 * Verificación end-to-end contra un servidor real por HTTP.
 *
 * Uso: node tests/e2e-http.mjs [puerto]
 * (el servidor debe estar corriendo en ese puerto)
 */
const port = Number(process.argv[2] ?? 3100);
const base = `http://127.0.0.1:${port}`;

let ok = 0;
let fail = 0;

/**
 * Comprueba que el servidor que escucha es el build actual y no un proceso
 * viejo que quedó ocupando el puerto. Sin esto, un servidor obsoleto hace
 * fallar rutas nuevas con 404 y el error parece un bug del código.
 */
async function assertFreshServer() {
	let health;
	try {
		health = await fetch(`${base}/api/health`).then((r) => r.json());
	} catch {
		console.error(`\n✗ No hay ningún servidor escuchando en ${base}.`);
		console.error('  Arráncalo con: pnpm dev\n');
		process.exit(1);
	}

	if (health.status !== 'ok') {
		console.error(`\n✗ El puerto ${port} lo ocupa otro servicio, no esta API.`);
		console.error(`  Respuesta: ${JSON.stringify(health)}\n`);
		process.exit(1);
	}

	// El endpoint de contacto es reciente: si falta, el proceso es viejo.
	const contact = await fetch(`${base}/api/site/contact`);
	if (contact.status === 404) {
		console.error(`\n✗ El servidor en ${base} está desactualizado (no conoce /api/site/contact).`);
		console.error('  Es un proceso viejo ocupando el puerto. Ciérralo y arranca de nuevo:');
		console.error('    pnpm build && pnpm start\n');
		process.exit(1);
	}
}

async function check(label, path, predicate) {
	try {
		const res = await fetch(base + path);
		const body = await res.json();
		if (predicate(body, res.status)) {
			console.log(`  OK   ${label}`);
			ok++;
		} else {
			console.log(`  FAIL ${label} (respuesta inesperada)`);
			fail++;
		}
	} catch (error) {
		console.log(`  FAIL ${label} -> ${error.message}`);
		fail++;
	}
}

await assertFreshServer();

console.log(`\n=== Verificación HTTP real en ${base} ===\n`);

await check('GET /api/health', '/api/health', (b) => b.status === 'ok');
await check('GET /api/dogs (14)', '/api/dogs', (b) => b.length === 14);
await check('GET /api/dogs/featured (4)', '/api/dogs/featured', (b) => b.length === 4);
await check('GET /api/dogs/pack?view=heaven (2)', '/api/dogs/pack?view=heaven', (b) => b.length === 2);
await check('GET /api/dogs/luna', '/api/dogs/luna', (b) => b.name === 'Luna');
await check('GET /api/shop/categories (6)', '/api/shop/categories', (b) => b.length === 6);
await check('GET /api/shop/items (18)', '/api/shop/items', (b) => b.length === 18);
await check('GET /api/shop/items?category=ropa (3)', '/api/shop/items?category=ropa', (b) => b.length === 3);
await check('GET /api/shop/items/featured (6)', '/api/shop/items/featured', (b) => b.length === 6);
await check('GET /api/shop/shipping (2)', '/api/shop/shipping', (b) => b.length === 2);
await check('GET /api/news (12)', '/api/news', (b) => b.length === 12);
await check(
	'GET /api/news?offset=0&limit=6',
	'/api/news?offset=0&limit=6',
	(b) => b.items.length === 6 && b.hasMore === true
);
await check('GET /api/news/categories (5)', '/api/news/categories', (b) => b.length === 5);
await check('GET /api/site/content', '/api/site/content', (b) => b.stats.rescued === 248);
await check('GET /api/site/donation-tiers (4)', '/api/site/donation-tiers', (b) => b.length === 4);
await check('GET /api/site/testimonials (4)', '/api/site/testimonials', (b) => b.length === 4);
await check('GET /api/site/donation-targets (4)', '/api/site/donation-targets', (b) => b.length === 4);
await check('GET /api/site/bank-accounts (4)', '/api/site/bank-accounts', (b) => b.length === 4);
await check(
	'GET /api/site/contact',
	'/api/site/contact',
	(b) => b.whatsappDisplay === '322 643 8857' && b.socials.length === 5
);
await check('GET /api/nope -> 404 JSON', '/api/nope', (b, s) => s === 404 && b.error === 'not_found');

// Pedido real por HTTP: el servidor debe calcular el total.
try {
	const res = await fetch(`${base}/api/orders`, {
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
			lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
			shipping: 'domicilio'
		})
	});
	const order = await res.json();
	if (res.status === 201 && order.totalCents === 4800000) {
		console.log('  OK   POST /api/orders (total 4800000)');
		ok++;
	} else {
		console.log(`  FAIL POST /api/orders status=${res.status} total=${order.totalCents}`);
		fail++;
	}

	// Y se puede recuperar por número.
	const got = await fetch(`${base}/api/orders/${order.orderNumber}`).then((r) => r.json());
	if (got.orderNumber === order.orderNumber && got.status === 'pendiente') {
		console.log('  OK   GET /api/orders/:numero');
		ok++;
	} else {
		console.log('  FAIL GET /api/orders/:numero');
		fail++;
	}
} catch (error) {
	console.log(`  FAIL POST /api/orders -> ${error.message}`);
	fail++;
}

console.log(`\n  ${ok} correctas, ${fail} fallidas\n`);
process.exit(fail === 0 ? 0 : 1);
