/**
 * Esquema completo de la base de datos.
 *
 * Se reexporta todo desde aquí para que `drizzle(client, { schema })` y las
 * migraciones vean las tablas sin listarlas una por una.
 */
export * from './enums.js';
export * from './dogs.js';
export * from './shop.js';
export * from './orders.js';
export * from './news.js';
export * from './donations.js';
export * from './auth.js';
