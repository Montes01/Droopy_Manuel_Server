/**
 * Repara el texto doblemente codificado (mojibake) en los archivos del front.
 *
 * El problema: un carácter como «í» (U+00ED) se guardó como los bytes UTF-8
 * C3 AD, y luego cada byte se reinterpretó como Latin-1, produciendo «Ã».
 * Aquí se invierte: se codifica a Latin-1 y se vuelve a decodificar como UTF-8.
 *
 * Solo toca archivos donde la reparación produce texto válido y reduce el
 * número de caracteres sospechosos, así que es seguro ejecutarlo dos veces.
 *
 *   node scripts/fix-encoding.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontSrc = resolve(here, '..', '..', 'Front', 'src');

const dry = process.argv.includes('--dry');

/** Marcadores típicos de UTF-8 leído como Latin-1. */
const MOJIBAKE = /[ÃÂ][\u0080-\u00BF\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g;

function countMojibake(text) {
	return (text.match(MOJIBAKE) ?? []).length;
}

/** Invierte la doble codificación. Devuelve null si el resultado no es válido. */
function repair(text) {
	const bytes = Buffer.from(text, 'latin1');
	const decoded = bytes.toString('utf8');
	// Si al decodificar aparecen caracteres de reemplazo, perdimos información.
	if (decoded.includes('\uFFFD')) return null;
	return decoded;
}

const EXTENSIONS = new Set(['.ts', '.svelte', '.js', '.css', '.html', '.json']);

function walk(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, files);
		} else if (EXTENSIONS.has(extname(entry))) {
			files.push(full);
		}
	}
	return files;
}

if (!statSync(frontSrc, { throwIfNoEntry: false })) {
	throw new Error(`No se encontró ${frontSrc}`);
}

let repairedCount = 0;
let skipped = 0;

for (const file of walk(frontSrc)) {
	const original = readFileSync(file, 'utf8');
	const before = countMojibake(original);
	if (before === 0) continue;

	const fixed = repair(original);
	if (fixed === null) {
		console.log(`  omitido (no reparable con seguridad): ${file}`);
		skipped++;
		continue;
	}

	const after = countMojibake(fixed);
	if (after >= before) {
		console.log(`  omitido (sin mejora): ${file}`);
		skipped++;
		continue;
	}

	const rel = file.slice(frontSrc.length + 1);
	console.log(`  ${dry ? '[dry] ' : ''}${rel}: ${before} → ${after} secuencias`);

	if (!dry) writeFileSync(file, fixed, 'utf8');
	repairedCount++;
}

console.log(
	`\n${dry ? 'Se repararían' : 'Reparados'} ${repairedCount} archivos` +
		(skipped > 0 ? `, ${skipped} omitidos` : '')
);
