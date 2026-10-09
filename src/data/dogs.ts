import type { Dog, DogStatus, PackView, Slug } from '../types.js';

/**
 * Manada de la fundación.
 *
 * Fotos: cuando existan, guardar en el `static` del frontend como
 * `/perros/<slug>.jpg` y cambiar `photo` a esa ruta. Mientras sea null,
 * la UI muestra un avatar con la inicial del nombre.
 */
export const dogs: Dog[] = [
	{
		slug: 'manuel',
		name: 'Testing Dog',
		breed: 'Cocker spaniel',
		ageYears: 6,
		ageLabel: '6 años',
		sex: 'macho',
		size: 'mediano',
		energy: 'tranquilo',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-memoria',
		arrival: '2019-03-14',
		traits: ['cariñoso', 'paciente', 'fiel'],
		story:
			'Manuel fue el primer rescate de la fundación y quien le dio nombre y alma. Vivió rodeado de amor, cruzó el arcoíris dejando una manada que hoy cuida a otros como él.',
		photo: null,
		featured: true
	},
	{
		slug: 'luna',
		name: 'Luna',
		breed: 'Mestiza',
		ageYears: 2,
		ageLabel: '2 años',
		sex: 'hembra',
		size: 'mediano',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2025-11-02',
		traits: ['juguetona', 'sociable', 'inteligente'],
		story:
			'Luna fue encontrada bajo la lluvia con sus cachorros, a quienes ya dimos en adopción. Ahora le toca a ella: es lista, le encanta la pelota y aprende trucos en minutos.',
		photo: null,
		featured: true
	},
	{
		slug: 'thor',
		name: 'Thor',
		breed: 'Pitbull terrier',
		ageYears: 4,
		ageLabel: '4 años',
		sex: 'macho',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: false, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2024-06-20',
		traits: ['leal', 'protector', 'bonachón'],
		story:
			'Thor es un grandulón de corazón blando que adora a los niños y los abrazos largos. Busca ser perro único para recibir —y dar— todo el amor sin repartirlo.',
		photo: null,
		featured: true
	},
	{
		slug: 'nala',
		name: 'Nala',
		breed: 'Labrador retriever',
		ageYears: 1,
		ageLabel: '1 año',
		sex: 'hembra',
		size: 'grande',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: false,
		status: 'en-adopcion',
		arrival: '2026-01-15',
		traits: ['cachorra', 'nadadora', 'obediente'],
		story:
			'Nala llegó siendo una bolita de pelo y ya está lista para su familia definitiva. Sabe sentarse, dar la pata y robarse calcetines con total impunidad.',
		photo: null,
		featured: true
	},
	{
		slug: 'canela',
		name: 'Canela',
		breed: 'Chihuahua',
		ageYears: 7,
		ageLabel: '7 años',
		sex: 'hembra',
		size: 'pequeño',
		energy: 'tranquilo',
		goodWith: { kids: false, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2023-09-08',
		traits: ['faldera', 'silenciosa', 'dulce'],
		story:
			'Canela es una señora en todo el sentido: tranquila, limpia y experta en siestas compartidas. Ideal para un hogar calmado o una persona mayor.',
		photo: null
	},
	{
		slug: 'rocky',
		name: 'Rocky',
		breed: 'Bóxer',
		ageYears: 3,
		ageLabel: '3 años',
		sex: 'macho',
		size: 'grande',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'hogar-temporal',
		arrival: '2025-04-11',
		traits: ['payaso', 'atlético', 'noble'],
		story:
			'Rocky está en hogar temporal recuperándose de una cirugía de cadera. Ya corre como nuevo y cada día muestra más de su personalidad de payaso profesional.',
		photo: null
	},
	{
		slug: 'kira',
		name: 'Kira',
		breed: 'Pastor alemán',
		ageYears: 5,
		ageLabel: '5 años',
		sex: 'hembra',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2024-02-27',
		traits: ['lista', 'guardiana', 'equilibrada'],
		story:
			'Kira fue perra de vigilancia y hoy solo quiere vigilar la puerta de su casa. Obediente y equilibrada, perfecta para familia con experiencia.',
		photo: null
	},
	{
		slug: 'toby',
		name: 'Toby',
		breed: 'Beagle',
		ageYears: 2,
		ageLabel: '2 años',
		sex: 'macho',
		size: 'mediano',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'adoptado',
		arrival: '2022-08-19',
		traits: ['rastreador', 'alegre', 'glotón'],
		story:
			'Toby se adoptó en 2023 y hoy vive con la familia Hernández, dos niños y un gato resignado. Su olfato legendario lo llevó directo al sillón más cómodo de la casa.',
		photo: null
	},
	{
		slug: 'frida',
		name: 'Frida',
		breed: 'Xoloitzcuintle',
		ageYears: 4,
		ageLabel: '4 años',
		sex: 'hembra',
		size: 'mediano',
		energy: 'tranquilo',
		goodWith: { kids: true, dogs: false, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'adoptado',
		arrival: '2021-05-30',
		traits: ['elegante', 'hipoalergénica', 'serena'],
		story:
			'Frida encontró hogar con una familia con alergias: al no tener pelo fue la compañera perfecta. Hoy es la reina sin corona de su casa.',
		photo: null
	},
	{
		slug: 'bruno',
		name: 'Bruno',
		breed: 'Schnauzer miniatura',
		ageYears: 8,
		ageLabel: '8 años',
		sex: 'macho',
		size: 'pequeño',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'hogar-temporal',
		arrival: '2025-08-05',
		traits: ['bigotón', 'platicador', 'tierno'],
		story:
			'Bruno quedó huérfano cuando su humana falleció. Está en hogar temporal mientras encuentra a alguien que valore sus bigotes y sus conversaciones mañaneras.',
		photo: null
	},
	{
		slug: 'lola',
		name: 'Lola',
		breed: 'French poodle',
		ageYears: 3,
		ageLabel: '3 años',
		sex: 'hembra',
		size: 'pequeño',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: false,
		sterilized: false,
		status: 'en-adopcion',
		arrival: '2026-02-10',
		traits: ['peluche', 'lista', 'coqueta'],
		story:
			'Lola es una nube con patas que está terminando su protocolo de salud. En cuanto tenga sus vacunas al día estará lista para derretir a su familia.',
		photo: null
	},
	{
		slug: 'max',
		name: 'Max',
		breed: 'Golden retriever',
		ageYears: 6,
		ageLabel: '6 años',
		sex: 'macho',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'adoptado',
		arrival: '2020-12-01',
		traits: ['terapeuta', 'paciente', 'sonriente'],
		story:
			'Max se certificó como perro de terapia y visita hospitales con su adoptante, una enfermera. Del abandono a sanar corazones: su historia favorita para contar.',
		photo: null
	},
	{
		slug: 'chiquis',
		name: 'Chiquis',
		breed: 'Mestiza',
		ageYears: 1,
		ageLabel: '10 meses',
		sex: 'hembra',
		size: 'pequeño',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2026-03-22',
		traits: ['cachorra', 'curiosa', 'dormilona'],
		story:
			'Chiquis cabe en una caja de zapatos y en cualquier corazón. Es la bebé de la manada y busca una familia que le enseñe el mundo con paciencia.',
		photo: null
	},
	{
		slug: 'duque',
		name: 'Duque',
		breed: 'Gran danés',
		ageYears: 5,
		ageLabel: '5 años',
		sex: 'macho',
		size: 'grande',
		energy: 'tranquilo',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-memoria',
		arrival: '2018-07-07',
		traits: ['gigante', 'gentil', 'bonachón'],
		story:
			'Duque era un gigante que creía ser faldero. Vivió 5 años de puro amor con nosotros y nos enseñó que el tamaño del cuerpo nunca iguala el del corazón.',
		photo: null
	}
];

/**
 * Selección curada y ordenada de la manada viva que se muestra en /manada.
 *
 * Es una decisión editorial, no un filtro: no todos los perritos vivos
 * aparecen aquí, y el orden importa. La usan /manada y /dona-estrellas para
 * que las dos páginas muestren a los mismos perritos, en el mismo orden.
 *
 * La manada en el cielo NO se lista aquí: se deriva de `status === 'en-memoria'`
 * para que sea imposible que la lista y el estado se contradigan.
 */
export const alivePackSlugs: Slug[] = ['toby', 'luna', 'thor', 'chiquis'];

export function getDog(slug: Slug): Dog | undefined {
	return dogs.find((dog) => dog.slug === slug);
}

export function featuredDogs(): Dog[] {
	return dogs.filter((dog) => dog.featured);
}

export function dogsByStatus(status: DogStatus): Dog[] {
	return dogs.filter((dog) => dog.status === status);
}

/** Resuelve slugs a perritos, descartando los que no existan. */
export function packFromSlugs(slugs: readonly Slug[]): Dog[] {
	return slugs.map((slug) => getDog(slug)).filter((dog): dog is Dog => dog !== undefined);
}

/** La manada viva: la selección curada de arriba, en su orden. */
export function alivePack(): Dog[] {
	return packFromSlugs(alivePackSlugs);
}

/**
 * La manada en el cielo.
 *
 * Se deriva de `status`, que es la única fuente de verdad: un perrito marcado
 * como `en-memoria` aparece aquí siempre, sin que haya que tocar otra lista.
 */
export function heavenPack(): Dog[] {
	return dogsByStatus('en-memoria');
}

/** La manada resuelta de una vista. */
export function pack(view: PackView): Dog[] {
	return view === 'heaven' ? heavenPack() : alivePack();
}
