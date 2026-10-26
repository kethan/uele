/**
 * Bundles everything the playground iframes can import into public/:
 *
 *   public/uele.js                 core library (usub inlined, self-contained)
 *   public/vendor/*.js             uele subpaths + signal libraries, built with
 *                                  their bare imports EXTERNALIZED — the iframe
 *                                  import map resolves each specifier to a data
 *                                  URL, so every module shares one uele instance
 *
 * Playground examples therefore run the exact library code in this repository
 * plus real npm signal packages, with no CDN or network at runtime.
 */
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, readFileSync, existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repo = resolve(root, "..");
const outDir = resolve(root, "public");
const vendorDir = resolve(outDir, "vendor");
mkdirSync(vendorDir, { recursive: true });

const require = createRequire(import.meta.url);
const npm = (spec) => require.resolve(spec);

// Resolve a package's real ESM entry: the CJS `main` only yields a default
// export, which breaks named imports in the browser's import map.
const esmEntry = (spec) => {
  let dir = dirname(require.resolve(spec));
  let pkg;
  while (dir !== dirname(dir)) {
    const candidate = resolve(dir, "package.json");
    if (existsSync(candidate)) {
      pkg = JSON.parse(readFileSync(candidate, "utf8"));
      break;
    }
    dir = dirname(dir);
  }
  const exp = pkg.exports?.["."];
  const entry =
    (typeof exp === "object" && (exp.import || exp.browser?.import || exp.browser)) ||
    pkg.module ||
    pkg.main;
  return resolve(dir, typeof entry === "object" ? entry.import : entry);
};

// bare specifiers the iframe import map knows how to resolve
const external = [
  "uele",
  "uele/reactive",
  "uele/hooks",
  "uele/adapters/preact",
  "uele/adapters/ulive",
  "uele/diffs/rebuild",
  "uele/diffs/udomdiff",
  "@preact/signals-core",
  "ulive",
  "udomdiff",
];

const shared = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  legalComments: "none",
  logLevel: "info",
};

// 1. core: fully self-contained (usub is inlined, not externalized)
await build({
  ...shared,
  entryPoints: [resolve(repo, "src", "index.js")],
  outfile: resolve(outDir, "uele.js"),
  nodePaths: [resolve(root, "node_modules")],
});

// 2. uele subpaths: bare imports stay bare for the iframe import map
await build({
  ...shared,
  external,
  entryPoints: [
    { in: resolve(repo, "reactive", "index.js"), out: "vendor/reactive" },
    { in: resolve(repo, "hooks", "index.js"), out: "vendor/hooks" },
    { in: resolve(repo, "adapters", "preact.js"), out: "vendor/adapter-preact" },
    { in: resolve(repo, "adapters", "ulive.js"), out: "vendor/adapter-ulive" },
    { in: resolve(repo, "diffs", "rebuild.js"), out: "vendor/diff-rebuild" },
    { in: resolve(repo, "diffs", "udomdiff.js"), out: "vendor/diff-udomdiff" },
  ],
  outdir: outDir,
  nodePaths: [resolve(root, "node_modules")],
});

// 3. npm libraries, bundled whole so they have no bare imports.
//    Signals use their ESM entries so named exports survive; udomdiff is
//    CJS-only and only ever default-imported, so its interop wrapper is fine.
await build({
  ...shared,
  entryPoints: [
    { in: esmEntry("@preact/signals-core"), out: "vendor/signals-core" },
    { in: esmEntry("ulive"), out: "vendor/ulive" },
    { in: npm("udomdiff"), out: "vendor/udomdiff" },
  ],
  outdir: outDir,
  nodePaths: [resolve(root, "node_modules")],
});

console.log("bundled playground modules -> website/public (uele.js + vendor/)");
