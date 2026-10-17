import type { DogAccessory, DogHealth, DogVaccine } from '../types.js';

/**
 * Salud de ejemplo para el seed: baños, vacunas y accesorios.
 *
 * La web pública los lee desde la base (`src/repositories/dog-health.ts`), no
 * desde aquí: este módulo es solo el contenido inicial. Al sembrar se descartan
 * las filas cuyo perrito no exista, así que un slug retirado no rompe la clave
 * foránea.
 */
export const dogHealth: DogHealth[] = [
	{
		dogSlug: 'luna',
		lastBath: '2026-09-20',
		nextBath: '2026-10-20',
		vetVisitDone: true,
		vetVisitDate: '2026-08-15'
	},
	{
		dogSlug: 'thor',
		lastBath: '2026-10-01',
		nextBath: '2026-10-29',
		vetVisitDone: false,
		vetVisitDate: '2026-10-24'
	},
	{
		dogSlug: 'kira',
		lastBath: '2026-09-12',
		nextBath: '2026-11-12',
		vetVisitDone: true,
		vetVisitDate: '2026-09-30'
	},
	{
		dogSlug: 'nala',
		lastBath: '2026-09-28',
		nextBath: '2026-10-26',
		vetVisitDone: false,
		vetVisitDate: null
	},
	{
		dogSlug: 'canela',
		lastBath: '2026-09-05',
		nextBath: '2026-11-05',
		vetVisitDone: true,
		vetVisitDate: '2026-10-08'
	},
	{
		dogSlug: 'rocky',
		lastBath: '2026-09-18',
		nextBath: '2026-10-18',
		vetVisitDone: true,
		vetVisitDate: '2026-07-22'
	},
	{
		dogSlug: 'bruno',
		lastBath: '2026-09-30',
		nextBath: null,
		vetVisitDone: false,
		vetVisitDate: null
	},
	{
		dogSlug: 'lola',
		lastBath: '2026-09-22',
		nextBath: '2026-10-22',
		vetVisitDone: false,
		vetVisitDate: '2026-10-30'
	}
];

export const dogVaccines: Omit<DogVaccine, 'id'>[] = [
	{
		dogSlug: 'luna',
		name: 'Rabia',
		applied: true,
		appliedDate: '2026-03-12',
		recommendation: 'Obligatoria por ley. Refuerzo cada año.'
	},
	{
		dogSlug: 'luna',
		name: 'Polivalente',
		applied: false,
		appliedDate: null,
		recommendation: 'Falta el refuerzo anual; agendar en octubre.'
	},
	{
		dogSlug: 'thor',
		name: 'Rabia',
		applied: true,
		appliedDate: '2026-02-20',
		recommendation: 'Obligatoria por ley. Refuerzo cada año.'
	},
	{
		dogSlug: 'thor',
		name: 'Bordetella',
		applied: false,
		appliedDate: null,
		recommendation: 'Recomendada antes de entrar a guardería o eventos.'
	},
	{
		dogSlug: 'kira',
		name: 'Polivalente',
		applied: true,
		appliedDate: '2026-01-18',
		recommendation: 'Cubre parvovirus, moquillo y hepatitis. Refuerzo anual.'
	},
	{
		dogSlug: 'kira',
		name: 'Rabia',
		applied: false,
		appliedDate: null,
		recommendation: 'Pendiente; se aplica en la próxima visita.'
	},
	{
		dogSlug: 'nala',
		name: 'Polivalente',
		applied: false,
		appliedDate: null,
		recommendation: 'Falta la primera serie antes de la esterilización.'
	},
	{
		dogSlug: 'canela',
		name: 'Rabia',
		applied: true,
		appliedDate: '2026-04-02',
		recommendation: 'Refuerzo anual; ya cumplió.'
	},
	{
		dogSlug: 'canela',
		name: 'Leptospira',
		applied: false,
		appliedDate: null,
		recommendation: 'Recomendada en zonas húmedas. Refuerzo anual.'
	}
];

export const dogAccessories: Omit<DogAccessory, 'id'>[] = [
	{
		dogSlug: 'luna',
		label: 'Collar',
		value: 'Talla M, color rojo',
		provided: true
	},
	{
		dogSlug: 'luna',
		label: 'Arnés',
		value: null,
		provided: true
	},
	{
		dogSlug: 'luna',
		label: 'Placa de identificación',
		value: null,
		provided: false
	},
	{
		dogSlug: 'thor',
		label: 'Collar',
		value: 'Talla L',
		provided: true
	},
	{
		dogSlug: 'thor',
		label: 'Microchip',
		value: null,
		provided: false
	},
	{
		dogSlug: 'rocky',
		label: 'Arnés',
		value: 'Con refuerzo acolchado por la artrosis',
		provided: true
	},
	{
		dogSlug: 'rocky',
		label: 'Cama ortopédica',
		value: null,
		provided: true
	},
	{
		dogSlug: 'bruno',
		label: 'Correa',
		value: null,
		provided: true
	},
	{
		dogSlug: 'bruno',
		label: 'Placa de identificación',
		value: null,
		provided: false
	}
];
