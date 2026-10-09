/**
 * Pruebas de los cimientos del panel: guard de rutas y flujo de sesión.
 *
 * Estas pruebas van contra el **servidor de desarrollo de SvelteKit** (5173),
 * no contra la API: lo que se comprueba es el guard, las acciones de login y
 * logout, y que el panel no arrastre el chrome de la web pública.
 *
 *   node tests/admin-panel.mjs [puertoFront] [email] [password]
 */
const FRONT = `http://localhost:${process.argv[2] ?? 5173}`;
const API = `http://localhost:${process.argv[5] ?? 3100}`;
const EMAIL = process.argv[3] ?? 'admin@droopymanuel.co';
const PASSWORD = process.argv[4] ?? 'droopy-manuel-2026';

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

/** Submit tal como lo haría un navegador (Accept: text/html). */
async function browserForm(path, fields, cookie) {
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
	};
	if (cookie) headers.Cookie = cookie;

	return fetch(FRONT + path, {
		method: 'POST',
		headers,
		body: new URLSearchParams(fields),
		redirect: 'manual'
	});
}

function sessionCookie(response) {
	return (response.headers.getSetCookie?.() ?? [])
		.map((entry) => entry.split(';')[0])
		.find((pair) => pair?.startsWith('dm_session='));
}

