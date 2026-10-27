/**
 * Vendor the Sandpack *bundler* into public/sandpack so playgrounds can run
 * on Sandpack fully offline — no request to *.codesandbox.io or any CDN.
 *
 * The bundler is the prebuilt static `sandpack/` folder shipped inside the
 * @codesandbox/sandpack-client npm package (the same `www` artifact the
 * official self-hosting guide produces by building the 800 MB
 * codesandbox-client monorepo). We copy it at install time instead of
 * committing ~65 MB of transpiler workers, and patch its hardcoded root-
 * absolute webpack paths so it works under the /sandpack/ sub-path:
 *
 *   - webpack publicPath  .p="/"  -> URL of the bundler's own directory
 *   - "/static/..." asset strings -> "static/..." (relative to the iframe page)
 *   - index.html src/href and the service-worker scope get the same treatment
 *
 * Runtime npm installs still go to the public registry by default; the uele
 * playground runner never needs them because every module is injected as a
 * virtual /node_modules file.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const require = createRequire(import.meta.url);
// the package blocks package.json access via its "exports" map, so resolve
// its entry (dist/index.js) and walk up to the package root
const entry = require.resolve("@codesandbox/sandpack-client");
const pkgRoot = resolve(dirname(entry), "..");
const src = resolve(pkgRoot, "sandpack");
const dest = resolve(root, "public", "sandpack");

if (!existsSync(src)) {
  console.warn(`[vendor-sandpack] bundler not found at ${src} — run "npm install" first; skipping`);
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

const PUBLIC_PATH = '.p="/"';
const PUBLIC_PATH_FIX = '.p=new URL("./",self.location.href).href';
const SW_SCOPE = '{scope:"/"}';
const SW_SCOPE_FIX = '{scope:new URL("./",self.location.href).pathname}';

let patchedFiles = 0;
const walk = (dir, visit) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, visit);
    else visit(path);
  }
};

walk(dest, (path) => {
  if (!/\.(js|json|html|map)$/.test(path)) return;
  let text = readFileSync(path, "utf8");
  const before = text;
  text = text.split(PUBLIC_PATH).join(PUBLIC_PATH_FIX);
  text = text.split(SW_SCOPE).join(SW_SCOPE_FIX);
  // root-absolute asset references -> relative to the bundler page
  text = text.split('"/static/').join('"static/');
  if (path.endsWith("index.html")) {
    text = text.split('href="/').join('href="');
    text = text.split('src="/').join('src="');
  }
  // any other root-absolute URL string -> relative (sub-path safe).
  // skip "/s/..." CodeSandbox sandbox URL patterns (url-generator etc.)
  text = text.replace(/"\/(?!s\/)[a-zA-Z0-9_.-]/g, (m) => '"' + m.slice(2));
  if (text !== before) {
    writeFileSync(path, text);
    patchedFiles++;
  }
});

// --- assertions: the bundler must not retain root-absolute loaders --------
const failures = [];
walk(dest, (path) => {
  if (!/\.(js|html)$/.test(path)) return;
  const text = readFileSync(path, "utf8");
  if (text.includes(PUBLIC_PATH)) failures.push(`${path} still has webpack publicPath "/"`);
  if (path.endsWith("index.html") && /(?:src|href)="\/(?!\/)/.test(text)) {
    failures.push(`${path} still has a root-absolute src/href`);
  }
});

if (failures.length) {
  for (const f of failures) console.error(`[vendor-sandpack] ✗ ${f}`);
  process.exit(1);
}

const count = readdirSync(dest).length;
console.log(`[vendor-sandpack] ✓ vendored Sandpack bundler to public/sandpack (${count} entries, ${patchedFiles} patched files)`);
