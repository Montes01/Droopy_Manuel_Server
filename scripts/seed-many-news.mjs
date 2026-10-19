/**
 * Inserta ~60 noticias de prueba en la base LOCAL, para probar el scroll
 * infinito del feed de /noticias.
 *
 *   node --env-file=.env scripts/seed-many-news.mjs
 *
 * Es idempotente: borra primero las noticias de demo (slug que empiezan con
 * "demo-") y luego las vuelve a insertar. No toca las noticias reales.
 *
 * OJO: es solo para desarrollo. No lo ejecutes contra producción.
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

const CATEGORIES = ['rescate', 'adopcion', 'salud', 'evento', 'tienda', 'proyecto', 'ayudas'];

const EMOJI = {
	rescate: '🚑',
	adopcion: '🏠',
	salud: '💉',
	evento: '🎉',
	tienda: '🛍️',
	proyecto: '⭐',
	ayudas: '🤝'
};

const NAMES = [
	'Luna', 'Toby', 'Canela', 'Chiquis', 'Lola', 'Rocky', 'Nube', 'Milo', 'Kira', 'Simba',
	'Pepa', 'Duque', 'Manchas', 'Chocolate', 'Frida', 'Bruno', 'Maya', 'Trufa', 'Coco', 'Nala'
];

const PLACES = [
	'el centro', 'la loma', 'el barrio', 'la vereda', 'el parque', 'la quebrada',
	'el mercado', 'la estación', 'el puente', 'la plaza'
];

const TITLES = {
	rescate: [
		(_, n, p) => `Rescatamos a ${n} cerca de ${p}`,
		(_, n, p) => `${n} apareció en ${p} y ya está a salvo`,
		(_, n) => `Un nuevo rescate: ${n} y su segunda oportunidad`
	],
	adopcion: [
		(_, n) => `${n} encontró su hogar`,
		(_, n) => `Final feliz: la familia de ${n}`,
		(_, n) => `${n} ya tiene quien le ronronee`
	],
	salud: [
		() => 'Jornada de vacunación para la manada',
		(_, n) => `${n} pasó su chequeo sin dramas`,
		() => 'Desparasitación y pesaje de la semana'
	],
	evento: [
		(_, _n, p) => `Feria de adopción en ${p}`,
		() => 'Bazar solidario: gracias a quienes vinieron',
		() => 'Caminata con la manada'
	],
	tienda: [
		() => 'Nuevos productos en la tienda solidaria',
		() => 'Camisetas de la manada, otra vez disponibles',
		() => 'Cada compra se vuelve comida'
	],
	proyecto: [
		() => 'Avances del nuevo refugio',
		() => 'El proyecto de esterilización sigue creciendo',
		() => 'Meta de recaudación: techo para el patio'
	],
	ayudas: [
		(_, n) => `Gracias a tu ayuda, ${n} está mejor`,
		() => 'Tu donación llegó a la manada',
		() => 'Resumen de lo que logramos con las ayudas'
	]
};

const TAG_POOL = [
	'manada', 'rescate', 'adopción', 'vacunas', 'evento', 'tienda',
	'proyecto', 'ayuda', 'final feliz', 'seguimiento', 'voluntarios'
];

function pick(list, i) {
	return list[i % list.length];
}

function makeDate(i) {
	// Una noticia cada 3 días, hacia atrás desde hoy (2026-10-18).
	const base = new Date(Date.UTC(2026, 9, 18));
	base.setUTCDate(base.getUTCDate() - i * 3);
	return base.toISOString().slice(0, 10);
}

function makeNews(i) {
	const category = pick(CATEGORIES, i);
	const name = pick(NAMES, i + 3);
	const place = pick(PLACES, i + 5);
	const titleFn = pick(TITLES[category], i);
	const title = titleFn(i, name, place);

	const tags = [pick(TAG_POOL, i), pick(TAG_POOL, i + 4)];

	return {
		slug: `demo-${category}-${String(i + 1).padStart(2, '0')}`,
		title,
		excerpt: `${title} — una de las tantas historias que vive la manada día a día. Noticia de prueba para el feed.`,
		body: [
			`${title}. Esto es contenido de ejemplo generado para probar el scroll infinito del feed.`,
			'Párrafo de relleno con más texto para que la tarjeta tenga cuerpo suficiente y se vea realista en la lista.',
			'Otro párrafo para dar volumen a la noticia y comprobar cómo se comporta la tarjeta con contenido largo.'
		],
		date: makeDate(i),
		category,
		tags,
		photo: null,
		emoji: EMOJI[category],
		featured: i % 11 === 0
	};
}

async function main() {
	const deleted = await sql`delete from news where slug like 'demo-%'`;
	console.log(`Borradas ${deleted.count} noticias de demo previas.`);

	const rows = Array.from({ length: 60 }, (_, i) => makeNews(i));

	await sql`insert into news ${sql(rows)}`;

	const [{ n }] = await sql`select count(*)::int as n from news`;
	console.log(`Insertadas ${rows.length} noticias de demo. Total en news: ${n}.`);
}

try {
	await main();
} catch (error) {
	console.error('Falló el seed de noticias de demo:', error);
	process.exitCode = 1;
} finally {
	await sql.end();
}
