#!/usr/bin/env node
/**
 * Byte budget guard - run after `npm run build`.
 * Fails when a shipped bundle grows past its budget (gzip).
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const file = (p) => fileURLToPath(new URL(p, root));

// [file, raw budget, gzip budget] - keep in sync with the sizes documented in README.md
const budgets = [
	['dist/index.min.js', 3600, 1800],
	['dist/index.es.js', 8900, 3050],
	['lite/dist/index.min.js', 2500, 1300],
	['jsx-runtime/dist/index.es.js', 900, 500],
	['jsx-dev-runtime/dist/index.es.js', 900, 500]
];

let failed = false;
const rows = [];
for (const [path, rawBudget, gzipBudget] of budgets) {
	if (!existsSync(file(path))) {
		console.error(`missing ${path} - run \`npm run build\` first`);
		process.exit(1);
	}
	const buffer = readFileSync(file(path));
	const raw = buffer.length;
	const gzip = gzipSync(buffer).length;
	const fail = raw > rawBudget || gzip > gzipBudget;
	failed ||= fail;
	rows.push({
		file: path,
		raw: `${raw} / ${rawBudget}`,
		gzip: `${gzip} / ${gzipBudget}`,
		status: fail ? 'over budget' : 'ok'
	});
}

console.table(rows);
if (failed) {
	console.error('\nbundle budget exceeded');
	process.exit(1);
}
console.log('\nall bundles within budget');
