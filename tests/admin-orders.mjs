/**
 * Pruebas de administración de pedidos y del correo de confirmación.
 *
 *   node --env-file=.env tests/admin-orders.mjs
 */
import { createApp } from '../dist/app.js';
import { closeDb, db } from '../dist/db/index.js';
import { createUser } from '../dist/auth/users.js';
import { eq, count } from 'drizzle-orm';
import { adminAuditLog, adminUsers, orderLines, orders } from '../dist/db/schema/index.js';

const port = 3991;
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

function makeClient() {
	let cookie = '';
	return {
		async request(method, path, body) {
			const headers = { Accept: 'application/json' };
			if (body !== undefined) headers['Content-Type'] = 'application/json';
			if (cookie) headers.Cookie = cookie;

			const res = await fetch(base + path, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body)
			});
			for (const entry of res.headers.getSetCookie?.() ?? []) {
				const pair = entry.split(';')[0];
				if (pair) cookie = pair;
			}
			const text = await res.text();
			let parsed = null;
			if (text) {
				try {
					parsed = JSON.parse(text);
				} catch {
					parsed = text;
				}
			}
			return { status: res.status, body: parsed };
		},
		login(email, password) {
			return this.request('POST', '/api/auth/login', { email, password });
		}
	};
}

/** Captura lo que se escribe en consola, para comprobar el correo. */
function captureConsole() {
	const original = console.log;
	const lines = [];
	console.log = (...args) => {
		lines.push(args.join(' '));
	};
	return {
		lines,
		restore: () => {
			console.log = original;
		}
	};
}

const server = app.listen(port);

