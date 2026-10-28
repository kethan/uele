import terser from '@rollup/plugin-terser';
import node from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Print the raw and gzipped size of every file a bundle emits.
 * `rollup-plugin-bundle-size` used to do this, but it reads `options.file`
 * unconditionally (`basename(undefined)`) and throws on any output that has none -
 * a `dir` output, or a bundle written to stdout.
 */
const bundleSize = () => ({
	name: 'bundle-size',
	generateBundle(options, bundle) {
		for (const [name, out] of Object.entries(bundle)) {
			const code = typeof out.code === 'string' ? out.code : out.source;
			if (typeof code !== 'string') continue;
			const raw = Buffer.byteLength(code) / 1024;
			const gz = gzipSync(code).length / 1024;
			console.log(`Created bundle ${name}: ${raw.toFixed(2)} kB → ${gz.toFixed(2)} kB (gzip)`);
		}
	}
});

/**
 * Copy one file next to the bundle (`index.d.ts` into `dist/`). This used to be
 * `rollup-plugin-copy`, which is version-fragile: v2 refuses `targets` as an array
 * without `outputFolder`, v3 dropped the option - so one fs call it is.
 */
const copyFile = (from, toDir) => ({
	name: 'copy-file',
	closeBundle() {
		mkdirSync(toDir, { recursive: true });
		copyFileSync(from, toDir + basename(from));
	}
});

const resolve = (pkg, {
	input = "src/index",
	output = "dist/index",
	copyFiles = [],
	ext = "js",
	external = [],
	globals = {}
} = {}) => ({
	input: `${input}.${ext}`,
	external,
	plugins: [
		node(),
		commonjs(),
		bundleSize(),
		copyFiles.length && copyFile(copyFiles[0], copyFiles[1])
	],
	output: [
		{
			file: `${output}.es.js`,
			format: 'es',
		},
		{
			// .cjs so plain Node `require()` does not see the package's "type": "module"
			file: `${output}.cjs`,
			format: 'cjs',
		},
		{
			file: `${output}.min.js`,
			format: 'iife',
			name: pkg,
			strict: false,
			compact: true,
			globals,
			plugins: [terser()]
		},
		{
			file: `${output}.umd.cjs`,
			format: 'umd',
			name: pkg,
			strict: false,
			compact: true,
			globals,
			plugins: [terser()]
		}
	]
});

// jsx runtimes re-use the published entry - one copy of `h`, `api` and `props` per app
const jsx = (name) => resolve("uele", {
	copyFiles: [`${name}/index.d.ts`, `${name}/dist/`],
	input: `${name}/index`,
	output: `${name}/dist/index`,
	ext: "ts",
	external: ["uele"],
	globals: { uele: "uele" }
});


// CJS twins for the presets: the hand-written .js sources are the ESM surface,
// these outputs give `require()` consumers the same one-call API. Each preset
// builds standalone so the shared util code is inlined (no unpublished chunks).
const peers = new Set([
	'ulive', '@preact/signals-core', '@vue/reactivity', 'usignal', 'alien-signals', 's-js', 'mobx', 'rxjs',
	'nanostores', '@tanstack/store', 'solid-js', 'swapdom', 'udomdiff', 'domdiff', 'morphdom', 'nanomorph',
	'fast-array-diff'
]);
const presetFiles = [
	'router/index.js',
	'flow/index.js',
	'reactive/index.js',
	'ui/index.js',
	'hooks/index.js',
	'themes/index.js',
	// the shared helpers - a preset author is told to import these (see
	// docs/ADAPTERS.md), so `require('uele/adapters/util')` has to resolve too
	'adapters/util.js',
	'adapters/ulive.js',
	'adapters/preact.js',
	'adapters/vue.js',
	'adapters/usignal.js',
	'adapters/alien-signals.js',
	'adapters/sjs.js',
	'adapters/mobx.js',
	'adapters/rxjs.js',
	'adapters/nanostores.js',
	'adapters/tanstack.js',
	'adapters/solid.js',
	'adapters/signals.js',
	'diffs/builtin.js',
	'diffs/swapdom.js',
	'diffs/udomdiff.js',
	'diffs/domdiff.js',
	'diffs/morphdom.js',
	'diffs/nanomorph.js',
	'diffs/fast-array-diff.js',
	'diffs/rebuild.js',
	'diffs/spect.js',
	'diffs/snabbdom.js',
	'diffs/stage0.js',
	'diffs/heckel.js',
	'diffs/list-difference.js',


];
const presetsConfig = presetFiles.map((file) => ({
	input: file,
	external: (id) => id === 'uele' || id.startsWith('uele/') || peers.has(id) || id.startsWith('solid-js/'),
	output: {
		file: file.replace(/\.js$/, '.cjs'),
		format: 'cjs',
		exports: 'named'
	}
}));

export default [
	resolve("uele", { copyFiles: ["src/index.d.ts", "dist/"] }),
	jsx("jsx-runtime"),
	jsx("jsx-dev-runtime"),
	resolve("uele", { copyFiles: ["lite/index.d.ts", "lite/dist/"], input: "lite/index", output: "lite/dist/index" }),
	...presetsConfig
];
