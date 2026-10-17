import { pgEnum } from 'drizzle-orm/pg-core';
import {
	DOG_NEWS_KINDS,
	DOG_STATUSES,
	NEWS_CATEGORY_SLUGS,
	PROJECT_SECTION_KINDS
} from '../../types.js';

/**
 * Enums del dominio.
 *
 * Los valores son los mismos que usa la API en español, tal como se acordó:
 * así no hay capa de traducción entre la base y el contrato del frontend.
 * Renombrar un valor aquí exige una migración que reescriba los datos.
 */

export const dogStatusEnum = pgEnum('dog_status', DOG_STATUSES);

/** Clase visual de una sección de la página `/project`. */
export const projectSectionKindEnum = pgEnum('project_section_kind', PROJECT_SECTION_KINDS);

export const dogSizeEnum = pgEnum('dog_size', ['pequeño', 'mediano', 'grande']);

export const dogSexEnum = pgEnum('dog_sex', ['macho', 'hembra']);

export const dogEnergyEnum = pgEnum('dog_energy', ['tranquilo', 'moderado', 'juguetón']);

export const shippingIdEnum = pgEnum('shipping_id', ['recogida', 'domicilio']);

export const orderStatusEnum = pgEnum('order_status', [
	'pendiente',
	'confirmado',
	'enviado',
	'entregado',
	'cancelado'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
	'sin-pago',
	'en-revision',
	'pagado',
	'rechazado'
]);

export const newsCategoryEnum = pgEnum('news_category', NEWS_CATEGORY_SLUGS);

/** Tipo de comunicado en el perfil de un perrito. */
export const dogNewsKindEnum = pgEnum('dog_news_kind', DOG_NEWS_KINDS);

export const paymentMethodEnum = pgEnum('payment_method', [
	'transferencia',
	'billetera',
	'internacional'
]);

/** Rol de una persona con acceso al panel. */
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'editor']);
