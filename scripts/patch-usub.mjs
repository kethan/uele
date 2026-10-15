// Applies usub's 0.8.2 fix to node_modules/usub (source patch: docs/usub-0.8.2-upstream.patch).
//
// usub parks every subscription's disposer in a FinalizationRegistry. A registry entry
// whose value can reach its target is never released, and an effect-owned disposer closes
// over the runner and its callback - so every signal subscription retained one chain
// (source + last rendered nodes) forever, even after stop(). The fix only parks the
// disposer when no effect owns it; the safety net for subscribe/then/async-iterator
// sources is kept. Run automatically before the tests (vitest globalSetup).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = [
	'dist/index.es.js', 'dist/index.js',
	'lite/dist/index.es.js', 'lite/dist/index.js',
	'tiny/dist/index.es.js', 'tiny/dist/index.js'
];

let patched = 0;
for (const f of files) {
	const p = join(root, 'node_modules', 'usub', f);
	let s;
	try { s = readFileSync(p, 'utf8'); } catch { continue; }
	if (s.includes('fx || registry.register')) continue; // already fixed (0.8.2 or re-run)
	const t = s
		.replace('const sub = (target, next, error, cleanup, stop, unsub)',
			'const sub = (target, next, error, cleanup, stop, unsub, fx)')
		.replace('api.any?.(target)?.(next, error, cleanup) || api.effect?.(() => (next(get(target)), api.cleanup?.(cleanup), cleanup))',
			'api.any?.(target)?.(next, error, cleanup) || (fx = api.effect?.(() => (next(get(target)), api.cleanup?.(cleanup), cleanup)))')
		.replace('registry.register(target, unsub),', 'fx || registry.register(target, unsub),');
	if (t === s) {
		console.warn(`patch-usub: patterns not found in ${f} - usub unchanged?`);
		continue;
	}
	writeFileSync(p, t);
	patched++;
}
if (patched) console.log(`patch-usub: applied the usub 0.8.2 fix to ${patched} file(s)`);
