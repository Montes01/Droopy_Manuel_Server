import type { NewsCategory, NewsItem, NewsPage } from '../types.js';

/**
 * Noticias de la fundación.
 * Fotos: cuando existan, guardar en el `static` del frontend como
 * `/noticias/<slug>.jpg` y cambiar `photo` a esa ruta.
 */

/** Etiqueta visible de cada categoría. */
export const newsCategories: { slug: NewsCategory; label: string; emoji: string }[] = [
	{ slug: 'rescate', label: 'Rescate', emoji: '🚑' },
	{ slug: 'adopcion', label: 'Adopción', emoji: '🏠' },
	{ slug: 'salud', label: 'Salud', emoji: '💉' },
	{ slug: 'evento', label: 'Evento', emoji: '🎉' },
	{ slug: 'tienda', label: 'Tienda', emoji: '🛍️' },
	{ slug: 'proyecto', label: 'Proyecto', emoji: '⭐' },
	{ slug: 'ayudas', label: 'Ayudas', emoji: '🤝' }
];

export const news: NewsItem[] = [
	{
		slug: 'jornada-de-vacunacion',
		title: 'Jornada de vacunación: 14 colitas al día',
		excerpt:
			'El sábado vacunamos y desparasitamos a 14 perritos de la manada. Gracias al veterinario que vino sin cobrar.',
		body: [
			'El sábado fue uno de esos días que se recuerdan. Desde las siete de la mañana el patio se llenó de correas, colas moviéndose y un poco de nervios: tocaba jornada de vacunación.',
			'La doctora Marcela llegó con su maletín y su paciencia infinita. Empezamos por los mayores, que ya conocen el ritual, y terminamos con Chiquis, que no entendía por qué todo el mundo la miraba.',
			'En total fueron 14 vacunas y 14 desparasitaciones. También pesamos a cada perrito y anotamos su cartilla al día. Varios quedaron listos para buscar hogar.'
		],
		date: '2026-09-28',
		category: 'salud',
		tags: ['vacunas', 'manada', 'veterinaria'],
		photo: null,
		emoji: '💉',
		relatedDogSlugs: ['chiquis', 'canela', 'lola'],
		featured: true
	},
	{
		slug: 'toby-cumple-tres-anos-de-adopcion',
		title: 'Toby cumple tres años con su familia',
		excerpt:
			'La familia Hernández nos mandó fotos: Toby duerme en el sofá, vigila la cocina y ya es el favorito del gato.',
		body: [
			'Hace tres años Toby salió de aquí con una correa nueva y una familia que lo esperaba. Hoy nos llegaron fotos y no pudimos no compartirlas.',
			'Vive con los Hernández, dos niños y un gato que al principio lo miraba de lejos. Ahora duermen en la misma silla.',
			'Su olfato sigue siendo legendario: encuentra cualquier miga que caiga al piso y las sobras que nadie confiesa.'
		],
		date: '2026-09-14',
		category: 'adopcion',
		tags: ['final feliz', 'seguimiento'],
		photo: null,
		emoji: '🏠',
		relatedDogSlugs: ['toby'],
		featured: true
	},
	{
		slug: 'luna-encontro-hogar',
		title: 'Luna encontró hogar',
		excerpt:
			'La perrita rescatada bajo la lluvia ya tiene familia definitiva. Nos la devolvió el karma: adoptaron a su última cachorra.',
		body: [
			'Luna llegó un noviembre lluvioso con tres cachorros debajo del cuerpo. Los tres se adoptaron y ella se quedó esperando.',
			'El mes pasado una familia llegó buscando "una perra juguetona, que ame la pelota". Luna no necesitó más: se sentó frente a ellos y no se movió.',
			'Ya está en su casa. Nos mandaron un video en el que corre por un patio grande y duerme en una cama que es toda suya.'
		],
		date: '2026-08-30',
		category: 'adopcion',
		tags: ['final feliz', 'luna'],
		photo: null,
		emoji: '🎾',
		relatedDogSlugs: ['luna']
	},
	{
		slug: 'rescate-de-tres-hermanitos',
		title: 'Rescatamos a tres hermanitos en la vía',
		excerpt:
			'Los encontramos junto a un caño. Están con nuestra familia temporal y ya empiezan a confiar en las manos.',
		body: [
			'Un vecino nos escribió por WhatsApp: tres perritos pequeños llevaban dos días cerca del caño. Llegamos con cobijas y comida.',
			'Estaban asustados, pero no heridos. Los revisó el veterinario y están estables: deshidratados y con pulgas, nada grave.',
			'Ahora están en hogar temporal con Marcela, nuestra aliada de siempre. Poco a poco levantan la cabeza cuando alguien entra al cuarto.',
			'En unas semanas buscarán familia. Mientras tanto, necesitamos cobijas y alimento de cachorro.'
		],
		date: '2026-08-12',
		category: 'rescate',
		tags: ['rescate', 'cachorros', 'urgente'],
		photo: null,
		emoji: '🚑',
		relatedDogSlugs: []
	},
	{
		slug: 'feria-solidaria-del-barrio',
		title: 'Nuestra primera feria solidaria del barrio',
		excerpt:
			'Vendimos arepas, tazas y llaveros. La gente del barrio respondió mejor de lo que esperábamos.',
		body: [
			'El domingo armamos una carpa en la esquina de siempre. Llevamos tazas, llaveros, camisetas y una olla enorme de chocolate.',
			'Los vecinos llegaron con sus perros y sus preguntas. Varias personas se anotaron para ser hogar temporal.',
			'Recaudamos suficiente para cubrir dos meses de alimento concentrado. La próxima feria ya tiene fecha.'
		],
		date: '2026-07-27',
		category: 'evento',
		tags: ['feria', 'comunidad', 'recaudación'],
		photo: '/cards/tienda-solidaria.jpg',
		emoji: '🎉',
		relatedDogSlugs: []
	},
	{
		slug: 'rocky-se-recupera-de-cadera',
		title: 'Rocky se recupera de su cirugía de cadera',
		excerpt:
			'El bóxer que llegó cojeando ya corre en el parque. La recuperación fue larga, pero su hogar temporal se la jugó.',
		body: [
			'Rocky llegó hace un año sin poder apoyar la pata derecha. La radiografía mostraba una cadera que necesitaba cirugía.',
			'Con ayuda de las donaciones cubrimos la operación y cuatro meses de fisioterapia. Su familia temporal lo llevó a cada sesión.',
			'Hoy corre, salta y volvió a ser el payaso que era. Sigue buscando hogar definitivo: ahora sí está listo para una familia.'
		],
		date: '2026-07-05',
		category: 'salud',
		tags: ['cirugía', 'recuperación', 'rocky'],
		photo: null,
		emoji: '🦴',
		relatedDogSlugs: ['rocky']
	},
	{
		slug: 'nuevo-alimento-en-la-tienda',
		title: 'Llega alimento a la tienda solidaria',
		excerpt:
			'Croquetas y snacks nuevos con precios pensados para que la manada coma mejor. Cada compra deja un plato lleno.',
		body: [
			'Abrimos la categoría de alimento con marcas que probamos en casa. La idea es simple: lo que compres aquí alimenta a tu perro y a la manada.',
			'Cada producto permite donar una porción al comedero comunitario. En la primera semana vendimos 30 bolsas.',
			'Si tienes una marca que quieras recomendar, escríbenos por WhatsApp. Escuchamos.'
		],
		date: '2026-06-18',
		category: 'tienda',
		tags: ['tienda', 'alimento', 'donación'],
		photo: '/cards/tienda-solidaria.jpg',
		emoji: '🍖',
		relatedDogSlugs: []
	},
	{
		slug: 'manuel-y-duque-en-el-recuerdo',
		title: 'Manuel y Duque, siempre en el recuerdo',
		excerpt:
			'Dos gigantes de corazón suave que se fueron dejando una manada entera cuidando a otros como ellos.',
		body: [
			'Manuel fue el primer rescate y quien le dio nombre y alma a esta historia. Duque llegó después, un gigante que creía ser faldero.',
			'Los dos se fueron con la casa llena: rodeados de cobijas, de voces conocidas y de otros perritos que aprendieron de ellos a confiar.',
			'Sus historias son las que contamos primero cuando alguien pregunta por qué hacemos esto. Por ellos seguimos rescatando.'
		],
		date: '2026-05-22',
		category: 'rescate',
		tags: ['memoria', 'manada'],
		photo: '/droopy/soy-droopy.jpg',
		emoji: '🌈',
		relatedDogSlugs: ['manuel', 'duque']
	},
	{
		slug: 'kira-ya-tiene-hogar',
		title: 'Kira ya tiene hogar',
		excerpt:
			'La pastora alemana que fue perra de vigilancia ahora vigila una puerta que es suya, con una familia que la eligió.',
		body: [
			'Kira llegó con un pasado de trabajo que nunca le preguntamos. Sabía obedecer, pero no sabía jugar.',
			'Una familia con experiencia en pastores la conoció y decidió darle el tiempo que necesitaba. Hoy tiene su cama, su patio y dos niños que la adoran.',
			'Su adoptante nos escribe cada tanto: "solo quiere vigilar la puerta de la casa". Nos parece un final perfecto.'
		],
		date: '2026-04-30',
		category: 'adopcion',
		tags: ['final feliz', 'kira'],
		photo: null,
		emoji: '🏡',
		relatedDogSlugs: ['kira']
	},
	{
		slug: 'canela-busca-un-hogar-calmado',
		title: 'Canela busca un hogar calmado',
		excerpt:
			'Es una señora chihuahua de siete años: tranquila, limpia y experta en siestas compartidas. Busca un sofá y una mano.',
		body: [
			'Canela es de las que no dan problemas. Come, duerme y agradece con la mirada.',
			'Por su edad y tamaño preferimos un hogar sin niños pequeños: es delicada y necesita su espacio.',
			'Ideal para una persona mayor o alguien que trabaje desde casa. Ella solo pide una cobija y compañía.'
		],
		date: '2026-04-08',
		category: 'adopcion',
		tags: ['adopción', 'adultos mayores', 'canela'],
		photo: null,
		emoji: '☕',
		relatedDogSlugs: ['canela']
	},
	{
		slug: 'jornada-de-esterilizacion',
		title: 'Jornada de esterilización gratuita',
		excerpt:
			'Atendimos a 22 perros y gatos del sector. Esterilizar es la forma más directa de frenar el abandono.',
		body: [
			'Trabajamos con la veterinaria del barrio para abrir una jornada gratuita de esterilización.',
			'Llegaron 22 animales, entre perros y gatos. Cada uno se fue con su collarín y su instrucción de cuidado.',
			'Es la actividad que más impacto tiene y la que menos se ve. Si quieres sumar a la próxima, escríbenos.'
		],
		date: '2026-03-15',
		category: 'salud',
		tags: ['esterilización', 'jornada', 'comunidad'],
		photo: null,
		emoji: '✂️',
		relatedDogSlugs: []
	},
	{
		slug: 'bruno-necesita-hogar-temporal',
		title: 'Bruno necesita hogar temporal',
		excerpt:
			'Quedó huérfano cuando su humana falleció. Es un schnauzer mayor, tranquilo y muy conversador. Buscamos quien lo cuide un tiempo.',
		body: [
			'Bruno pasó ocho años con la misma persona. Cuando ella falleció, nadie de la familia pudo quedarse con él.',
			'Es un perro mayor, ya entrenado y muy tranquilo. Su único requisito es no quedarse solo todo el día.',
			'Buscamos un hogar temporal o definitivo. Mientras tanto está con nosotros, pero necesita un hogar de verdad.'
		],
		date: '2026-02-20',
		category: 'rescate',
		tags: ['hogar temporal', 'mayor', 'bruno'],
		photo: null,
		emoji: '🎩',
		relatedDogSlugs: ['bruno']
	}
];

/** Feed completo, más reciente primero. */
export function sortedNews(): NewsItem[] {
	return [...news].sort((a, b) => b.date.localeCompare(a.date));
}

export function getNewsItem(slug: string): NewsItem | undefined {
	return news.find((item) => item.slug === slug);
}

export function newsByCategory(category: NewsCategory): NewsItem[] {
	return sortedNews().filter((item) => item.category === category);
}

/**
 * Página del feed para el scroll infinito.
 *
 * `offset` es cuántos elementos ya se mostraron. Devuelve el trozo pedido y
 * `hasMore` para que la UI sepa si conviene seguir observando el centinela.
 */
export function newsPage(offset = 0, limit = 6): NewsPage {
	const all = sortedNews();
	const items = all.slice(offset, offset + limit);
	return { items, hasMore: offset + items.length < all.length };
}
