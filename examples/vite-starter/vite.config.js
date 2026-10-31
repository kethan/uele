import { defineConfig } from 'vite';

const jsx = { runtime: 'automatic', importSource: 'uele' };

export default defineConfig({
  // Vite 8 uses Oxc. No React plugin or React dependency is needed.
  oxc: { jsx },
  // Vite's cold dependency scan has a separate transform configuration.
  optimizeDeps: { rolldownOptions: { transform: { jsx } } },
  // The local uele checkout and this app must share one signal library.
  resolve: { dedupe: ['uele', '@preact/signals-core'] },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app']
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app']
  }
});
