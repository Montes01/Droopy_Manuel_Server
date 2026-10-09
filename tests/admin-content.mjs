/**
 * Pruebas de los endpoints de administración de noticias y contenido del sitio.
 *
 *   node --env-file=.env tests/admin-content.mjs
 */
import { createApp } from '../dist/app.js';
import { closeDb, db } from '../dist/db/index.js';
import { createUser } from '../dist/auth/users.js';
import { eq } from 'drizzle-orm';
import { adminUsers, news, siteSettings } from '../dist/db/schema/index.js';
import { getSiteContact } from '../dist/repositories/site.js';

const port = 3994;
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

const server = app.listen(port);

try {
	const stamp = Date.now();
	const adminEmail = `content-admin-${stamp}@example.com`;
	const editorEmail = `content-editor-${stamp}@example.com`;

	await createUser({ email: adminEmail, password: 'clave-admin-123', name: 'Admin', role: 'admin' });
	await createUser({ email: editorEmail, password: 'clave-editor-123', name: 'Editor', role: 'editor' });

	const admin = makeClient();
	const editor = makeClient();
	await admin.login(adminEmail, 'clave-admin-123');
	await editor.login(editorEmail, 'clave-editor-123');

	console.log('\n── Noticias ──');

	const anon = await fetch(base + '/api/admin/news', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ title: 'Intrusa' })
	});
	check('crear noticia sin sesión → 401', anon.status === 401, `status=${anon.status}`);

	const created = await admin.request('POST', '/api/admin/news', {
		title: 'Noticia de Prueba',
		excerpt: 'Bajada de prueba.',
		body: ['Primer párrafo.', 'Segundo párrafo.'],
		date: '2026-03-01',
		category: 'rescate',
		tags: ['prueba'],
		emoji: '🧪',
		relatedDogSlugs: ['luna', 'no-existe']
	});
	check('POST noticia → 201', created.status === 201, `status=${created.status}`);
	check('el slug sale del título', created.body?.slug === 'noticia-de-prueba', created.body?.slug);
	check('el cuerpo se guarda como lista', created.body?.body?.length === 2);
	check(
		'descarta slugs de perritos inexistentes',
		created.body?.relatedDogSlugs?.length === 1 && created.body.relatedDogSlugs[0] === 'luna',
		JSON.stringify(created.body?.relatedDogSlugs)
	);

	const newsSlug = created.body?.slug;

	const patched = await admin.request('PATCH', `/api/admin/news/${newsSlug}`, {
		title: 'Noticia Editada',
		category: 'salud'
	});
	check('PATCH edita la noticia', patched.body?.title === 'Noticia Editada');
	check('la categoría cambió', patched.body?.category === 'salud');
	check('los párrafos se conservan', patched.body?.body?.length === 2);

	const badCategory = await admin.request('PATCH', `/api/admin/news/${newsSlug}`, {
		category: 'inventada'
	});
	check('categoría inválida → 400', badCategory.status === 400, `status=${badCategory.status}`);

	const badDate = await admin.request('PATCH', `/api/admin/news/${newsSlug}`, { date: '1/3/2026' });
	check('fecha inválida → 400', badDate.status === 400, `status=${badDate.status}`);

	const emptyBody = await admin.request('PATCH', `/api/admin/news/${newsSlug}`, { body: [] });
	check('cuerpo vacío → 400', emptyBody.status === 400, `status=${emptyBody.status}`);

	const dupe = await admin.request('POST', '/api/admin/news', {
		title: 'Luna encontró hogar',
		excerpt: 'x',
		body: ['x'],
		date: '2026-01-01',
		category: 'adopcion',
		emoji: 'x'
	});
	check('slug duplicado → 400', dupe.status === 400, `status=${dupe.status}`);

	// El editor edita pero no borra.
	const editorEdit = await editor.request('PATCH', `/api/admin/news/${newsSlug}`, {
		excerpt: 'Editada por el editor.'
	});
	check('el editor puede editar noticias', editorEdit.status === 200, `status=${editorEdit.status}`);

	const editorDelete = await editor.request('DELETE', `/api/admin/news/${newsSlug}`);
	check('el editor NO puede borrar noticias → 403', editorDelete.status === 403, `status=${editorDelete.status}`);

	const adminDelete = await admin.request('DELETE', `/api/admin/news/${newsSlug}`);
	check('el admin borra la noticia → 204', adminDelete.status === 204, `status=${adminDelete.status}`);

	const [gone] = await db.select().from(news).where(eq(news.slug, newsSlug)).limit(1);
	check('la noticia desapareció de la base', gone === undefined);

	console.log('\n── Contenido del sitio ──');

	// Estadísticas
	const stats = await admin.request('PUT', '/api/admin/site/settings/stats', {
		value: { rescued: 300, adopted: 250, sterilized: 400, inCare: 40 }
	});
	check('PUT stats → 200', stats.status === 200, `status=${stats.status}`);

	const [savedStats] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, 'stats'))
		.limit(1);
	check('las estadísticas se guardaron', savedStats?.value?.rescued === 300, JSON.stringify(savedStats?.value));

	const badStats = await admin.request('PUT', '/api/admin/site/settings/stats', {
		value: { rescued: 'muchos' }
	});
	check('stats inválidas → 400', badStats.status === 400, `status=${badStats.status}`);

	const unknownKey = await admin.request('PUT', '/api/admin/site/settings/clave-inventada', {
		value: 'x'
	});
	check('clave desconocida → 400', unknownKey.status === 400, `status=${unknownKey.status}`);

	// Correo de contacto
	const badEmail = await admin.request('PUT', '/api/admin/site/settings/contact_email', {
		value: 'no-es-correo'
	});
	check('correo inválido → 400', badEmail.status === 400, `status=${badEmail.status}`);

	// WhatsApp: cambiar el número debe arrastrar el display y el enlace.
	const waRes = await admin.request('PATCH', '/api/admin/site/contact/whatsapp', {
		phoneNumber: '573001112233'
	});
	check('PATCH whatsapp → 200', waRes.status === 200, `status=${waRes.status}`);

	const contact = await getSiteContact();
	check('el número se actualizó', contact.whatsappNumber === '573001112233', contact.whatsappNumber);
	check('el display se derivó del número', contact.whatsappDisplay === '300 111 2233', contact.whatsappDisplay);
	check('el enlace usa el número nuevo', contact.whatsappUrl === 'https://wa.me/573001112233', contact.whatsappUrl);

	const badPhone = await admin.request('PATCH', '/api/admin/site/contact/whatsapp', {
		phoneNumber: 'abc'
	});
	check('número con letras → 400', badPhone.status === 400, `status=${badPhone.status}`);

	// Restaura el número original.
	await admin.request('PATCH', '/api/admin/site/contact/whatsapp', { phoneNumber: '573226438857' });

	// Niveles de donación
	const tier = await admin.request('POST', '/api/admin/site/donation-tiers', {
		stars: 20,
		name: 'Nivel de Prueba',
		priceCents: 100000,
		blurb: 'Prueba',
		perks: ['algo']
	});
	check('POST nivel de donación → 201', tier.status === 201, `status=${tier.status}`);

	const tierEdit = await admin.request('PATCH', '/api/admin/site/donation-tiers/20', {
		name: 'Nivel Editado'
	});
	check('PATCH nivel → 200', tierEdit.status === 200 && tierEdit.body.name === 'Nivel Editado');

	const tierDelete = await admin.request('DELETE', '/api/admin/site/donation-tiers/20');
	check('DELETE nivel → 204', tierDelete.status === 204, `status=${tierDelete.status}`);

	// Testimonios
	const testimonial = await admin.request('POST', '/api/admin/site/testimonials', {
		name: 'Persona de Prueba',
		role: 'Voluntaria',
		quote: 'Una frase de prueba.',
		dog: 'luna'
	});
	check('POST testimonio → 201', testimonial.status === 201, `status=${testimonial.status}`);
	check('el testimonio guarda el perrito', testimonial.body?.dog === 'luna');

	const testimonialId = testimonial.body?.id;
	const testimonialDelete = await admin.request('DELETE', `/api/admin/site/testimonials/${testimonialId}`);
	check('DELETE testimonio → 204', testimonialDelete.status === 204, `status=${testimonialDelete.status}`);

	// Cuentas bancarias
	const account = await admin.request('POST', '/api/admin/site/bank-accounts', {
		bank: 'Banco de Prueba',
		emoji: '🏦',
		method: 'transferencia',
		holder: 'Fundación',
		fields: [{ label: 'Número', value: '999', copyable: true }]
	});
	check('POST cuenta → 201', account.status === 201, `status=${account.status}`);

	const badMethod = await admin.request('POST', '/api/admin/site/bank-accounts', {
		bank: 'X',
		emoji: '🏦',
		method: 'efectivo',
		holder: 'X',
		fields: [{ label: 'a', value: 'b' }]
	});
	check('método de pago inválido → 400', badMethod.status === 400, `status=${badMethod.status}`);

	const noFields = await admin.request('POST', '/api/admin/site/bank-accounts', {
		bank: 'X',
		emoji: '🏦',
		method: 'transferencia',
		holder: 'X',
		fields: []
	});
	check('cuenta sin campos → 400', noFields.status === 400, `status=${noFields.status}`);

	const accountDelete = await admin.request('DELETE', `/api/admin/site/bank-accounts/${account.body?.id}`);
	check('DELETE cuenta → 204', accountDelete.status === 204, `status=${accountDelete.status}`);

	// Restaura el contenido que esta suite modifica, para que las demás
	// pruebas sigan viendo los valores originales.
	await admin.request('PUT', '/api/admin/site/settings/stats', {
		value: { rescued: 248, adopted: 196, sterilized: 312, inCare: 34 }
	});
	await admin.request('PUT', '/api/admin/site/settings/contact_email', {
		value: 'donaciones@droopymanuel.co'
	});

	// Limpieza de usuarios.
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
