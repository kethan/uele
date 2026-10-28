import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Exercise the actual existing Vue preset against the benchmark's RC runtime.
export default mergeConfig(base, defineConfig({
	resolve: { alias: [{ find: /^@vue\/reactivity$/, replacement: require.resolve('vue-reactivity-3.6') }] },
	test: { include: ['test/presets.test.js', 'test/signals.conformance.test.js', 'test/reactive.test.js'] }
}));
