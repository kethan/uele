#!/usr/bin/env node
/**
 * Packs the library, installs the tarball into a throwaway project and verifies
 * the published surface: exports map, files, runtime imports and types.
 * Run after `npm run build`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// `npm` is `npm.cmd` on windows and execFileSync does not go through PATHEXT, so
// spawning "npm" fails with ENOENT there
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf8' });

const work = mkdtempSync(join(tmpdir(), 'uele-pack-'));
const pkgDir = join(work, 'consumer');

try {
	console.log('packing...');
	// npm prints CRLF on windows, so split on either and trim the name again
const tarball = run(npm, ['pack', '--pack-destination', work], root).trim().split(/\r?\n/).pop().trim();

	console.log('installing into a clean project...');
	writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));

	writeFileSync(
		join(work, 'check.mjs'),
		`const specs = ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/adapters/preact', 'uele/diffs/swapdom', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router'];
for (const spec of specs) {
	const mod = await import(spec);
	const keys = Object.keys(mod).sort();
	if (!keys.length) throw new Error(spec + ' exported nothing');
	console.log('ok', spec, keys.join(','));
}
const { h, api } = await import('uele');
const { h: liteH } = await import('uele/lite');
const { jsx, Fragment } = await import('uele/jsx-runtime');
if (typeof h !== 'function' || typeof liteH !== 'function' || typeof jsx !== 'function') throw new Error('entries are not callable');
if (Fragment !== h) throw new Error('Fragment must be the shared h (same module instance as the main entry)');
if (typeof api.effect !== 'function') throw new Error('api is not shared');
console.log('ok shared module instance, Fragment is the main h');
`
	);

	run(npm, ['install', join(work, tarball), '@preact/signals-core', 'swapdom', '--no-audit', '--no-fund', '--silent'], work); // the two presets exercised above
	const installed = join(work, 'node_modules', 'uele');
	const files = readdirSync(installed);
	console.log('published entries:', files.join(', '));

	for (const required of ['dist', 'lite', 'jsx-runtime', 'jsx-dev-runtime']) {
		if (!files.includes(required)) throw new Error(`missing published directory: ${required}`);
	}
	if (!existsSync(join(installed, 'dist/index.d.ts'))) throw new Error('missing dist/index.d.ts');
	if (!existsSync(join(installed, 'jsx-runtime/index.d.ts'))) throw new Error('missing jsx-runtime types');

	writeFileSync(
		join(work, 'check.cjs'),
		`// plain CommonJS consumers must get the full surface (a '.js' CJS build inside a
// \"type\": \"module\" package resolves as ESM and yields an empty module - caught here)
const specs = ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/adapters/preact', 'uele/diffs/swapdom', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router'];
for (const spec of specs) {
	const mod = require(spec);
	const keys = Object.keys(mod).filter((k) => k !== 'default' && k !== '__esModule').sort();
	if (!keys.length) throw new Error(spec + ' (require) exported nothing');
	console.log('ok require', spec, keys.join(','));
}
const uele = require('uele');
if (typeof uele.h !== 'function' || typeof uele.api !== 'function' && typeof uele.api !== 'object') throw new Error('require surface is not callable');
if (uele.Fragment !== uele.h && typeof uele.Fragment !== 'undefined') throw new Error('Fragment must be the shared h');
console.log('ok require() consumer');
`
	);
	console.log('resolving subpath exports (import)...');
	console.log(run('node', ['check.mjs'], work).trim());
	console.log('resolving subpath exports (require)...');
	console.log(run('node', ['check.cjs'], work).trim());

	console.log('type checking a consumer tsx file...');
	writeFileSync(
		join(work, 'app.tsx'),
		`import { h, If, For, map, lazy, Dynamic, useLive, props, api } from 'uele';

const [live, setLive] = useLive(0);
const items: string[] = ['a', 'b'];
const Lazy = lazy(() => Promise.resolve({ default: () => <b>lazy</b> }), <i>loading</i>);

const App = ({ id }: { id: string }) => (
	<main id={id}>
		<h1>{live}</h1>
		<button onClick={() => setLive((n: number) => n + 1)}>+</button>
		<If when={live} fallback={<b>none</b>}><i>has</i></If>
		<For each={items}>{(item: string, i: number) => <li>{item}{i}</li>}</For>
		{map(items, (item: string) => <li>{item}</li>)}
		<Dynamic component={({ children }: any) => <div>{children}</div>}>dyn</Dynamic>
		<Lazy />
		<svg width={10}><circle cx={1} /></svg>
	</main>
);

props.set('upper', (node, value, name, attrs) => {});
api.get = (v: any) => v;
api.diff = (parent, a, b, get, before) => {};
const el = h(App, { id: 'a' });
export default el;
`
	);
	run(
		process.execPath,
		[
			join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
			'--noEmit',
			'--strict',
			'--target', 'es2022',
			'--module', 'esnext',
			'--moduleResolution', 'bundler',
			'--jsx', 'react-jsx',
			'--jsxImportSource', 'uele',
			'--skipLibCheck',
			'app.tsx'
		],
		work
	);
	console.log('ok consumer types resolve');

	console.log('\npack smoke test passed');
} finally {
	rmSync(work, { recursive: true, force: true });
}
