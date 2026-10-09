/**
 * Arranca el servidor, corre la verificación HTTP y lo apaga.
 *
 * Para que `pnpm test` sea un solo comando: no hace falta tener el server
 * levantado en otra terminal. Usa un puerto propio para no chocar con el
 * servidor de desarrollo que puedas tener abierto.
 *
 *   node --env-file=.env tests/e2e-http-auto.mjs
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(here, '..');

/** Puerto dedicado a las pruebas: no interfiere con el de desarrollo (3100). */
const PORT = 3199;

const child = spawn(process.execPath, ['dist/index.js'], {
	cwd: serverRoot,
	env: { ...process.env, PORT: String(PORT) },
	stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
child.stdout.on('data', (chunk) => (serverOutput += chunk.toString()));
child.stderr.on('data', (chunk) => (serverOutput += chunk.toString()));

/** Espera a que /api/health responda, o falla tras el timeout. */
async function waitForServer(timeoutMs = 20000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
			if (res.ok) return true;
		} catch {
			// Todavía no escucha.
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	return false;
}

let exitCode = 1;

try {
	if (!(await waitForServer())) {
		console.error('El servidor no respondió a tiempo.');
		console.error(serverOutput);
		throw new Error('timeout esperando al servidor');
	}

	// El test reutiliza su propia lógica; aquí solo lo invocamos aparte para
	// no duplicar aserciones.
	const test = spawn(process.execPath, ['tests/e2e-http.mjs', String(PORT)], {
		cwd: serverRoot,
		env: process.env,
		stdio: 'inherit'
	});

	exitCode = await new Promise((resolve) => test.on('exit', (code) => resolve(code ?? 1)));
} finally {
	child.kill();
}

process.exit(exitCode);
