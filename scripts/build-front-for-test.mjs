/**
 * Compila los módulos puros del frontend (`Front/src/lib/api` y `data`) a
 * `Server/test-build/` para poder ejecutarlos con Node en la prueba de
 * integración.
 *
 * Esto no sustituye al build real del front (Vite/SvelteKit): sirve solo para
 * verificar que el contrato entre front y back encaja, ejecutando el mismo
 * código fuente que usan los componentes.
 *
 *   node scripts/build-front-for-test.mjs
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(here, '..');
const frontRoot = resolve(serverRoot, '..', 'Front');
const outDir = join(serverRoot, 'test-build');

if (!existsSync(frontRoot)) {
	throw new Error(`No se encontró la carpeta del frontend en ${frontRoot}`);
}

const tsc = join(serverRoot, 'node_modules', 'typescript', 'bin', 'tsc');
if (!existsSync(tsc)) {
	throw new Error('Falta typescript en Server/node_modules. Ejecuta pnpm install.');
}

rmSync(outDir, { recursive: true, force: true });

const frontSrc = join(frontRoot, 'src');
const configPath = join(serverRoot, 'tsconfig.itest.json');

const config = {
	compilerOptions: {
		target: 'ES2022',
		module: 'ESNext',
		moduleResolution: 'Bundler',
		strict: true,
		skipLibCheck: true,
		types: [],
		outDir: outDir.replace(/\\/g, '/'),
		rootDir: frontSrc.replace(/\\/g, '/'),
		paths: {
			'#lib/*': [join(frontSrc, 'lib').replace(/\\/g, '/') + '/*']
		}
	},
	include: [
		join(frontSrc, 'lib', 'api').replace(/\\/g, '/') + '/**/*.ts',
		join(frontSrc, 'lib', 'data').replace(/\\/g, '/') + '/**/*.ts'
	]
};

writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

try {
	execFileSync(process.execPath, [tsc, '-p', configPath], { stdio: 'inherit' });
} catch {
	// `import.meta.env` no existe sin los tipos de Vite: TypeScript avisa, pero
	// igualmente emite el JavaScript que necesitamos.
}

// Node ESM exige extensión explícita en los imports relativos.
function addJsExtensions(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			addJsExtensions(full);
			continue;
		}
		if (!entry.endsWith('.js')) continue;

		const text = readFileSync(full, 'utf8');
		const patched = text.replace(/from '(\.\/[^']+)'/g, (match, path) =>
			path.endsWith('.js') ? match : `from '${path}.js'`
		);
		if (patched !== text) writeFileSync(full, patched, 'utf8');
	}
}

// `import.meta.env` es de Vite; en Node leemos la variable de entorno.
function patchEnvAccess() {
	const clientPath = join(outDir, 'lib', 'api', 'client.js');
	const text = readFileSync(clientPath, 'utf8');
	const patched = text.replace(
		'const fromEnv = import.meta.env.PUBLIC_API_URL;',
		"const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PUBLIC_API_URL : undefined) ?? process.env.PUBLIC_API_URL;"
	);
	writeFileSync(clientPath, patched, 'utf8');
}

addJsExtensions(outDir);
patchEnvAccess();

// El tsconfig temporal solo hace falta durante la compilación.
rmSync(configPath, { force: true });

// Deja una copia de los tipos para que el test pueda importarlos si hiciera falta.
cpSync(join(frontSrc, 'lib', 'data'), join(outDir, 'lib', 'data'), { recursive: true });

console.log(`Frontend compilado para pruebas en ${outDir}`);
