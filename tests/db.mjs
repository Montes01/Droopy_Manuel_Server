/**
 * Pruebas de la capa de base de datos.
 *
 * Cubren lo que la suite HTTP no puede comprobar: que el stock se descuente de
 * forma atómica, que un pedido fallido no deje stock a medias, y que el control
 * de acceso del panel funcione.
 *
 *   node --env-file=.env tests/db.mjs
 *
 * Ejecuta `pnpm db:reset` antes (o usa `pnpm test`).
 */
import { and, eq, sql } from 'drizzle-orm';
import { closeDb, db } from '../dist/db/index.js';
import {
	adminUsers,
	orderLines,
	orders,
	shopItems,
	shopVariants
} from '../dist/db/schema/index.js';
import {
	OrderValidationError,
	createOrder,
	getAllOrders,
	getOrder
} from '../dist/repositories/orders.js';
import {
	createUser,
	listUsers,
	login,
	logout,
	resolveSession,
	verifyPasswordOf
} from '../dist/auth/users.js';
import { getItem } from '../dist/repositories/shop.js';

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

const customer = {
	nombres: 'Prueba',
	apellidos: 'Db',
	pais: 'Colombia',
	direccion: 'Calle 1',
	ciudad: 'Bogotá',
	telefono: '3000000000',
	email: 'db-test@example.com'
};

/** Lee el stock actual de una variante. */
async function stockOf(itemSlug, variantId) {
	const [row] = await db
		.select({ stock: shopVariants.stock })
		.from(shopVariants)
		.where(and(eq(shopVariants.itemSlug, itemSlug), eq(shopVariants.variantId, variantId)))
		.limit(1);
	return row?.stock;
}

async function itemStockOf(slug) {
	const [row] = await db
		.select({ stock: shopItems.stock })
		.from(shopItems)
		.where(eq(shopItems.slug, slug))
		.limit(1);
	return row?.stock;
}

/** Lee el hash guardado y comprueba que no contiene la contraseña en claro. */
async function passwordIsHashed(email) {
	const [row] = await db
		.select({ hash: adminUsers.passwordHash })
		.from(adminUsers)
		.where(eq(adminUsers.email, email.toLowerCase()))
		.limit(1);
	if (!row) return false;
	// bcrypt produce algo como $2b$12$...; nunca la contraseña original.
	return row.hash.startsWith('$2') && !row.hash.includes('secreto-largo-123');
}

