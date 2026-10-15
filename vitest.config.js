import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	// tests import the sources, the published entry points are verified by `npm run test:pack`
	resolve: {
		alias: [
			{ find: /^uele\/jsx-runtime$/, replacement: src('./jsx-runtime/index.ts') },
			{ find: /^uele\/jsx-dev-runtime$/, replacement: src('./jsx-dev-runtime/index.ts') },
			{ find: /^uele$/, replacement: src('./src/index.js') }
		]
	},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'uele'
	},
	test: {
		globalSetup: './test/global-setup.js', // applies the usub 0.8.2 fix to node_modules (no-op on 0.8.2+)
		environment: 'jsdom',
		poolOptions: {
			forks: { execArgv: ['--expose-gc'] }
		},
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