try {
	const stamp = Date.now();
	const adminEmail = `orders-admin-${stamp}@example.com`;
	await createUser({ email: adminEmail, password: 'clave-admin-123', name: 'Admin', role: 'admin' });

	const admin = makeClient();
	await admin.login(adminEmail, 'clave-admin-123');

	// Cuántos pedidos había antes: otras suites pueden dejar los suyos, así que
	// las comprobaciones de total se hacen en términos relativos.
	const [initialCount] = await db.select({ total: count() }).from(orders);
	const startingOrders = initialCount?.total ?? 0;

	console.log('\n── Acceso ──');

	const anonList = await fetch(base + '/api/admin/orders');
	check('listar pedidos sin sesión → 401', anonList.status === 401, `status=${anonList.status}`);

	const anonPatch = await fetch(base + '/api/admin/orders/DM-XXX', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ status: 'enviado' })
	});
	check('cambiar estado sin sesión → 401', anonPatch.status === 401, `status=${anonPatch.status}`);

	console.log('\n── Crear un pedido y comprobar el correo ──');

	const captured = captureConsole();
	let orderNumber;
	try {
		const created = await fetch(base + '/api/orders', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				customer: {
					nombres: 'Cliente',
					apellidos: 'De Prueba',
					pais: 'Colombia',
					direccion: 'Calle 1',
					ciudad: 'Bogotá',
					telefono: '3001112233',
					email: 'cliente-pedido@example.com'
				},
				lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
				shipping: 'recogida'
			})
		});
		const body = await created.json();
		orderNumber = body.orderNumber;
		check('el pedido se crea → 201', created.status === 201, `status=${created.status}`);

		// El envío es asíncrono (fuera del camino crítico): damos un momento.
		await new Promise((resolve) => setTimeout(resolve, 800));
	} finally {
		captured.restore();
	}

	const mailLog = captured.lines.join('\n');
	check('se registró el correo interno', mailLog.includes('Entró un pedido nuevo'));
	check('el correo interno lleva el número', mailLog.includes(orderNumber));
	check('se registró el correo al cliente', mailLog.includes('cliente-pedido@example.com'));
	check(
		'el correo al cliente lleva el total',
		// Taza Manada: 4200000 centavos = $42.000, y la recogida es gratis.
		mailLog.includes('$42.000'),
		mailLog.match(/\$[\d.]+/g)?.slice(0, 5).join(', ')
	);
	check('avisa de que es solo registro', mailLog.includes('no enviado, solo registro'));

	console.log('\n── Listado y filtros ──');

	// Un segundo pedido, para que el listado tenga más de uno y el límite
	// pueda comprobarse de verdad (la suite arranca con la tabla vacía).
	const second = await fetch(base + '/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			customer: {
				nombres: 'Otro',
				apellidos: 'Cliente',
				pais: 'Colombia',
				direccion: 'Calle 2',
				ciudad: 'Medellín',
				telefono: '3009998877',
				email: 'otro-cliente@example.com'
			},
			lines: [{ slug: 'taza-manada', variantId: null, quantity: 1 }],
			shipping: 'recogida'
		})
	});
	const secondBody = await second.json();
	check('se crea un segundo pedido', second.status === 201, `status=${second.status}`);

	const list = await admin.request('GET', '/api/admin/orders');
	check('GET /api/admin/orders → 200', list.status === 200, `status=${list.status}`);
	check('devuelve pedidos y total', Array.isArray(list.body?.orders) && typeof list.body?.total === 'number');
	check('el pedido nuevo está en la lista', list.body.orders.some((o) => o.orderNumber === orderNumber));
	check(
		'la lista incluye los dos pedidos nuevos',
		list.body.total === startingOrders + 2,
		`total=${list.body.total}, esperado=${startingOrders + 2}`
	);

	const byStatus = await admin.request('GET', '/api/admin/orders?status=pendiente');
	check(
		'filtra por estado',
		byStatus.body.orders.every((o) => o.status === 'pendiente'),
		`n=${byStatus.body.orders.length}`
	);

	const bySearch = await admin.request('GET', '/api/admin/orders?q=cliente-pedido@example.com');
	check(
		'busca por correo',
		bySearch.body.orders.some((o) => o.orderNumber === orderNumber),
		`n=${bySearch.body.orders.length}`
	);

	const limited = await admin.request('GET', '/api/admin/orders?limit=1');
	check('respeta el límite', limited.body.orders.length === 1, `n=${limited.body.orders.length}`);
	check(
		'el total ignora el límite',
		limited.body.total === startingOrders + 2,
		`total=${limited.body.total}, esperado=${startingOrders + 2}`
	);

	const badStatus = await admin.request('GET', '/api/admin/orders?status=inventado');
	check('estado inválido en filtro → 400', badStatus.status === 400, `status=${badStatus.status}`);

	const badLimit = await admin.request('GET', '/api/admin/orders?limit=0');
	check('límite inválido → 400', badLimit.status === 400, `status=${badLimit.status}`);

	console.log('\n── Detalle y cambio de estado ──');

	const detail = await admin.request('GET', `/api/admin/orders/${orderNumber}`);
	check('detalle por número → 200', detail.status === 200, `status=${detail.status}`);
	check('el detalle trae al cliente', detail.body?.customer?.nombres === 'Cliente');
	check('el detalle trae las líneas', detail.body?.lines?.length === 1);
	check('nace pendiente y sin pagar', detail.body?.status === 'pendiente' && detail.body?.paymentStatus === 'sin-pago');

	const confirmed = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {
		status: 'confirmado',
		paymentStatus: 'pagado'
	});
	check('cambia estado y pago → 200', confirmed.status === 200, `status=${confirmed.status}`);
	check('el estado quedó en confirmado', confirmed.body?.status === 'confirmado');
	check('el pago quedó en pagado', confirmed.body?.paymentStatus === 'pagado');

	// Solo el pago, sin tocar el estado.
	const onlyPayment = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {
		paymentStatus: 'en-revision'
	});
	check('se puede cambiar solo el pago', onlyPayment.body?.paymentStatus === 'en-revision');
	check('el estado no cambió', onlyPayment.body?.status === 'confirmado', onlyPayment.body?.status);

	// Y solo el estado, sin tocar el pago.
	const onlyStatus = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {
		status: 'enviado'
	});
	check('se puede cambiar solo el estado', onlyStatus.body?.status === 'enviado');
	check('el pago no cambió', onlyStatus.body?.paymentStatus === 'en-revision', onlyStatus.body?.paymentStatus);

	console.log('\n── Validaciones ──');

	const badState = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {
		status: 'entregadisimo'
	});
	check('estado inválido → 400', badState.status === 400, `status=${badState.status}`);

	const badPayment = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {
		paymentStatus: 'pagando'
	});
	check('estado de pago inválido → 400', badPayment.status === 400, `status=${badPayment.status}`);

	const empty = await admin.request('PATCH', `/api/admin/orders/${orderNumber}`, {});
	check('sin campos → 400', empty.status === 400, `status=${empty.status}`);

	const missing = await admin.request('PATCH', '/api/admin/orders/DM-NOEXISTE', {
		status: 'enviado'
	});
	check('pedido inexistente → 404', missing.status === 404, `status=${missing.status}`);

	const missingDetail = await admin.request('GET', '/api/admin/orders/DM-NOEXISTE');
	check('detalle inexistente → 404', missingDetail.status === 404, `status=${missingDetail.status}`);

	console.log('\n── Auditoría ──');

	const audit = await db.select().from(adminAuditLog).where(eq(adminAuditLog.entity, 'orders'));
	check('el cambio quedó auditado', audit.length > 0, `n=${audit.length}`);
	check(
		'la auditoría guarda el estado anterior',
		audit.some((entry) => entry.before?.includes('pendiente')),
		audit[0]?.before?.slice(0, 60)
	);
	check('la auditoría identifica al usuario', audit.some((entry) => entry.userId !== null));

	// Limpieza: los pedidos de prueba y sus líneas.
	for (const num of [orderNumber, secondBody.orderNumber]) {
		const [row] = await db.select().from(orders).where(eq(orders.orderNumber, num)).limit(1);
		if (row) {
			await db.delete(orderLines).where(eq(orderLines.orderId, row.id));
			await db.delete(orders).where(eq(orders.id, row.id));
		}
	}
	await db.delete(adminUsers).where(eq(adminUsers.email, adminEmail));

	console.log('\n──────────────────────────────');
	console.log(`  ${passed} correctas, ${failed} fallidas`);
	console.log('──────────────────────────────\n');
} catch (error) {
	console.error('\nLa suite falló:', error);
	failed++;
} finally {
	server.close();
	await closeDb();
}

process.exit(failed === 0 ? 0 : 1);
