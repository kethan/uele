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
/**
 * How to run npm from this script. Neither obvious form works on windows:
 * `npm` is ENOENT (it is npm.cmd and execFileSync does not use PATHEXT) and
 * `npm.cmd` is EINVAL (a .cmd is not an executable - it needs a shell, which then
 * needs every argument quoted by hand). Running npm's own cli with node works on
 * every platform, needs no shell and survives paths with spaces.
 */
const npm = (() => {
	if (process.env.npm_execpath) return { file: process.execPath, args: [process.env.npm_execpath], shell: false };
	return process.platform === 'win32'
		? { file: 'npm.cmd', args: [], shell: true }
		: { file: 'npm', args: [], shell: false };
})();
const exec = (file, args, cwd, shell = false) =>
	execFileSync(file, args, { cwd, shell, stdio: 'pipe', encoding: 'utf8' });
const runNpm = (args, cwd) => exec(npm.file, [...npm.args, ...args], cwd, npm.shell);
const runNode = (args, cwd) => exec(process.execPath, args, cwd);

const work = mkdtempSync(join(tmpdir(), 'uele-pack-'));
const pkgDir = join(work, 'consumer');

try {
	console.log('packing...');
	// npm prints CRLF on windows, so split on either and trim the name again
const tarball = runNpm(['pack', '--pack-destination', work], root).trim().split(/\r?\n/).pop().trim();

	console.log('installing into a clean project...');
	writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));

	writeFileSync(
		join(work, 'check.mjs'),
		`const specs = ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/adapters/preact', 'uele/adapters/reflex', 'uele/adapters/reactively', 'uele/adapters/anod', 'uele/adapters/lite-signal', 'uele/adapters/rescript-signals', 'uele/adapters/maverick', 'uele/adapters/oby', 'uele/props', 'uele/diffs/swapdom', 'uele/diffs/spect', 'uele/diffs/snabbdom', 'uele/diffs/stage0', 'uele/diffs/heckel', 'uele/diffs/list-difference', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router', 'uele/hooks', 'uele/themes'];
for (const spec of specs) {
	const mod = await import(spec);
	const keys = Object.keys(mod).sort();
	if (!keys.length) throw new Error(spec + ' exported nothing');
	console.log('ok', spec, keys.join(','));
}

for (const slug of ['reflex', 'reactively', 'anod', 'lite-signal', 'rescript-signals', 'maverick', 'oby']) {
  const mod = await import('uele/adapters/' + slug);
  const install = Object.values(mod).find((value) => typeof value === 'function');
  const target = install({});
  const cell = target.signal(1);
  let seen;
  const stop = target.effect(() => { seen = target.get(cell); });
  target.set(cell, 2);
  if (seen !== 2) throw new Error(slug + ' did not update synchronously');
  stop(); target.set(cell, 3);
  if (seen !== 2) throw new Error(slug + ' did not dispose');
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

	runNpm(['install', join(work, tarball), '@preact/signals-core', 'swapdom', '@volynets/reflex', '@reactively/core', 'anod', '@zakkster/lite-signal', 'rescript-signals', '@rescript/runtime', '@maverick-js/signals', 'oby', '--no-audit', '--no-fund', '--silent'], work); // explicitly install the optional peers exercised above
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
const specs = ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/adapters/preact', 'uele/adapters/reflex', 'uele/adapters/reactively', 'uele/adapters/anod', 'uele/adapters/lite-signal', 'uele/adapters/rescript-signals', 'uele/adapters/maverick', 'uele/adapters/oby', 'uele/props', 'uele/diffs/swapdom', 'uele/diffs/spect', 'uele/diffs/snabbdom', 'uele/diffs/stage0', 'uele/diffs/heckel', 'uele/diffs/list-difference', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router', 'uele/hooks', 'uele/themes'];
for (const spec of specs) {
	const mod = require(spec);
	const keys = Object.keys(mod).filter((k) => k !== 'default' && k !== '__esModule').sort();
	if (!keys.length) throw new Error(spec + ' (require) exported nothing');
	console.log('ok require', spec, keys.join(','));
}

for (const slug of ['reflex', 'reactively', 'anod', 'lite-signal', 'rescript-signals', 'maverick', 'oby']) {
  const mod = require('uele/adapters/' + slug);
  const install = Object.values(mod).find((value) => typeof value === 'function');
  const target = install({});
  const cell = target.signal(1);
  let seen;
  const stop = target.effect(() => { seen = target.get(cell); });
  target.set(cell, 2);
  if (seen !== 2) throw new Error(slug + ' did not update synchronously');
  stop(); target.set(cell, 3);
  if (seen !== 2) throw new Error(slug + ' did not dispose');
}

const uele = require('uele');
if (typeof uele.h !== 'function' || typeof uele.api !== 'function' && typeof uele.api !== 'object') throw new Error('require surface is not callable');
if (uele.Fragment !== uele.h && typeof uele.Fragment !== 'undefined') throw new Error('Fragment must be the shared h');
// 'require' must resolve the CJS builds, not fall through 'default' to the ESM
// files - Node >= 22 silently loads ESM via require(), which masked a wrong
// condition order in the exports map (Node 18/20 throw ERR_REQUIRE_ESM)
for (const spec of ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/ui', 'uele/reactive', 'uele/hooks']) {
	const resolved = require.resolve(spec);
	if (!resolved.endsWith('.cjs')) throw new Error(spec + ' (require) resolved a non-CJS file: ' + resolved);
}
console.log('ok require() consumer');
`
	);
	console.log('resolving subpath exports (import)...');
	console.log(runNode(['check.mjs'], work).trim());
	console.log('resolving subpath exports (require)...');
	console.log(runNode(['check.cjs'], work).trim());

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
	runNode(
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
