import type { Dog, DogStatus, PackView, Slug } from '../types.js';

/** Filtra la manada para obtener solo perritos en adopción (vivos). */
export function alivePack(): Dog[] {
	return dogs.filter((dog: Dog) => dog.status !== 'en-memoria');
}

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
		birthDate: '2018-03-14', // 6 años atrás ~ 2018
		isApprox: true,
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
		birthDate: '2023-11-02', // 2 años atrás ~ 2023
		isApprox: true,
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
		birthDate: '2021-01-01', // 4 años atrás ~ 2021
		isApprox: true,
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
		birthDate: '2024-01-01', // 1 año atrás ~ 2024
		isApprox: true,
		sex: 'hembra',
		size: 'grande',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2025-05-10',
		traits: ['juguetona', 'fiel', 'perezosa'],
		story:
			'Nala es una perrita muy sociable y dulce que adora jugar en la playa. Le encanta perseguir pelotas y dormir al sol. Es buena con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'canela',
		name: 'Canela',
		breed: 'Beagle',
		birthDate: '2018-01-01', // 7 años atrás ~ 2018
		isApprox: true,
		sex: 'hembra',
		size: 'pequeño',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2019-09-15',
		traits: ['amorosa', 'juguetona', 'curiosa'],
		story:
			'Canela es una perrita muy activa y juguetona que siempre está lista para una aventura. Le encanta olfatear y explorar nuevos lugares. Es buena con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'rocky',
		name: 'Rocky',
		breed: 'Cocker spaniel',
		birthDate: '2022-04-01', // 3 años atrás ~ 2022
		isApprox: true,
		sex: 'macho',
		size: 'mediano',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2023-02-14',
		traits: ['enérgico', 'juguetón', 'valiente'],
		story:
			'Rocky fue rescatado de la calle después de vivir solo durante mucho tiempo. Es muy enérgico y juguetón, y le encanta correr por los campos. Le gusta la compañía de otros perros pero puede ser dominante con machos desconocidos.',
		photo: null,
		featured: true
	},
	{
		slug: 'kira',
		name: 'Kira',
		breed: 'Border collie',
		birthDate: '2020-05-01', // 5 años atrás ~ 2020
		isApprox: true,
		sex: 'hembra',
		size: 'mediano',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2021-08-20',
		traits: ['inteligente', 'ágil', 'trabajador'],
		story:
			'Kira es una perrita muy inteligente y trabajadora que destaca en agility y obediencia. Le gustan los desafíos mentales y los juegos de búsqueda. Es buena con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'toby',
		name: 'Toby',
		breed: 'French bulldog',
		birthDate: '2024-06-01', // 2 años atrás ~ 2024
		isApprox: true,
		sex: 'macho',
		size: 'pequeño',
		energy: 'tranquilo',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2025-01-15',
		traits: ['juguetón', 'simpático', 'inquieto'],
		story:
			'Toby es un perrito muy simpático y familiar que aporta mucho alegría al hogar. Le encantan los mimos y los paseos cortos. Es bueno con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'frida',
		name: 'Frida',
		breed: 'Pastor alemán',
		birthDate: '2021-07-01', // 4 años atrás ~ 2021
		isApprox: true,
		sex: 'hembra',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2023-03-10',
		traits: ['leal', 'protector', 'inteligente'],
		story:
			'Frida es una perrita muy leal y protectora que destaca como perro de guardia y acompañante. Es inteligente y responde bien a los entrenamientos. Es buena con niños cuando está socializada.',
		photo: null,
		featured: true
	},
	{
		slug: 'bruno',
		name: 'Bruno',
		breed: 'Doberman',
		birthDate: '2018-05-01', // 8 años atrás ~ 2018
		isApprox: true,
		sex: 'macho',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2019-11-25',
		traits: ['dominante', 'seguro', 'inteligente'],
		story:
			'Bruno es un perro muy dominante y seguro de sí mismo. Le gusta tener el control y es muy inteligente. Requiere dueños experimentados que sepan establecer límites claros.',
		photo: null,
		featured: true
	},
	{
		slug: 'lola',
		name: 'Lola',
		breed: 'Mestiza',
		birthDate: '2022-10-01', // 3 años atrás ~ 2022
		isApprox: true,
		sex: 'hembra',
		size: 'mediano',
		energy: 'juguetón',
		goodWith: { kids: true, dogs: true, cats: true },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2024-01-20',
		traits: ['juguetona', 'amistosa', 'sociable'],
		story:
			'Lola es una perrita muy amistosa y sociable que siempre está dispuesta a hacer nuevos amigos. Le encantan los paseos y los juegos en el parque. Es buena con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'max',
		name: 'Max',
		breed: 'Golden retriever',
		birthDate: '2019-01-01', // 6 años atrás ~ 2019
		isApprox: true,
		sex: 'macho',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2020-07-10',
		traits: ['juguetón', 'fiel', 'dulce'],
		story:
			'Max es un Golden retriever muy dulce y fiel que siempre está feliz de ver a su familia. Le encantan los juguetes y los juegos de búsqueda. Es bueno con niños y otros perros.',
		photo: null,
		featured: true
	},
	{
		slug: 'duque',
		name: 'Duque',
		breed: 'Doberman',
		birthDate: '2020-03-01', // 5 años atrás ~ 2020
		isApprox: true,
		sex: 'macho',
		size: 'grande',
		energy: 'moderado',
		goodWith: { kids: true, dogs: true, cats: false },
		vaccinated: true,
		sterilized: true,
		status: 'en-adopcion',
		arrival: '2022-05-15',
		traits: ['noble', 'protector', 'equilibrado'],
		story:
			'Duque es un perro noble y equilibrado, con gran inteligencia y capacidad de aprendizaje. Es un excelente compañero y perro de trabajo. Le gusta la rutina y las actividades estructuradas.',
		photo: null,
		featured: true
	}
];