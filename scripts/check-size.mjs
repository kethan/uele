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
//
// The 3600/8900 budgets bought `For`/`If` accepting a bare render function from
// jsx, `attrs.children` being treated as content instead of the read-only
// `Element.children` property (a component that spreads its props onto an
// element used to throw), and `For` naming the mistake instead of crashing
// inside `map`: +182 B minified, +500 B of the es build (which keeps comments).
//
// The 3850/9700 (and lite 2600) budgets bought region teardown: the disposer
// `sub` returns is registered per region marker and run for discarded (not
// reused) content, so effects created inside a removed subtree stop reacting
// instead of leaking - `Title` restore, `For` rows, nested thunks:
// +131 B minified, +55 B gzip on the main bundle.
//
// The 3950/9900 budgets extended that registry to attribute bindings and to
// `map`'s source subscription, the two teardown paths regions did not reach:
// +91 B minified, +43 B gzip.
const budgets = [
	['dist/index.min.js', 3950, 2000],
	['dist/index.es.js', 9900, 3600],
	['lite/dist/index.min.js', 2600, 1400],
	['jsx-runtime/dist/index.es.js', 900, 500],
	['jsx-dev-runtime/dist/index.es.js', 900, 500]
];

let failed = false;
const rows = [];
const missing = budgets.map(([path]) => path).filter((path) => !existsSync(file(path)));
if (missing.length) {
	// a partial dist/ means the build stopped on an error - the last line of
	// `npm run build` output says which plugin died
	console.error('missing ' + missing.length + ' of ' + budgets.length + ' bundles:');
	for (const path of missing) console.error('  ' + path);
	console.error('\nrun `npm run build` first\n');
	process.exit(1);
}
for (const [path, rawBudget, gzipBudget] of budgets) {
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
