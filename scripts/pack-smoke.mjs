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

try {
	console.log('packing...');
	// npm prints CRLF on windows, so split on either and trim the name again
const tarball = runNpm(['pack', '--pack-destination', work], root).trim().split(/\r?\n/).pop().trim();

	console.log('installing into a clean project...');
	writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));

	writeFileSync(
		join(work, 'check.mjs'),
		`const specs = ['uele/tiny', 'uele/core', 'uele/setup', 'uele/signals/alien-signals', 'uele/signals/anod', 'uele/signals/lite-signal', 'uele/signals/maverick', 'uele/signals/mobx', 'uele/signals/nanostores', 'uele/signals/oby', 'uele/signals/preact', 'uele/signals/reactively', 'uele/signals/reflex', 'uele/signals/rescript-signals', 'uele/signals/rxjs', 'uele/signals/signals', 'uele/signals/sjs', 'uele/signals/solid', 'uele/signals/tanstack', 'uele/signals/ulive', 'uele/signals/usignal', 'uele/signals/vue', 'uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/props', 'uele/diffs/builtin', 'uele/diffs/udomdiff', 'uele/diffs/domdiff', 'uele/diffs/morphdom', 'uele/diffs/nanomorph', 'uele/diffs/fast-array-diff', 'uele/diffs/rebuild', 'uele/diffs/swapdom', 'uele/diffs/spect', 'uele/diffs/snabbdom', 'uele/diffs/stage0', 'uele/diffs/heckel', 'uele/diffs/list-difference', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router', 'uele/hooks', 'uele/themes'];
for (const spec of specs) {
	const mod = await import(spec);
	const keys = Object.keys(mod).sort();
	if (!keys.length) throw new Error(spec + ' exported nothing');
	console.log('ok', spec, keys.join(','));
}

for (const [slug, [old, name]] of Object.entries({"alien-signals": ["useAlienSignals", "alienSignals"], "anod": ["useAnod", "anod"], "lite-signal": ["useLiteSignal", "liteSignal"], "maverick": ["useMaverick", "maverick"], "mobx": ["useMobx", "mobx"], "nanostores": ["useNanostores", "nanostores"], "oby": ["useOby", "oby"], "preact": ["usePreactSignals", "preactSignals"], "reactively": ["useReactively", "reactively"], "reflex": ["useReflex", "reflex"], "rescript-signals": ["useRescriptSignals", "rescriptSignals"], "rxjs": ["useRxjs", "rxjs"], "signals": ["useSignals", "signals"], "sjs": ["useSjs", "sjs"], "solid": ["useSolid", "solid"], "tanstack": ["useTanstackStore", "tanstackStore"], "ulive": ["useUlive", "ulive"], "usignal": ["useUsignal", "usignal"], "vue": ["useVue", "vue"]})) {
  const preferred = await import('uele/signals/' + slug);
  if (typeof preferred[name] !== 'function' || old in preferred) throw new Error(slug + ' invalid public exports');
}
for (const spec of ['uele/core/full', 'uele/diffs/util', 'uele/signals/internal', 'uele/signals/util', 'uele/adapters/preact']) {
  try { await import(spec); throw new Error(spec + ' unexpectedly public'); }
  catch (error) { if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error; }
}
const core = await import('uele/core');
if (typeof (await import('uele')).api.diff !== 'function' || (await import('uele/lite')).api.diff !== undefined || core.api.diff !== undefined)
  throw new Error('incorrect default diff tier configuration');
if ((await import('uele/tiny')).api !== core.api) throw new Error('tiny is not the bare core');
const fullExports = await import('uele');
for (const name of ['If', 'For', 'Switch', 'Dynamic', 'Show', 'Match']) if (name in fullExports) throw new Error(name + ' must move to flow');
if (typeof fullExports.lazy !== 'function' || 'lazy' in await import('uele/flow')) throw new Error('lazy must remain in full');

if (Object.keys(core).sort().join(',') !== 'add,api,h,props,r,useLive')
  throw new Error('unexpected core exports');
let reads = 0;
if (core.api.get(() => ++reads) !== 1 || reads !== 1 || core.api.is({}) !== false || core.api.sub !== undefined)
  throw new Error('core unexpectedly enables automatic reactivity');

const { configure } = await import('uele/setup');
const mainTarget = await import('uele');
if (configure() !== mainTarget) throw new Error('setup default target differs');
const { preactSignals } = await import('uele/signals/preact');
configure({ signals: preactSignals });
const hooks = await import('uele/hooks');
const counter = hooks.useCounter(); counter.inc();
if (mainTarget.api.get(counter.count) !== 1) throw new Error('packaged hooks do not share the active API');
const timer = hooks.useTimeout(() => {}, 100000); timer.dispose(); timer.start();
if (timer.active()) { timer.stop(); throw new Error('disposed hook restarted'); }
if ('useSignal' in hooks || 'read' in hooks || 'useIsMounted' in hooks) throw new Error('removed hook exports remain');

for (const slug of ['reflex', 'reactively', 'anod', 'lite-signal', 'rescript-signals', 'maverick', 'oby']) {
  const mod = await import('uele/signals/' + slug);
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

	runNpm(['install', join(work, tarball), '@preact/signals-core', 'swapdom', 'udomdiff@^1.1.2', 'domdiff@^2.2.2', 'morphdom@^2.7.8', 'nanomorph@^5.4.3', 'fast-array-diff@^1.1.0', '@volynets/reflex', '@reactively/core', 'anod', '@zakkster/lite-signal', 'rescript-signals', '@rescript/runtime', '@maverick-js/signals', 'oby', 'alien-signals@^3.2.1', 'mobx@^7.0.6', 'nanostores@^1.5.5', 'rxjs@^7.8.2', 's-js@^0.4.9', 'solid-js@^1.9.17', '@tanstack/store@^0.11.2', '@vue/reactivity@^3.5.44', '@webreflection/signals@^0.2.8', 'ulive@^1.0.7', 'usignal@^0.10.0', '--no-audit', '--no-fund', '--silent'], work); // explicitly install the optional peers exercised above
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
const specs = ['uele/tiny', 'uele/core', 'uele/setup', 'uele/signals/alien-signals', 'uele/signals/anod', 'uele/signals/lite-signal', 'uele/signals/maverick', 'uele/signals/mobx', 'uele/signals/nanostores', 'uele/signals/oby', 'uele/signals/preact', 'uele/signals/reactively', 'uele/signals/reflex', 'uele/signals/rescript-signals', 'uele/signals/rxjs', 'uele/signals/signals', 'uele/signals/sjs', 'uele/signals/solid', 'uele/signals/tanstack', 'uele/signals/ulive', 'uele/signals/usignal', 'uele/signals/vue', 'uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime', 'uele/props', 'uele/diffs/builtin', 'uele/diffs/udomdiff', 'uele/diffs/domdiff', 'uele/diffs/morphdom', 'uele/diffs/nanomorph', 'uele/diffs/fast-array-diff', 'uele/diffs/rebuild', 'uele/diffs/swapdom', 'uele/diffs/spect', 'uele/diffs/snabbdom', 'uele/diffs/stage0', 'uele/diffs/heckel', 'uele/diffs/list-difference', 'uele/ui', 'uele/reactive', 'uele/flow', 'uele/router', 'uele/hooks', 'uele/themes'];
for (const spec of specs) {
	const mod = require(spec);
	const keys = Object.keys(mod).filter((k) => k !== 'default' && k !== '__esModule').sort();
	if (!keys.length) throw new Error(spec + ' (require) exported nothing');
	console.log('ok require', spec, keys.join(','));
}

for (const [slug, [old, name]] of Object.entries({"alien-signals": ["useAlienSignals", "alienSignals"], "anod": ["useAnod", "anod"], "lite-signal": ["useLiteSignal", "liteSignal"], "maverick": ["useMaverick", "maverick"], "mobx": ["useMobx", "mobx"], "nanostores": ["useNanostores", "nanostores"], "oby": ["useOby", "oby"], "preact": ["usePreactSignals", "preactSignals"], "reactively": ["useReactively", "reactively"], "reflex": ["useReflex", "reflex"], "rescript-signals": ["useRescriptSignals", "rescriptSignals"], "rxjs": ["useRxjs", "rxjs"], "signals": ["useSignals", "signals"], "sjs": ["useSjs", "sjs"], "solid": ["useSolid", "solid"], "tanstack": ["useTanstackStore", "tanstackStore"], "ulive": ["useUlive", "ulive"], "usignal": ["useUsignal", "usignal"], "vue": ["useVue", "vue"]})) {
  const preferred = require('uele/signals/' + slug);
  if (typeof preferred[name] !== 'function' || old in preferred) throw new Error(slug + ' invalid CJS exports');
  if (!require.resolve('uele/signals/' + slug).endsWith('.cjs')) throw new Error(slug + ' is not CJS');
}
for (const spec of ['uele/core/full', 'uele/diffs/util', 'uele/signals/internal', 'uele/signals/util', 'uele/adapters/preact']) {
  try { require(spec); throw new Error(spec + ' unexpectedly public'); }
  catch (error) { if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error; }
}
const core = require('uele/core');
if (typeof require('uele').api.diff !== 'function' || require('uele/lite').api.diff !== undefined || core.api.diff !== undefined)
  throw new Error('incorrect CJS default diff tier configuration');
if (require('uele/tiny').api !== core.api) throw new Error('tiny CJS is not the bare core');

if (Object.keys(core).sort().join(',') !== 'add,api,h,props,r,useLive')
  throw new Error('unexpected core exports');
let reads = 0;
if (core.api.get(() => ++reads) !== 1 || reads !== 1 || core.api.is({}) !== false || core.api.sub !== undefined)
  throw new Error('core unexpectedly enables automatic reactivity');

const { configure } = require('uele/setup');
const customTarget = { api: {}, props: new Map(), r() {} };
if (configure({}, customTarget) !== customTarget) throw new Error('setup target differs');
if (!require.resolve('uele/setup').endsWith('.cjs')) throw new Error('setup is not CJS');
const { preactSignals } = require('uele/signals/preact');
configure({ signals: preactSignals });
const hooks = require('uele/hooks');
const counter = hooks.useCounter(); counter.inc();
if (require('uele').api.get(counter.count) !== 1) throw new Error('CJS hooks do not share the active API');
const timer = hooks.useTimeout(() => {}, 100000); timer.dispose(); timer.start();
if (timer.active()) { timer.stop(); throw new Error('CJS disposed hook restarted'); }
if ('useSignal' in hooks || 'read' in hooks || 'useIsMounted' in hooks) throw new Error('removed CJS hook exports remain');

for (const slug of ['reflex', 'reactively', 'anod', 'lite-signal', 'rescript-signals', 'maverick', 'oby']) {
  const mod = require('uele/signals/' + slug);
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
		`import { api as rendererApi, h as coreH } from 'uele/core';
import { For as CoreFor } from 'uele/flow';
rendererApi.is = value => typeof value === 'function';
rendererApi.get = value => typeof value === 'function' ? value() : value;
coreH('b', null, 'core');
CoreFor({ each: [1], children: value => coreH('b', null, value) });
import { useCounter, useWindowSize, useAsync } from 'uele/hooks';
import { read } from 'uele/reactive';
const typedCounter = useCounter(0);
const typedCount: number = read(typedCounter.count);
const viewport = useWindowSize(); viewport.dispose();
const task = useAsync(async (id: number) => ({ id })); task.run(1); task.dispose();
import { configure } from 'uele/setup';
import { preactSignals } from 'uele/signals/preact';
import { stage0 } from 'uele/diffs/stage0';
import { appProps } from 'uele/props';
import * as lite from 'uele/lite';
configure({ signals: preactSignals, diff: stage0, props: [appProps] });
configure({ signals: preactSignals, props: [appProps] }, lite);
import { h, map, lazy, useLive, props, api } from 'uele';
import { If, For, Dynamic } from 'uele/flow';

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
api.diff = (parent, a, b, end) => {};
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
			'app.tsx'
		],
		work
	);
	console.log('ok consumer types resolve');

	console.log('\npack smoke test passed');
} finally {
	rmSync(work, { recursive: true, force: true });
}