try {
	console.log('\n── Descuento de stock ──');

	const before = await stockOf('camiseta-solidaria', 'm');
	await createOrder({
		customer,
		lines: [{ slug: 'camiseta-solidaria', variantId: 'm', quantity: 2 }],
		shipping: 'recogida'
	});
	const after = await stockOf('camiseta-solidaria', 'm');
	check('el pedido descuenta stock', after === before - 2, `${before} → ${after}`);

	const beforeItem = await itemStockOf('taza-manada');
	await createOrder({
		customer,
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 3 }],
		shipping: 'recogida'
	});
	const afterItem = await itemStockOf('taza-manada');
	check('descuenta en producto sin variantes', afterItem === beforeItem - 3, `${beforeItem} → ${afterItem}`);

	console.log('\n── Transacción: un pedido fallido no deja rastro ──');

	const stockBeforeFailed = await stockOf('camiseta-solidaria', 'm');
	let threw = false;
	try {
		// Primera línea válida, segunda sin stock: debe revertirse todo.
		await createOrder({
			customer,
			lines: [
				{ slug: 'camiseta-solidaria', variantId: 'm', quantity: 1 },
				{ slug: 'pelota-resistente', variantId: 'l', quantity: 1 }
			],
			shipping: 'recogida'
		});
	} catch (error) {
		threw = error instanceof OrderValidationError;
	}
	const stockAfterFailed = await stockOf('camiseta-solidaria', 'm');
	check('el pedido inválido falla', threw);
	check(
		'la primera línea se revierte (rollback)',
		stockAfterFailed === stockBeforeFailed,
		`${stockBeforeFailed} → ${stockAfterFailed}`
	);

	console.log('\n── Concurrencia: no se puede sobrevender ──');

	// Pone una variante con stock 1 y lanza dos compras simultáneas.
	await db
		.update(shopVariants)
		.set({ stock: 1 })
		.where(and(eq(shopVariants.itemSlug, 'camiseta-solidaria'), eq(shopVariants.variantId, 'xl')));

	const results = await Promise.allSettled([
		createOrder({
			customer,
			lines: [{ slug: 'camiseta-solidaria', variantId: 'xl', quantity: 1 }],
			shipping: 'recogida'
		}),
		createOrder({
			customer,
			lines: [{ slug: 'camiseta-solidaria', variantId: 'xl', quantity: 1 }],
			shipping: 'recogida'
		})
	]);

	const okCount = results.filter((r) => r.status === 'fulfilled').length;
	const finalStock = await stockOf('camiseta-solidaria', 'xl');
	check('solo una de dos compras simultáneas pasa', okCount === 1, `exitosas=${okCount}`);
	check('el stock nunca queda negativo', finalStock === 0, `stock=${finalStock}`);

	console.log('\n── Persistencia del pedido ──');

	const order = await createOrder({
		customer,
		lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
		shipping: 'domicilio'
	});
	const fetched = await getOrder(order.orderNumber);
	check('el pedido se recupera por número', fetched?.orderNumber === order.orderNumber);
	check('conserva el cliente', fetched?.customer.email === customer.email);
	check(
		'conserva las líneas con su nombre',
		fetched?.lines[0]?.name === 'Taza Manada',
		fetched?.lines[0]?.name
	);
	check('nace pendiente y sin pagar', fetched?.status === 'pendiente' && fetched?.paymentStatus === 'sin-pago');

	// Los precios quedan congelados: cambiar el catálogo no altera el pedido.
	await db
		.update(shopItems)
		.set({ priceCents: 9999999 })
		.where(eq(shopItems.slug, 'taza-manada'));
	const afterPriceChange = await getOrder(order.orderNumber);
	check(
		'el total del pedido no cambia si cambia el precio',
		afterPriceChange?.totalCents === order.totalCents,
		`${order.totalCents} vs ${afterPriceChange?.totalCents}`
	);
	// Restaura el precio para no ensuciar la base.
	await db
		.update(shopItems)
		.set({ priceCents: 4200000 })
		.where(eq(shopItems.slug, 'taza-manada'));

	const all = await getAllOrders();
	check('getAllOrders devuelve los pedidos', all.length >= 3, `n=${all.length}`);

	console.log('\n── Autenticación ──');

	const email = `admin-test-${Date.now()}@example.com`;
	const user = await createUser({
		email,
		password: 'secreto-largo-123',
		name: 'Prueba',
		role: 'editor'
	});
	check('crear usuario', user.email === email && user.role === 'editor');
	check(
		'la contraseña no se guarda en claro',
		await passwordIsHashed(email, 'secreto-largo-123')
	);
	check('verifyPasswordOf acepta la correcta', await verifyPasswordOf(email, 'secreto-largo-123'));
	check('verifyPasswordOf rechaza la incorrecta', !(await verifyPasswordOf(email, 'incorrecta')));

	const wrong = await login(email, 'contraseña-mala');
	check('login con contraseña incorrecta falla', wrong === undefined);

	const ok = await login(email, 'secreto-largo-123');
	check('login correcto devuelve token', typeof ok?.token === 'string' && ok.token.length === 64);

	if (ok) {
		const resolved = await resolveSession(ok.token);
		check('la sesión se resuelve por token', resolved?.id === user.id);

		await logout(ok.token);
		const afterLogout = await resolveSession(ok.token);
		check('tras cerrar sesión el token no sirve', afterLogout === undefined);
	}

	// El email no distingue mayúsculas: evita cuentas duplicadas.
	const upper = await login(email.toUpperCase(), 'secreto-largo-123');
	check('login insensible a mayúsculas', upper !== undefined);
	if (upper) await logout(upper.token);

	const users = await listUsers();
	check('el usuario aparece en el listado', users.some((u) => u.email === email));

	console.log('\n──────────────────────────────');
	console.log(`  ${passed} correctas, ${failed} fallidas`);
	console.log('──────────────────────────────\n');
} catch (error) {
	console.error('\nLa suite falló:', error);
	failed++;
} finally {
	await closeDb();
}

process.exit(failed === 0 ? 0 : 1);
