import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Utilidades de autenticación.
 *
 * Las contraseñas se guardan con bcrypt (nunca en claro). Los tokens de sesión
 * son aleatorios y se guardan *hasheados*: si alguien lee la tabla de sesiones,
 * no puede suplantar a nadie.
 */

/** Coste de bcrypt. 12 es un equilibrio razonable en 2026. */
const BCRYPT_ROUNDS = 12;

/** Longitud del token de sesión en bytes (32 → 64 caracteres hex). */
const TOKEN_BYTES = 32;

export async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plain, hash);
}

/** Token de sesión nuevo, en claro (solo se muestra una vez). */
export function generateSessionToken(): string {
	return randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Hash determinista del token para buscarlo en la base.
 *
 * SHA-256 basta aquí (a diferencia de una contraseña) porque el token ya tiene
 * 256 bits de entropía: no es adivinable por fuerza bruta.
 */
export function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/** Comparación en tiempo constante, para no filtrar información por timing. */
export function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}
