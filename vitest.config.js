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
	// tests import the sources, the published entry points are verified by `npm run test:pack`
	resolve: {
		alias: [
			// safety net: whatever the installed vite emits. If it ignores both the
			// jsx block below and the per-file `/** @jsxImportSource uele */`
			// pragma (oxc has done both, on different vite versions), the automatic
			// runtime it emits points at react - so send react's jsx runtimes to
			// uele's own, which are signature-compatible.
			{ find: /^react\/jsx-dev-runtime$/, replacement: src('./jsx-dev-runtime/index.ts') },
			{ find: /^react\/jsx-runtime$/, replacement: src('./jsx-runtime/index.ts') },
			{ find: /^uele\/jsx-runtime$/, replacement: src('./jsx-runtime/index.ts') },
			{ find: /^uele\/jsx-dev-runtime$/, replacement: src('./jsx-dev-runtime/index.ts') },
			{ find: /^uele$/, replacement: src('./src/index.js') },
			{ find: /^uele\/router$/, replacement: src('./router/index.js') },
			{ find: /^uele\/flow$/, replacement: src('./flow/index.js') },
			{ find: /^uele\/reactive$/, replacement: src('./reactive/index.js') },
			{ find: /^uele\/ui$/, replacement: src('./ui/index.js') },
			{ find: /^uele\/adapters\/(.*)$/, replacement: src('./adapters/$1.js') },
			{ find: /^uele\/diffs\/(.*)$/, replacement: src('./diffs/$1.js') },
		]
	},
	...jsxTransform,
	test: {
		environment: 'jsdom',
		// see test/helpers/react-classic.js: covers a vite that falls back to the
		// classic `React.createElement` transform and imports nothing
		setupFiles: ['./test/helpers/react-classic.js'],
		// vitest <= 3 (vitest 4+ reads the top-level option instead; the memory
		// suite also works when NODE_OPTIONS=--expose-gc is exported)
		...gcArgv,
		coverage: {
			provider: 'v8',
			include: ['src/**/*.js', 'lite/index.js', 'jsx-runtime/index.ts', 'jsx-dev-runtime/index.ts'],
			exclude: ['**/dist/**'],
			reporter: ['text'],
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100
			}
		}
	}
});
