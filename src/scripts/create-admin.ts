/**
 * Crea o actualiza una cuenta del panel.
 *
 * Uso:
 *   node --env-file=.env dist/scripts/create-admin.js <email> <password> [nombre] [rol]
 *
 * O con las variables de entorno ADMIN_EMAIL / ADMIN_PASSWORD:
 *   node --env-file=.env dist/scripts/create-admin.js
 *
 * Es idempotente: si el correo ya existe, actualiza la contraseña y el rol.
 */
import { closeDb } from '../db/index.js';
import { listUsers, upsertUser } from '../auth/users.js';
import type { AdminRole } from '../types.js';

const [, , emailArg, passwordArg, nameArg, roleArg] = process.argv;

const email = emailArg ?? process.env.ADMIN_EMAIL;
const password = passwordArg ?? process.env.ADMIN_PASSWORD;
const name = nameArg ?? process.env.ADMIN_NAME ?? 'Administrador';
const role = (roleArg ?? process.env.ADMIN_ROLE ?? 'admin') as AdminRole;

if (!email || !password) {
	console.error(
		'Faltan datos.\n' +
			'  node --env-file=.env dist/scripts/create-admin.js <email> <password> [nombre] [admin|editor]'
	);
	process.exit(1);
}

if (password.length < 12) {
	console.error('La contraseña debe tener al menos 12 caracteres.');
	process.exit(1);
}

if (role !== 'admin' && role !== 'editor') {
	console.error('El rol debe ser "admin" o "editor".');
	process.exit(1);
}

try {
	const user = await upsertUser({ email, password, name, role });
	console.log(`Cuenta lista: ${user.email} (${user.role})`);

	const all = await listUsers();
	console.log(`\nCuentas del panel: ${all.length}`);
	for (const entry of all) {
		console.log(`  ${entry.email.padEnd(30)} ${entry.role.padEnd(8)} ${entry.active ? 'activa' : 'inactiva'}`);
	}
} catch (error) {
	console.error('No se pudo crear la cuenta:', error);
	process.exitCode = 1;
} finally {
	await closeDb();
}