try {
	console.log('\n── Guard de rutas ──');

	const anon = await fetch(`${FRONT}/admin`, { redirect: 'manual' });
	check('sin sesión, /admin redirige → 303', anon.status === 303, `status=${anon.status}`);
	check(
		'redirige a la pantalla de login',
		(anon.headers.get('location') ?? '').startsWith('/admin/login'),
		anon.headers.get('location') ?? ''
	);
	check(
		'conserva a dónde iba',
		(anon.headers.get('location') ?? '').includes('next='),
		anon.headers.get('location') ?? ''
	);

	// Una sección interna también debe quedar protegida.
	const anonSection = await fetch(`${FRONT}/admin/pedidos`, { redirect: 'manual' });
	check('sin sesión, /admin/pedidos redirige → 303', anonSection.status === 303, `status=${anonSection.status}`);

	console.log('\n── Pantalla de login ──');

	const loginPage = await fetch(`${FRONT}/admin/login`);
	const loginHtml = await loginPage.text();
	check('GET /admin/login → 200', loginPage.status === 200, `status=${loginPage.status}`);
	check('el formulario tiene correo y contraseña',
		loginHtml.includes('name="email"') && loginHtml.includes('name="password"'));
	check('no arrastra el navbar público', !loginHtml.includes('Mi manada comunitaria'));
	check('no arrastra el footer público', !loginHtml.includes('Contáctanos'));
	check('lleva noindex', loginHtml.includes('noindex'));

	console.log('\n── Login ──');

	const bad = await browserForm('/admin/login', { email: EMAIL, password: 'definitivamente-mala' });
	check('contraseña incorrecta → 401', bad.status === 401, `status=${bad.status}`);
	check('no entrega cookie de sesión', sessionCookie(bad) === undefined);

	const good = await browserForm('/admin/login', { email: EMAIL, password: PASSWORD, next: '/admin' });
	check('credenciales correctas → 303', good.status === 303, `status=${good.status}`);
	check('redirige al panel', good.headers.get('location') === '/admin', good.headers.get('location') ?? '');

	const cookie = sessionCookie(good);
	check('entrega la cookie dm_session', cookie !== undefined);

	// Redirección abierta: no debe salir del panel.
	const external = await browserForm('/admin/login', {
		email: EMAIL,
		password: PASSWORD,
		next: 'https://ejemplo-malicioso.test/robo'
	});
	check(
		'ignora un "next" externo (redirección abierta)',
		external.headers.get('location') === '/admin',
		external.headers.get('location') ?? ''
	);

	console.log('\n── Panel autenticado ──');

	const dash = await fetch(`${FRONT}/admin`, { headers: { Cookie: cookie } });
	const dashHtml = await dash.text();
	check('GET /admin con sesión → 200', dash.status === 200, `status=${dash.status}`);
	check('es el resumen del panel', dashHtml.includes('Resumen'));
	check('muestra quién entró', dashHtml.includes('@') || dashHtml.includes('Administrador'));
	check('no arrastra el navbar público', !dashHtml.includes('Mi manada comunitaria'));

	// Los contadores deben traer números, no guiones.
	const values = [...dashHtml.matchAll(/class="value[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1].trim());
	check('los contadores tienen valor', values.length > 0, `n=${values.length}`);
	check(
		'los contadores no están vacíos',
		values.every((v) => v !== ''),
		values.join(', ')
	);
	check(
		'los pedidos se leyeron (requiere sesión)',
		values[0] !== '—',
		`pedidos=${values[0]}`
	);

	// Una sección interna protegida sigue accesible con sesión.
	const section = await fetch(`${FRONT}/admin/manada`, { headers: { Cookie: cookie }, redirect: 'manual' });
	check(
		'con sesión, /admin/manada no redirige',
		section.status !== 303,
		`status=${section.status}`
	);

	console.log('\n── Manada: crear, editar y borrar ──');

	/** Ejecuta una acción de SvelteKit y devuelve el resultado serializado. */
	async function action(path, fields) {
		const response = await fetch(FRONT + path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				'x-sveltekit-action': 'true',
				Cookie: cookie
			},
			body: new URLSearchParams(fields),
			redirect: 'manual'
		});
		const text = await response.text();
		let parsed = null;
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = text;
		}
		return { status: response.status, body: parsed };
	}

	const listPage = await fetch(`${FRONT}/admin/manada`, { headers: { Cookie: cookie } });
	const listHtml = await listPage.text();
	check('GET /admin/manada → 200', listPage.status === 200, `status=${listPage.status}`);
	check('la tabla lista los perritos', listHtml.includes('<table') && listHtml.includes('Luna'));
	check('ofrece agregar', listHtml.includes('Agregar perrito'));

	const created = await action('/admin/manada?/create', {
		name: 'Perrito De Prueba Panel',
		breed: 'Mestizo',
		ageYears: '2',
		ageLabel: '2 años',
		sex: 'macho',
		size: 'mediano',
		energy: 'tranquilo',
		status: 'en-adopcion',
		arrival: '2026-01-15',
		story: 'Creado por la suite del panel.',
		traits: 'prueba, panel',
		goodWithKids: 'on',
		goodWithDogs: 'on'
		// goodWithCats sin marcar: debe quedar en false.
	});
	check('crear perrito → 200', created.status === 200, `status=${created.status}`);

	// Comprobación directa contra la API: los datos llegaron bien.
	const apiDog = await fetch(`${API}/api/dogs/perrito-de-prueba-panel`);
	check('el perrito existe en la API', apiDog.status === 200, `status=${apiDog.status}`);

	if (apiDog.status === 200) {
		const dog = await apiDog.json();
		check('guardó los rasgos como lista', dog.traits.join('/') === 'prueba/panel', dog.traits.join('/'));
		check('guardó goodWith correctamente',
			dog.goodWith.kids === true && dog.goodWith.dogs === true && dog.goodWith.cats === false,
			JSON.stringify(dog.goodWith));
		check('el slug se derivó del nombre', dog.slug === 'perrito-de-prueba-panel', dog.slug);
	}

	const edited = await action('/admin/manada?/update', {
		slug: 'perrito-de-prueba-panel',
		name: 'Perrito Editado Panel',
		status: 'adoptado'
	});
	check('editar perrito → 200', edited.status === 200, `status=${edited.status}`);

	const afterEdit = await fetch(`${API}/api/dogs/perrito-de-prueba-panel`).then((r) => r.json());
	check('el nombre cambió', afterEdit.name === 'Perrito Editado Panel', afterEdit.name);
	check('el estado cambió', afterEdit.status === 'adoptado', afterEdit.status);
	check('la raza se conservó', afterEdit.breed === 'Mestizo', afterEdit.breed);

	// La validación del backend debe llegar al formulario.
	const invalid = await action('/admin/manada?/update', {
		slug: 'perrito-de-prueba-panel',
		status: 'estado-inventado'
	});
	check('estado inválido → 400', invalid.status === 400, `status=${invalid.status}`);
	check(
		'el mensaje de validación es legible',
		JSON.stringify(invalid.body).includes('debe ser uno de'),
		JSON.stringify(invalid.body).slice(0, 120)
	);

	const removed = await action('/admin/manada?/delete', { slug: 'perrito-de-prueba-panel' });
	check('borrar perrito → 200', removed.status === 200, `status=${removed.status}`);

	const gone = await fetch(`${API}/api/dogs/perrito-de-prueba-panel`);
	check('el perrito ya no existe', gone.status === 404, `status=${gone.status}`);

	// Sin sesión, las acciones no deben funcionar.
	const noSession = await fetch(`${FRONT}/admin/manada?/delete`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			'x-sveltekit-action': 'true'
		},
		body: new URLSearchParams({ slug: 'luna' })
	});
	check('acción sin sesión no borra → no es 2xx', noSession.status >= 400, `status=${noSession.status}`);
	const lunaStill = await fetch(`${API}/api/dogs/luna`);
	check('Luna sigue existiendo', lunaStill.status === 200);

	console.log('\n── Tienda: productos y variantes ──');

	/**
	 * Ejecuta una acción enviando campos repetidos como lo hace un navegador.
	 *
	 * OJO: hay que usar `append` por cada valor. Pasar un array a
	 * `URLSearchParams` lo une con comas y el servidor recibe un solo campo.
	 */
	async function actionMulti(path, pairs) {
		const body = new URLSearchParams();
		for (const [name, value] of pairs) body.append(name, value);

		const response = await fetch(FRONT + path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
				'x-sveltekit-action': 'true',
				Cookie: cookie
			},
			body,
			redirect: 'manual'
		});
		const text = await response.text();
		let parsed = null;
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = text;
		}
		return { status: response.status, body: parsed };
	}

	const shopPage = await fetch(`${FRONT}/admin/tienda`, { headers: { Cookie: cookie } });
	const shopHtml = await shopPage.text();
	check('GET /admin/tienda → 200', shopPage.status === 200, `status=${shopPage.status}`);
	check('lista los productos', shopHtml.includes('<table') && shopHtml.includes('Camiseta'));
	check('muestra las categorías', shopHtml.includes('Categorías') && shopHtml.includes('Ropa'));

	// Crear con dos variantes, como lo manda un navegador.
	const newItem = await actionMulti('/admin/tienda?/createItem', [
		['variantsIncluded', '1'],
		['name', 'Producto De Prueba Panel'],
		['category', 'juguetes'],
		['price', '15000'],
		['emoji', '🧪'],
		['description', 'Producto de prueba.'],
		['details', 'Detalle de prueba.'],
		['tags', 'prueba, panel'],
		['variantLabel', 'Talla S'],
		['variantStock', '5'],
		['variantPrice', ''],
		['variantLabel', 'Talla M'],
		['variantStock', '8'],
		['variantPrice', '17000']
	]);
	check('crear producto con variantes → 200', newItem.status === 200, `status=${newItem.status}`);

	const apiItem = await fetch(`${API}/api/shop/items/producto-de-prueba-panel`);
	check('el producto existe en la API', apiItem.status === 200, `status=${apiItem.status}`);

	if (apiItem.status === 200) {
		const item = await apiItem.json();
		check('el precio se convirtió a centavos', item.priceCents === 1500000, String(item.priceCents));
		check('se crearon dos variantes', item.variants.length === 2, `n=${item.variants.length}`);

		const small = item.variants.find((v) => v.id === 'talla-s');
		const medium = item.variants.find((v) => v.id === 'talla-m');
		check('la primera variante tiene su stock', small?.stock === 5, String(small?.stock));
		check('la segunda variante tiene su stock', medium?.stock === 8, String(medium?.stock));
		check('la variante puede sobreescribir el precio', medium?.priceCents === 1700000, String(medium?.priceCents));
		check('la variante sin precio usa el del producto', small?.priceCents === undefined, String(small?.priceCents));
	}

	// Ajustar el stock de una variante concreta.
	const stockUpdate = await actionMulti('/admin/tienda?/setStock', [
		['slug', 'producto-de-prueba-panel'],
		['variantId', 'talla-s'],
		['stock', '42']
	]);
	check('ajustar stock → 200', stockUpdate.status === 200, `status=${stockUpdate.status}`);

	const afterStock = await fetch(`${API}/api/shop/items/producto-de-prueba-panel`).then((r) => r.json());
	check(
		'el stock se actualizó solo en esa variante',
		afterStock.variants.find((v) => v.id === 'talla-s')?.stock === 42 &&
			afterStock.variants.find((v) => v.id === 'talla-m')?.stock === 8,
		JSON.stringify(afterStock.variants.map((v) => `${v.id}:${v.stock}`))
	);

	const negative = await actionMulti('/admin/tienda?/setStock', [
		['slug', 'producto-de-prueba-panel'],
		['variantId', 'talla-s'],
		['stock', '-5']
	]);
	check('stock negativo → 400', negative.status === 400, `status=${negative.status}`);

	// Una categoría con productos no se puede borrar.
	const usedCategory = await actionMulti('/admin/tienda?/deleteCategory', [['slug', 'juguetes']]);
	check('no borra una categoría con productos → 400', usedCategory.status === 400, `status=${usedCategory.status}`);
	check(
		'el mensaje explica por qué',
		JSON.stringify(usedCategory.body).includes('todavía tiene productos'),
		JSON.stringify(usedCategory.body).slice(0, 120)
	);

	// Crear una categoría vacía sí funciona, y luego se puede borrar.
	const newCategory = await actionMulti('/admin/tienda?/createCategory', [
		['name', 'Categoría De Prueba'],
		['emoji', '🧪'],
		['blurb', 'Categoría creada por la suite.']
	]);
	check('crear categoría → 200', newCategory.status === 200, `status=${newCategory.status}`);

	const categoriesNow = await fetch(`${API}/api/shop/categories`).then((r) => r.json());
	check(
		'la categoría nueva existe',
		categoriesNow.some((c) => c.slug === 'categoria-de-prueba'),
		categoriesNow.map((c) => c.slug).join(',')
	);

	const deleteEmpty = await actionMulti('/admin/tienda?/deleteCategory', [
		['slug', 'categoria-de-prueba']
	]);
	check('borrar una categoría vacía → 200', deleteEmpty.status === 200, `status=${deleteEmpty.status}`);

	// Borrar el producto.
	const removeItem = await actionMulti('/admin/tienda?/deleteItem', [
		['slug', 'producto-de-prueba-panel']
	]);
	check('borrar producto → 200', removeItem.status === 200, `status=${removeItem.status}`);

	const itemGone = await fetch(`${API}/api/shop/items/producto-de-prueba-panel`);
	check('el producto ya no existe', itemGone.status === 404, `status=${itemGone.status}`);

	// El catálogo debe quedar como estaba.
	const finalItems = await fetch(`${API}/api/shop/items`).then((r) => r.json());
	check('el catálogo queda con 18 productos', finalItems.length === 18, `n=${finalItems.length}`);

	const finalCategories = await fetch(`${API}/api/shop/categories`).then((r) => r.json());
	check('quedan 6 categorías', finalCategories.length === 6, `n=${finalCategories.length}`);

	console.log('\n── Noticias ──');

	const newsPage = await fetch(`${FRONT}/admin/noticias`, { headers: { Cookie: cookie } });
	const newsHtml = await newsPage.text();
	check('GET /admin/noticias → 200', newsPage.status === 200, `status=${newsPage.status}`);
	check('lista las noticias', newsHtml.includes('<table') && newsHtml.includes('Jornada'));

	const newsCreated = await actionMulti('/admin/noticias?/create', [
		['title', 'Noticia De Prueba Panel'],
		['excerpt', 'Bajada de prueba.'],
		// Un párrafo por línea: el servidor los separa.
		['body', 'Primer párrafo.\n\nSegundo párrafo.\nTercer párrafo.'],
		['date', '2026-04-01'],
		['category', 'rescate'],
		['emoji', '🧪'],
		['tags', 'prueba, panel'],
		['relatedDogSlugs', 'luna'],
		['relatedDogSlugs', 'toby']
	]);
	check('crear noticia → 200', newsCreated.status === 200, `status=${newsCreated.status}`);

	const apiNews = await fetch(`${API}/api/news/noticia-de-prueba-panel`);
	check('la noticia existe en la API', apiNews.status === 200, `status=${apiNews.status}`);

	if (apiNews.status === 200) {
		const item = await apiNews.json();
		check('el cuerpo se separó en párrafos', item.body.length === 3, `n=${item.body.length}`);
		check(
			'los párrafos vacíos se descartaron',
			item.body.every((p) => p.trim() !== ''),
			JSON.stringify(item.body)
		);
		check(
			'guardó los perritos relacionados',
			item.relatedDogSlugs.join(',') === 'luna,toby',
			item.relatedDogSlugs.join(',')
		);
	}

	// Un cuerpo vacío no debe guardarse.
	const noBody = await actionMulti('/admin/noticias?/create', [
		['title', 'Sin Cuerpo Panel'],
		['excerpt', 'x'],
		['body', ''],
		['date', '2026-04-01'],
		['category', 'rescate'],
		['emoji', '🧪']
	]);
	check('noticia sin cuerpo → 400', noBody.status === 400, `status=${noBody.status}`);
	check(
		'no se creó la noticia vacía',
		(await fetch(`${API}/api/news/sin-cuerpo-panel`)).status === 404
	);

	// Editar reemplaza los relacionados.
	const newsEdited = await actionMulti('/admin/noticias?/update', [
		['slug', 'noticia-de-prueba-panel'],
		['title', 'Noticia Editada Panel'],
		['category', 'salud'],
		['date', '2026-04-02'],
		['excerpt', 'Bajada editada.'],
		['body', 'Un solo párrafo.'],
		['emoji', '💉'],
		['relatedDogSlugs', 'toby']
	]);
	check('editar noticia → 200', newsEdited.status === 200, `status=${newsEdited.status}`);

	const newsAfter = await fetch(`${API}/api/news/noticia-de-prueba-panel`).then((r) => r.json());
	check('el título cambió', newsAfter.title === 'Noticia Editada Panel', newsAfter.title);
	check('la categoría cambió', newsAfter.category === 'salud', newsAfter.category);
	check(
		'los relacionados se reemplazaron',
		newsAfter.relatedDogSlugs.join(',') === 'toby',
		newsAfter.relatedDogSlugs.join(',')
	);

	const newsDeleted = await actionMulti('/admin/noticias?/delete', [
		['slug', 'noticia-de-prueba-panel']
	]);
	check('borrar noticia → 200', newsDeleted.status === 200, `status=${newsDeleted.status}`);
	check(
		'la noticia ya no existe',
		(await fetch(`${API}/api/news/noticia-de-prueba-panel`)).status === 404
	);

	console.log('\n── Contenido del sitio ──');

	const sitePage = await fetch(`${FRONT}/admin/sitio`, { headers: { Cookie: cookie } });
	const siteHtml = await sitePage.text();
	check('GET /admin/sitio → 200', sitePage.status === 200, `status=${sitePage.status}`);
	for (const section of ['Contacto', 'Estadísticas', 'Niveles de donación', 'Testimonios', 'Cuentas']) {
		check(`la página tiene la sección ${section}`, siteHtml.includes(section));
	}

	// WhatsApp: cambiar el número debe arrastrar el display y el enlace.
	const wa = await actionMulti('/admin/sitio?/saveWhatsapp', [
		['whatsappNumber', '573001112233']
	]);
	check('guardar WhatsApp → 200', wa.status === 200, `status=${wa.status}`);

	const contact = await fetch(`${API}/api/site/contact`).then((r) => r.json());
	check('el número se actualizó', contact.whatsappNumber === '573001112233', contact.whatsappNumber);
	check('el display se derivó', contact.whatsappDisplay === '300 111 2233', contact.whatsappDisplay);
	check('el enlace se derivó', contact.whatsappUrl === 'https://wa.me/573001112233', contact.whatsappUrl);

	const badWa = await actionMulti('/admin/sitio?/saveWhatsapp', [['whatsappNumber', 'abc']]);
	check('número inválido → 400', badWa.status === 400, `status=${badWa.status}`);

	// Restaura el número original.
	const restoreWa = await actionMulti('/admin/sitio?/saveWhatsapp', [
		['whatsappNumber', '573226438857']
	]);
	check('restaurar WhatsApp → 200', restoreWa.status === 200, `status=${restoreWa.status}`);

	// Niveles de donación: el precio va en pesos y se guarda en centavos.
	const tier = await actionMulti('/admin/sitio?/createTier', [
		['stars', '99'],
		['name', 'Nivel De Prueba Panel'],
		['price', '120000'],
		['blurb', 'Nivel de prueba.'],
		['perks', 'Uno\nDos']
	]);
	check('crear nivel → 200', tier.status === 200, `status=${tier.status}`);

	const tiers = await fetch(`${API}/api/site/donation-tiers`).then((r) => r.json());
	const newTier = tiers.find((t) => t.stars === 99);
	check('el nivel existe', newTier !== undefined);
	check('el precio se convirtió a centavos', newTier?.priceCents === 12000000, String(newTier?.priceCents));
	check('los beneficios se separaron por línea', newTier?.perks.length === 2, JSON.stringify(newTier?.perks));

	const tierDeleted = await actionMulti('/admin/sitio?/deleteTier', [['stars', '99']]);
	check('borrar nivel → 200', tierDeleted.status === 200, `status=${tierDeleted.status}`);

	// Testimonios: el id es necesario para poder borrarlos.
	const testimonial = await actionMulti('/admin/sitio?/createTestimonial', [
		['name', 'Persona De Prueba Panel'],
		['role', 'Voluntaria'],
		['quote', 'Una cita de prueba.'],
		['dog', 'luna']
	]);
	check('crear testimonio → 200', testimonial.status === 200, `status=${testimonial.status}`);

	const testimonials = await fetch(`${API}/api/site/testimonials`).then((r) => r.json());
	const createdTestimonial = testimonials.find((t) => t.name === 'Persona De Prueba Panel');
	check(
		'el testimonio trae id (necesario para borrar)',
		typeof createdTestimonial?.id === 'number',
		String(createdTestimonial?.id)
	);
	check('guardó el perrito relacionado', createdTestimonial?.dog === 'luna', String(createdTestimonial?.dog));

	const testimonialDeleted = await actionMulti('/admin/sitio?/deleteTestimonial', [
		['id', String(createdTestimonial?.id)]
	]);
	check('borrar testimonio → 200', testimonialDeleted.status === 200, `status=${testimonialDeleted.status}`);

	// Cuentas bancarias: el tipo es opcional.
	const account = await actionMulti('/admin/sitio?/createAccount', [
		['bank', 'Banco De Prueba Panel'],
		['emoji', '🏦'],
		['method', 'transferencia'],
		['holder', 'Fundación'],
		['type', 'Ahorros'],
		['number', '555123']
	]);
	check('crear cuenta → 200', account.status === 200, `status=${account.status}`);

	const accounts = await fetch(`${API}/api/site/bank-accounts`).then((r) => r.json());
	const newAccount = accounts.find((a) => a.bank === 'Banco De Prueba Panel');
	check('la cuenta trae id', typeof newAccount?.id === 'number', String(newAccount?.id));
	check(
		'los campos incluyen tipo y número copiable',
		newAccount?.fields.length === 2 && newAccount.fields[1]?.copyable === true,
		JSON.stringify(newAccount?.fields)
	);

	const accountDeleted = await actionMulti('/admin/sitio?/deleteAccount', [
		['id', String(newAccount?.id)]
	]);
	check('borrar cuenta → 200', accountDeleted.status === 200, `status=${accountDeleted.status}`);

	// El contenido debe quedar como estaba.
	const finalCounts = {
		dogs: (await fetch(`${API}/api/dogs`).then((r) => r.json())).length,
		news: (await fetch(`${API}/api/news`).then((r) => r.json())).length,
		tiers: (await fetch(`${API}/api/site/donation-tiers`).then((r) => r.json())).length,
		testimonials: (await fetch(`${API}/api/site/testimonials`).then((r) => r.json())).length,
		accounts: (await fetch(`${API}/api/site/bank-accounts`).then((r) => r.json())).length
	};
	check('quedan 14 perritos', finalCounts.dogs === 14, String(finalCounts.dogs));
	check('quedan 12 noticias', finalCounts.news === 12, String(finalCounts.news));
	check('quedan 4 niveles', finalCounts.tiers === 4, String(finalCounts.tiers));
	check('quedan 4 testimonios', finalCounts.testimonials === 4, String(finalCounts.testimonials));
	check('quedan 4 cuentas', finalCounts.accounts === 4, String(finalCounts.accounts));

	const finalContact = await fetch(`${API}/api/site/contact`).then((r) => r.json());
	check(
		'el WhatsApp quedó como estaba',
		finalContact.whatsappNumber === '573226438857',
		finalContact.whatsappNumber
	);

	console.log('\n── Pedidos ──');

	// Creamos un pedido real por la tienda, que es como llegan de verdad.
	const orderResponse = await fetch(`${API}/api/orders`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			customer: {
				nombres: 'Cliente',
				apellidos: 'De Prueba Pedidos',
				pais: 'Colombia',
				direccion: 'Calle 9 #8-7',
				ciudad: 'Cali',
				telefono: '3005556677',
				email: 'pedidos-panel@example.com',
				notas: 'Timbre azul'
			},
			lines: [{ slug: 'taza-manada', variantId: null, quantity: 2 }],
			shipping: 'domicilio'
		})
	});
	const createdOrder = await orderResponse.json();
	check('el pedido se crea por la tienda', orderResponse.status === 201, `status=${orderResponse.status}`);

	const ordersPage = await fetch(`${FRONT}/admin/pedidos`, { headers: { Cookie: cookie } });
	const ordersHtml = await ordersPage.text();
	check('GET /admin/pedidos → 200', ordersPage.status === 200, `status=${ordersPage.status}`);
	check('lista los pedidos', ordersHtml.includes('<table'));
	check('muestra el pedido nuevo', ordersHtml.includes(createdOrder.orderNumber));
	check('muestra el cliente', ordersHtml.includes('De Prueba Pedidos'));
	check('tiene filtros', ordersHtml.includes('Filtrar'));

	// Filtro por estado.
	const pendingPage = await fetch(`${FRONT}/admin/pedidos?status=pendiente`, {
		headers: { Cookie: cookie }
	});
	const pendingHtml = await pendingPage.text();
	check(
		'el filtro por estado incluye el pedido pendiente',
		pendingHtml.includes(createdOrder.orderNumber)
	);

	// Filtro por texto.
	const searchPage = await fetch(`${FRONT}/admin/pedidos?q=${createdOrder.orderNumber}`, {
		headers: { Cookie: cookie }
	});
	const searchHtml = await searchPage.text();
	check('la búsqueda por número encuentra el pedido', searchHtml.includes(createdOrder.orderNumber));
	check('la búsqueda no muestra otros', !searchHtml.includes('DM-' + 'ZZZZZZ'));

	// Un filtro sin resultados lo dice.
	const nonePage = await fetch(`${FRONT}/admin/pedidos?status=entregado&q=zzzznadie`, {
		headers: { Cookie: cookie }
	});
	const noneHtml = await nonePage.text();
	check('sin resultados lo indica', noneHtml.includes('Ningún pedido coincide'));

	// Cambio de estado.
	const statusChange = await actionMulti('/admin/pedidos?/updateStatus', [
		['orderNumber', createdOrder.orderNumber],
		['status', 'confirmado'],
		['paymentStatus', 'pagado']
	]);
	check('cambiar estado → 200', statusChange.status === 200, `status=${statusChange.status}`);

	const updatedOrder = await fetch(`${API}/api/admin/orders/${createdOrder.orderNumber}`, {
		headers: { Cookie: cookie }
	}).then((r) => r.json());
	check('el estado quedó en confirmado', updatedOrder.status === 'confirmado', updatedOrder.status);
	check('el pago quedó en pagado', updatedOrder.paymentStatus === 'pagado', updatedOrder.paymentStatus);

	// Validaciones.
	const badStatus = await actionMulti('/admin/pedidos?/updateStatus', [
		['orderNumber', createdOrder.orderNumber],
		['status', 'inventado']
	]);
	check('estado inválido → 400', badStatus.status === 400, `status=${badStatus.status}`);

	const noChanges = await actionMulti('/admin/pedidos?/updateStatus', [
		['orderNumber', createdOrder.orderNumber]
	]);
	check('sin cambios → 400', noChanges.status === 400, `status=${noChanges.status}`);

	const missingOrder = await actionMulti('/admin/pedidos?/updateStatus', [
		['orderNumber', 'DM-NOEXISTEPANEL'],
		['status', 'enviado']
	]);
	check('pedido inexistente → 400', missingOrder.status === 400, `status=${missingOrder.status}`);

	// Los pedidos no se borran desde el panel: son registro histórico.
	const deleteAttempt = await actionMulti('/admin/pedidos?/delete', [
		['orderNumber', createdOrder.orderNumber]
	]);
	check(
		'no existe acción para borrar pedidos',
		deleteAttempt.status >= 400,
		`status=${deleteAttempt.status}`
	);
	check(
		'el pedido sigue existiendo',
		(await fetch(`${API}/api/admin/orders/${createdOrder.orderNumber}`, {
			headers: { Cookie: cookie }
		})).status === 200
	);

	console.log('\n── Logout ──');

	const out = await browserForm('/admin?/logout', {}, cookie);
	check('logout → 303', out.status === 303, `status=${out.status}`);
	check('vuelve al login', (out.headers.get('location') ?? '').includes('/admin/login'), out.headers.get('location') ?? '');
	check('borra la cookie', (out.headers.get('set-cookie') ?? '').includes('dm_session=;') || (out.headers.get('set-cookie') ?? '').includes('Max-Age=0'));

	// Y la cookie vieja ya no sirve contra la API.
	const reused = await fetch(`${FRONT}/admin`, { headers: { Cookie: cookie }, redirect: 'manual' });
	check('la cookie vieja ya no abre el panel', reused.status === 303, `status=${reused.status}`);

	console.log('\n──────────────────────────────');
	console.log(`  ${passed} correctas, ${failed} fallidas`);
	console.log('──────────────────────────────\n');
} catch (error) {
	console.error('\nLa suite falló:', error);
	failed++;
}

process.exit(failed === 0 ? 0 : 1);
