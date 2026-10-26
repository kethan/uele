/**
 * Bundles the local uele source (../src/index.js) into a single browser-ready
 * ESM file at public/uele.js, inlining its `usub` dependency. Playground
 * iframes load this file through an import map, so live examples run the exact
 * library code in this repository — no CDN, no network required.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public");
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "..", "src", "index.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  outfile: resolve(outDir, "uele.js"),
  legalComments: "none",
  // the entry lives in ../../src and imports "usub"; resolve it from here
  nodePaths: [resolve(root, "node_modules")],
});

console.log("bundled uele -> website/public/uele.js");
