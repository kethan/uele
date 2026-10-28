import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const src = (p) => fileURLToPath(new URL(p, import.meta.url));
const require = createRequire(import.meta.url);
/**
 * Only set the options the installed vitest/vite actually reads: an option that a
 * version does not know is either ignored (fine) or complained about on every run
 * (`Both esbuild and oxc options were set`, `test.poolOptions was removed`).
 */
const major = (name) => {
	try {
		return Number(require(name + '/package.json').version.split('.')[0]);
	} catch {
		return 0;
	}
};
const viteMajor = major('vite');
const vitestMajor = major('vitest');
// vite 5 reads `esbuild.jsx*`; vite 6+ transforms jsx with oxc and ignores it (and
// rejects an equivalent `oxc: { jsx: 'automatic' }` outright on 8.3)
const jsxTransform = viteMajor >= 6 ? {} : { esbuild: { jsx: 'automatic', jsxImportSource: 'uele' } };
// vitest <= 3 reads `poolOptions.forks.execArgv`, vitest 4+ the top-level option
const gcArgv =
	vitestMajor >= 4
		? { pool: 'forks', execArgv: ['--expose-gc'] }
		: { pool: 'forks', poolOptions: { forks: { execArgv: ['--expose-gc'] } } };

export default defineConfig({
	resolve: {
		alias: [
			// safety net: whatever the installed vite emits. If it ignores both the
			// jsx block below and the per-file `/** @jsxImportSource uele */`
			// pragma (oxc has done both, on different vite versions), the automatic
			// runtime it emits points at react - so send react's jsx runtimes to
			// uele's own, which are signature-compatible.
			{ find: /^react\/jsx-dev-runtime$/, replacement: src('./test/helpers/cjs-jsx-dev-runtime.js') },
			{ find: /^react\/jsx-runtime$/, replacement: src('./test/helpers/cjs-jsx-runtime.js') },
			{ find: /^ele\/jsx-runtime$/, replacement: src('./test/helpers/cjs-jsx-runtime.js') },
			{ find: /^ele\/jsx-dev-runtime$/, replacement: src('./test/helpers/cjs-jsx-dev-runtime.js') },
			// one native-require instance for the package and its api (see test/helpers/cjs-ele.js)
			{ find: /^uele$/, replacement: src('./test/helpers/cjs-ele.js') },
			{ find: /^uele\/router$/, replacement: src('./router/index.cjs') },
			{ find: /^uele\/flow$/, replacement: src('./flow/index.cjs') },
			{ find: /^uele\/reactive$/, replacement: src('./reactive/index.cjs') },
			{ find: /^uele\/ui$/, replacement: src('./ui/index.cjs') },
			{ find: /^uele\/diffs\/(.*)$/, replacement: src('./diffs/$1.cjs') },
			{ find: /^usub\/tiny$/, replacement: src('./test/helpers/cjs-lite.js') },
			{ find: /^usub$/, replacement: src('./test/helpers/cjs-ele.js') },
			{ find: /^\.\.\/src\/index\.js$/, replacement: src('./test/helpers/cjs-ele.js') },
			{ find: /^\.\.\/lite\/index\.js$/, replacement: src('./test/helpers/cjs-lite.js') }
		]
	},
	...jsxTransform,
	test: {
		name: 'bundles-cjs',
		environment: 'jsdom',
		// see test/helpers/react-classic.js: covers a vite that falls back to the
		// classic `React.createElement` transform and imports nothing
		setupFiles: ['./test/helpers/react-classic.js'],
		// the stress suite alone does 1000 items x 200 keyed updates; the default 5s
		// is not enough on a slower or loaded machine
		testTimeout: 30000,
		include: [
			'test/h.test.js', 'test/r.test.js', 'test/map.test.js', 'test/for.test.js',
			'test/dom.test.js', 'test/dom.cleanup.test.js', 'test/components.test.js',
			'test/realtime.test.js', 'test/props.test.js', 'test/lite.test.js',
			'test/jsx.test.tsx', 'test/signals.conformance.test.js', 'test/signals.libraries.test.js',
			'test/diff.conformance.test.js', 'test/diff.transitions.test.js', 'test/bundle-identity.test.js', 'test/presets.test.js',
			// the suites that mix `ele` with `ele/ui`, `ele/flow`, `ele/router` or
			// `ele/signals/*` are left out on purpose: under this config the built CJS
			// files' internal `require('ele')` lands in a second module cache (vitest-only -
			// real Node unifies by path, which scripts/pack-smoke asserts). They run against
			// the built ESM output instead.
			'test/cjs.ownership.test.js', 'test/docs.test.js'
		],
		...gcArgv,
	}
});
