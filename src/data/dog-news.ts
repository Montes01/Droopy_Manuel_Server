import type { DogNews } from '../types.js';

/**
 * Comunicados de ejemplo para el seed.
 *
 * La web pública los lee desde la base (`src/repositories/dog-news.ts`), no
 * desde aquí: este módulo es solo el contenido inicial. Al sembrar se
 * descartan los comunicados cuyo perrito no exista, así que un slug retirado
 * no rompe la clave foránea.
 */
export const dogNews: Omit<DogNews, 'id'>[] = [
	{
		dogSlug: 'luna',
		kind: 'examen',
		title: 'Exámenes pendientes',
		body: 'Luna tiene control veterinario y exámenes de sangre esta semana. Ya está agendada: les contamos los resultados apenas lleguen.',
		date: '2026-10-10',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'luna',
		kind: 'general',
		title: 'Aprendió un truco nuevo',
		body: 'En la jornada de adopción de la semana pasada, Luna se ganó a todos: ya sabe dar la pata y sentarse a la orden.',
		date: '2026-09-27',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'thor',
		kind: 'tratamiento',
		title: 'Tratamiento en curso',
		body: 'Thor está en tratamiento por una infección en la piel. Necesita medicación diaria por quince días más. Cualquier ayuda con los medicamentos se agradece.',
		date: '2026-10-12',
		endDate: '2026-10-27',
		photo: null,
		urgent: true
	},
	{
		dogSlug: 'thor',
		kind: 'examen',
		title: 'Control de la piel',
		body: 'La primera revisión de Thor salió bien: la infección está bajando. Volvemos al veterinario en diez días.',
		date: '2026-10-05',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'kira',
		kind: 'recuperacion',
		title: 'Recuperación después de la cirugía',
		body: 'Kira salió bien de su cirugía y está en reposo. En unos días retomamos los paseos cortos.',
		date: '2026-09-28',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'nala',
		kind: 'cirugia',
		title: 'Cirugía programada',
		body: 'A Nala le programaron la esterilización para el próximo martes. Necesitamos apoyo para cubrir la cirugía y el posoperatorio.',
		date: '2026-10-14',
		photo: null,
		urgent: true
	},
	{
		dogSlug: 'canela',
		kind: 'examen',
		title: 'Chequeo dental',
		body: 'Canela tiene un chequeo dental agendado. Es mayor y queremos revisar bien sus dientes antes de cualquier adopción.',
		date: '2026-10-08',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'rocky',
		kind: 'tratamiento',
		title: 'Tratamiento para la artrosis',
		body: 'Rocky empezó un tratamiento para la artrosis en sus patas traseras. Con condroprotectores y paseos suaves va mucho mejor.',
		date: '2026-10-02',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'bruno',
		kind: 'general',
		title: 'Adaptado al hogar temporal',
		body: 'Bruno lleva dos semanas en hogar temporal y se adaptó de maravilla. Ya duerme tranquilo y respeta las rutinas de la casa.',
		date: '2026-09-30',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'lola',
		kind: 'examen',
		title: 'Esterilización agendada',
		body: 'A Lola le agendamos la esterilización. Está sana y con todas las vacunas al día, así que será una cirugía sencilla.',
		date: '2026-10-11',
		photo: null,
		urgent: false
	},
	{
		dogSlug: 'chiquis',
		kind: 'tratamiento',
		title: 'Tratamiento para la anemia',
		body: 'Chiquis llegó con anemia. Está con suplementos y alimentación especial; necesita controles cada semana. Toda ayuda suma.',
		date: '2026-10-09',
		endDate: '2026-11-09',
		photo: null,
		urgent: true
	},
	{
		dogSlug: 'negro',
		kind: 'general',
		title: 'Llegó a la fundación',
		body: 'Negro llegó hace unos días, rescatado de la calle. Está asustado pero comiendo bien. Pronto tendrá su primer control veterinario.',
		date: '2026-10-06',
		photo: null,
		urgent: false
	}
];
