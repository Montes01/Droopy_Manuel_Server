/**
 * Pruebas del panel de administración.
 *
 * Lo más importante aquí es comprobar que **sin autenticación no se escribe
 * nada**: un endpoint de escritura abierto es el peor fallo posible en este
 * proyecto. Se verifican también los roles y el registro de auditoría.
 *
 *   node --env-file=.env tests/admin.mjs
 */
import { createApp } from '../dist/app.js';
import { closeDb } from '../dist/db/index.js';
import { createUser, upsertUser } from '../dist/auth/users.js';
import { eq } from 'drizzle-orm';
import { db } from '../dist/db/index.js';
import { adminAuditLog, adminUsers, dogs } from '../dist/db/schema/index.js';

const port = 3997;
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

/** Cliente HTTP que conserva la cookie de sesión entre llamadas. */
function makeClient() {
	let cookie = '';

	return {
		get cookie() {
			return cookie;
		},
		async request(method, path, body) {
			const headers = { Accept: 'application/json' };
			if (body !== undefined) headers['Content-Type'] = 'application/json';
			if (cookie) headers.Cookie = cookie;

			const res = await fetch(base + path, {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body)
			});

			// Guarda la cookie que devuelva el servidor.
			const setCookie = res.headers.getSetCookie?.() ?? [];
			for (const entry of setCookie) {
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

const server = app.listen(port);

try {
	// Usuario administrador y usuario editor para probar los roles.
	const stamp = Date.now();
	const adminEmail = `admin-${stamp}@example.com`;
	const editorEmail = `editor-${stamp}@example.com`;

	await createUser({
		email: adminEmail,
		password: 'clave-admin-123',
		name: 'Admin',
		role: 'admin'
	});
	await createUser({
		email: editorEmail,
		password: 'clave-editor-123',
		name: 'Editor',
		role: 'editor'
	});

	console.log('\n── Escritura sin autenticación (debe fallar) ──');

	const anon = makeClient();
	const anonCreate = await anon.request('POST', '/api/admin/dogs', {
		name: 'Intruso',
		breed: 'Mestizo',
		ageYears: 1,
		ageLabel: '1 año',
		sex: 'macho',
		size: 'mediano',
		energy: 'tranquilo',
		status: 'en-adopcion',
		arrival: '2026-01-01',
		story: 'No debería existir.'
	});
	check('POST /api/admin/dogs sin sesión → 401', anonCreate.status === 401, `status=${anonCreate.status}`);

	const anonPatch = await anon.request('PATCH', '/api/admin/dogs/luna', { name: 'Hackeada' });
	check('PATCH sin sesión → 401', anonPatch.status === 401, `status=${anonPatch.status}`);

	const anonDelete = await anon.request('DELETE', '/api/admin/dogs/luna');
	check('DELETE sin sesión → 401', anonDelete.status === 401, `status=${anonDelete.status}`);

	// Y comprobamos que de verdad no se escribió nada.
	const [intruder] = await db.select().from(dogs).where(eq(dogs.name, 'Intruso')).limit(1);
	check('el perrito intruso no se creó', intruder === undefined);

	const [luna] = await db.select().from(dogs).where(eq(dogs.slug, 'luna')).limit(1);
	check('el perrito no se modificó', luna?.name === 'Luna', luna?.name);

	// Un token inventado tampoco vale.
	const fakeToken = makeClient();
	const badToken = await fetch(base + '/api/admin/dogs/luna', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', 'x-admin-token': 'token-falso' },
		body: JSON.stringify({ name: 'Otro intruso' })
	});
	check('token inválido → 401', badToken.status === 401, `status=${badToken.status}`);
	void fakeToken;

	console.log('\n── Sesión de administrador ──');

	const admin = makeClient();
	const loginRes = await admin.login(adminEmail, 'clave-admin-123');
	check('login correcto', loginRes.status === 200 && loginRes.body.user.role === 'admin');
	check('la cookie de sesión se guarda', admin.cookie.startsWith('dm_session='), admin.cookie.slice(0, 20));

	const me = await admin.request('GET', '/api/auth/me');
	check('GET /api/auth/me devuelve el usuario', me.status === 200 && me.body.user.email === adminEmail);

	// Crear
	const created = await admin.request('POST', '/api/admin/dogs', {
		name: 'Perrito de Prueba',
		breed: 'Mestizo',
		ageYears: 2,
		ageLabel: '2 años',
		sex: 'hembra',
		size: 'pequeño',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: false,
		status: 'en-adopcion',
		arrival: '2026-01-15',
		traits: ['prueba', 'temporal'],
		story: 'Perrito creado por la suite de pruebas.'
	});
	check('POST crea el perrito → 201', created.status === 201, `status=${created.status}`);
	check('el slug se deriva del nombre', created.body?.slug === 'perrito-de-prueba', created.body?.slug);
	check('goodWith se compone bien', created.body?.goodWith?.cats === false);

	const slug = created.body?.slug;

	// Editar
	const patched = await admin.request('PATCH', `/api/admin/dogs/${slug}`, {
		name: 'Perrito Editado',
		status: 'adoptado'
	});
	check('PATCH edita el perrito', patched.status === 200 && patched.body.name === 'Perrito Editado');
	check('el status cambió', patched.body?.status === 'adoptado', patched.body?.status);
	check('los campos no enviados se conservan', patched.body?.breed === 'Mestizo', patched.body?.breed);

	// Validaciones
	const badStatus = await admin.request('PATCH', `/api/admin/dogs/${slug}`, { status: 'inventado' });
	check('status inválido → 400', badStatus.status === 400, `status=${badStatus.status}`);

	const badDate = await admin.request('PATCH', `/api/admin/dogs/${slug}`, { arrival: '15/01/2026' });
	check('fecha mal formada → 400', badDate.status === 400, `status=${badDate.status}`);

	const dupe = await admin.request('POST', '/api/admin/dogs', {
		name: 'Luna',
		breed: 'X',
		ageYears: 1,
		ageLabel: '1 año',
		sex: 'hembra',
		size: 'mediano',
		energy: 'tranquilo',
		status: 'en-adopcion',
		arrival: '2026-01-01',
		story: 'Duplicado.'
	});
	check('slug duplicado → 400', dupe.status === 400, `status=${dupe.status}`);

	// Un 404 correcto
	const missing = await admin.request('PATCH', '/api/admin/dogs/no-existe', { name: 'X' });
	check('perrito inexistente → 404', missing.status === 404, `status=${missing.status}`);

	console.log('\n── Roles: el editor no puede borrar ──');

	const editor = makeClient();
	await editor.login(editorEmail, 'clave-editor-123');

	const editorCreate = await editor.request('POST', '/api/admin/dogs', {
		name: 'Creado por Editor',
		breed: 'Mestizo',
		ageYears: 1,
		ageLabel: '1 año',
		sex: 'macho',
		size: 'mediano',
		energy: 'tranquilo',
		status: 'en-adopcion',
		arrival: '2026-02-01',
		story: 'El editor sí puede crear.'
	});
	check('el editor puede crear → 201', editorCreate.status === 201, `status=${editorCreate.status}`);
	const editorSlug = editorCreate.body?.slug;

	const editorDelete = await editor.request('DELETE', `/api/admin/dogs/${editorSlug}`);
	check('el editor NO puede borrar → 403', editorDelete.status === 403, `status=${editorDelete.status}`);

	const adminDelete = await admin.request('DELETE', `/api/admin/dogs/${editorSlug}`);
	check('el admin sí puede borrar → 204', adminDelete.status === 204, `status=${adminDelete.status}`);

	console.log('\n── Tienda: productos y categorías ──');

	const anonShop = await anon.request('POST', '/api/admin/shop/items', { name: 'Intruso' });
	check('crear producto sin sesión → 401', anonShop.status === 401, `status=${anonShop.status}`);

	const newItem = await admin.request('POST', '/api/admin/shop/items', {
		name: 'Producto de Prueba',
		category: 'juguetes',
		priceCents: 1500000,
		description: 'Producto creado por las pruebas.',
		details: 'Detalle largo.',
		emoji: '🧪',
		tags: ['prueba'],
		variants: [
			{ label: 'Talla S', stock: 5 },
			{ label: 'Talla M', stock: 3, priceCents: 1700000 }
		]
	});
	check('POST producto con variantes → 201', newItem.status === 201, `status=${newItem.status}`);
	check('el slug sale del nombre', newItem.body?.slug === 'producto-de-prueba', newItem.body?.slug);
	check('se crearon las 2 variantes', newItem.body?.variants?.length === 2, `n=${newItem.body?.variants?.length}`);

	const itemSlug = newItem.body?.slug;
	const variantS = newItem.body?.variants?.find((v) => v.id === 'talla-s');
	check('la variante conserva su stock', variantS?.stock === 5, `stock=${variantS?.stock}`);

	const variantM = newItem.body?.variants?.find((v) => v.id === 'talla-m');
	check('la variante puede sobreescribir el precio', variantM?.priceCents === 1700000, `${variantM?.priceCents}`);

	// Ajuste de stock por variante.
	const stockRes = await admin.request('PATCH', `/api/admin/shop/items/${itemSlug}/stock`, {
		variantId: 'talla-s',
		stock: 42
	});
	const updatedS = stockRes.body?.variants?.find((v) => v.id === 'talla-s');
	check('PATCH stock actualiza la variante', stockRes.status === 200 && updatedS?.stock === 42, `stock=${updatedS?.stock}`);

	// Editar el producto.
	const editedItem = await admin.request('PATCH', `/api/admin/shop/items/${itemSlug}`, {
		name: 'Producto Editado',
		priceCents: 2000000
	});
	check('PATCH edita el producto', editedItem.body?.name === 'Producto Editado');
	check('las variantes se conservan al editar', editedItem.body?.variants?.length === 2);

	// Validaciones.
	const badCategory = await admin.request('POST', '/api/admin/shop/items', {
		name: 'Categoría Mala',
		category: 'no-existe',
		priceCents: 100,
		description: 'x',
		details: 'x',
		emoji: 'x'
	});
	check('categoría inexistente → 400', badCategory.status === 400, `status=${badCategory.status}`);

	const badPrice = await admin.request('PATCH', `/api/admin/shop/items/${itemSlug}`, {
		priceCents: -5
	});
	check('precio negativo → 400', badPrice.status === 400, `status=${badPrice.status}`);

	const dupeVariants = await admin.request('PATCH', `/api/admin/shop/items/${itemSlug}`, {
		variants: [
			{ id: 'x', label: 'A', stock: 1 },
			{ id: 'x', label: 'B', stock: 1 }
		]
	});
	check('variantes duplicadas → 400', dupeVariants.status === 400, `status=${dupeVariants.status}`);

	// Borrar una categoría con productos debe impedirse.
	const delUsedCategory = await admin.request('DELETE', '/api/admin/shop/categories/juguetes');
	check(
		'no se borra una categoría con productos → 400',
		delUsedCategory.status === 400,
		`status=${delUsedCategory.status}`
	);

	// El editor puede editar productos pero no borrarlos.
	const editorItem = await editor.request('PATCH', `/api/admin/shop/items/${itemSlug}`, {
		description: 'Editado por el editor.'
	});
	check('el editor puede editar productos', editorItem.status === 200, `status=${editorItem.status}`);

	const editorDeleteItem = await editor.request('DELETE', `/api/admin/shop/items/${itemSlug}`);
	check('el editor NO puede borrar productos → 403', editorDeleteItem.status === 403, `status=${editorDeleteItem.status}`);

	const adminDeleteItem = await admin.request('DELETE', `/api/admin/shop/items/${itemSlug}`);
	check('el admin borra el producto → 204', adminDeleteItem.status === 204, `status=${adminDeleteItem.status}`);

	console.log('\n── Auditoría ──');

	const audit = await admin.request('GET', '/api/auth/audit');
	check('GET /api/auth/audit responde', audit.status === 200 && Array.isArray(audit.body.entries));

	const entries = await db
		.select()
		.from(adminAuditLog)
		.where(eq(adminAuditLog.entity, 'dogs'));
	check('se registró la creación', entries.some((e) => e.action === 'crear'));
	check('se registró la edición', entries.some((e) => e.action === 'editar'));
	check('se registró el borrado', entries.some((e) => e.action === 'borrar'));
	check(
		'la auditoría guarda el valor anterior',
		entries.some((e) => e.before !== null && e.before?.includes('Luna') === false)
	);

	// Limpieza: borra el perrito de prueba principal.
	await admin.request('DELETE', `/api/admin/dogs/${slug}`);

	// Y los usuarios de esta corrida, para no acumular.
	await db.delete(adminUsers).where(eq(adminUsers.email, adminEmail));
	await db.delete(adminUsers).where(eq(adminUsers.email, editorEmail));

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
