import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

// The docs site is itself built WITH uele: every "uele*" import in the app
// source resolves to the real library code in the repository above, so the
// site dogfoods the same modules the playgrounds bundle.
const ueleAliases = [
  { find: /^uele$/, replacement: resolve(repo, "src", "index.js") },
  { find: /^uele\/jsx-runtime$/, replacement: resolve(repo, "jsx-runtime", "index.ts") },
  // dev builds request the -dev-runtime entry; the package's runtime already
  // exports jsxDEV, so point both specifiers at the same source
  { find: /^uele\/jsx-dev-runtime$/, replacement: resolve(repo, "jsx-runtime", "index.ts") },
  { find: /^uele\/ui$/, replacement: resolve(repo, "ui", "index.js") },
  { find: /^uele\/themes$/, replacement: resolve(repo, "themes", "index.js") },
  { find: /^uele\/reactive$/, replacement: resolve(repo, "reactive", "index.js") },
  { find: /^uele\/hooks$/, replacement: resolve(repo, "hooks", "index.js") },
  { find: /^uele\/adapters\/(\w[\w-]*)$/, replacement: resolve(repo, "adapters", "$1.js") },
  { find: /^uele\/diffs\/(\w[\w-]*)$/, replacement: resolve(repo, "diffs", "$1.js") },
];

export default defineConfig({
  // automatic JSX runtime backed by uele's jsx-runtime
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "uele",
  },
  resolve: { alias: ueleAliases },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    // the sandbox serves the app through a generated proxy hostname
    allowedHosts: true,
    // app source imports library files from the repository parent directory
    fs: { allow: [here, repo] },
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
