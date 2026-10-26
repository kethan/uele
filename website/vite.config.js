import { defineConfig } from "vite";

// The docs site is a plain vanilla SPA. uele itself is served to playground
// iframes from /public (see scripts/bundle.mjs), so no framework plugins needed.
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    // the sandbox serves the app through a generated proxy hostname
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: "dist-site",
    sourcemap: false,
  },
});
