import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { uele: new URL('./src/index.js', import.meta.url).pathname } },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js', 'lite/index.js', 'jsx-runtime/index.ts', 'jsx-dev-runtime/index.ts'],
      reporter: ['text', 'html', 'json', 'json-summary'],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
