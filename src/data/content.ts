import type {
	DonationTier,
	SiteContact,
	SiteContent,
	SiteStats,
	Testimonial
} from '../types.js';

export const stats: SiteStats = {
	rescued: 248,
	adopted: 196,
	sterilized: 312,
	inCare: 34
};

export const aboutBlurb =
	'Somos una fundación dedicada al rescate, rehabilitación y adopción de perritos. Cada estrella que donas se convierte en croquetas, vacunas y segundas oportunidades.';

export const siteContent: SiteContent = {
	aboutBlurb,
	stats
};

/**
 * Número de WhatsApp de la fundación, en formato internacional sin signos.
 * Es la ÚNICA definición: de aquí salen el enlace, el texto visible y el
 * placeholder del formulario de compra.
 */
const WHATSAPP_NUMBER = '573226438857';

/** Presenta 573226438857 como «322 643 8857» para leerlo con facilidad. */
function formatPhone(raw: string): string {
	const local = raw.startsWith('57') ? raw.slice(2) : raw;
	return local.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}

export const siteContact: SiteContact = {
	whatsappNumber: WHATSAPP_NUMBER,
	whatsappDisplay: formatPhone(WHATSAPP_NUMBER),
	whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
	email: 'donaciones@droopymanuel.co',
	socials: [
		{
			key: 'tiktok',
			label: 'TikTok',
			icon: '/icons/tiktok.png',
			href: 'https://www.tiktok.com/@droopy.manuel?_r=1&_t=ZS-941vqEuOvdy'
		},
		{
			key: 'instagram',
			label: 'Instagram',
			icon: '/icons/instagram.png',
			href: 'https://www.instagram.com/droopymanuel?igsh=MTFtbmFuaHhkbWwweQ=='
		},
		{
			key: 'facebook',
			label: 'Facebook',
			icon: '/icons/facebook.png',
			href: 'https://www.facebook.com/share/18BXEMcn6s/'
		},
		{
			key: 'youtube',
			label: 'YouTube',
			icon: '/icons/youtube.png',
			href: 'https://www.youtube.com/@droopymanuel'
		},
		{
			key: 'whatsapp',
			label: 'WhatsApp',
			icon: '/icons/whatsapp.png',
			href: `https://wa.me/${WHATSAPP_NUMBER}`
		}
	]
};

export const donationTiers: DonationTier[] = [
	{
		stars: 1,
		name: 'Estrella Cachorra',
		priceCents: 5000,
		currency: 'MXN',
		blurb: 'Un día de croquetas para un rescatado.',
		perks: ['Mención en el muro de estrellas', 'Foto de agradecimiento']
	},
	{
		stars: 3,
		name: 'Estrella Guardián',
		priceCents: 15000,
		currency: 'MXN',
		blurb: 'Vacunas y desparasitación de un rescate nuevo.',
		perks: ['Todo lo anterior', 'Carta del perrito que ayudaste', 'Sticker de la manada']
	},
	{
		stars: 5,
		name: 'Estrella Arcoíris',
		priceCents: 30000,
		currency: 'MXN',
		blurb: 'Esterilización completa + seguimiento post-operatorio.',
		perks: ['Todo lo anterior', 'Videollamada con la manada', 'Tu nombre en una casita del refugio']
	},
	{
		stars: 12,
		name: 'Constelación Droopy',
		priceCents: 60000,
		currency: 'MXN',
		blurb: 'Apadrina a un perrito por un mes: comida, vet y amor.',
		perks: ['Todo lo anterior', 'Padrino oficial con certificado', 'Visitas programadas al refugio']
	}
];

export const testimonials: Testimonial[] = [
	{
		name: 'Familia Hernández',
		role: 'Adoptantes de Toby',
		quote:
			'Nos pidieron paciencia las primeras semanas y tenían razón: Toby hoy es el centro de la casa. Adoptar con acompañamiento lo cambia todo.',
		dog: 'toby'
	},
	{
		name: 'Mariana G.',
		role: 'Voluntaria desde 2022',
		quote:
			'Empecé paseando perros los sábados y terminé coordinando hogares temporales. La manada te atrapa, en el buen sentido.',
		dog: 'rocky'
	},
	{
		name: 'Enfermera Paola R.',
		role: 'Adoptante de Max',
		quote:
			'Max y yo visitamos hospitales cada semana. Ver a un paciente sonreír por primera vez gracias a él no tiene precio.',
		dog: 'max'
	},
	{
		name: 'Don Emilio',
		role: 'Padrino Constelación',
		quote:
			'Apadrino a dos perritos al mes. Me mandan fotos y avances: es la mejor suscripción que tengo, por mucho.',
		dog: 'canela'
	}
];
