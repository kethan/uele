import { defineConfig } from 'vitest/config';
import source from './vitest.config.js';

// Run the existing assertions unchanged against the actual distributable modules.
// Source coverage remains a separate, mandatory 100% gate.
const path = file => new URL(file, import.meta.url).pathname;
export default defineConfig({
  test: {
    projects: ['es.js', 'cjs'].map(format => ({
      resolve: {
        alias: [
          { find: /^(?:\.\.\/)+src\/index\.js$/, replacement: path(`./dist/index.${format}`) },
          { find: /^(?:\.\.\/)+lite\/index\.js$/, replacement: path(`./lite/dist/index.${format}`) },
          ...['jsx-runtime', 'jsx-dev-runtime'].map(folder => ({
            find: new RegExp(`^(?:\\.\\.\\/)+${folder}/index\\.ts$`),
            replacement: path(`./${folder}/dist/index.${format}`),
          })),
          { find: /^uele$/, replacement: path(`./dist/index.${format}`) },
        ],
      },
      test: {
        ...source.test,
        name: format,
        coverage: { enabled: false },
        // Native require() inside JSX must share the same CJS instance as imports.
        server: { deps: { external: [/\/dist\/index\.cjs$/] } },
      },
    })),
  },
});
