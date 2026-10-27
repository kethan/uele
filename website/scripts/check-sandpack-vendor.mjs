/**
 * Verifies the self-hosted Sandpack bundler without a browser: the
 * public/sandpack artifact exists, its root-absolute webpack paths were
 * relativized (required for the /sandpack/ sub-path), and the client
 * package exposes the loader the runner uses.
 *
 * Actual bundler execution (workers, iframe postMessage) cannot run under
 * linkedom; the built-in srcdoc engine remains the one covered by the
 * executable example contracts.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { VENDOR_MODULES } from "../src/lib/vendor-manifest.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dir = resolve(root, "public", "sandpack");
const failures = [];
const check = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
};

check(existsSync(join(dir, "index.html")), "bundler index.html is vendored");
check(
  readdirSync(dir).some((f) => f.includes("babel-transpiler") && f.endsWith(".worker.js")),
  "babel transpiler worker is present"
);

const indexHtml = existsSync(join(dir, "index.html"))
  ? readFileSync(join(dir, "index.html"), "utf8")
  : "";
check(
  !/(?:src|href)="\/(?!\/)/.test(indexHtml),
  "index.html uses relative (sub-path safe) asset references"
);

// walk every JS file: the webpack publicPath must no longer point at root
let jsFiles = 0;
let badPublicPath = 0;
let rootStaticRefs = 0;
const walk = (d) => {
  for (const entry of readdirSync(d)) {
    const p = join(d, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) {
      jsFiles++;
      const text = readFileSync(p, "utf8");
      if (text.includes('.p="/"')) badPublicPath++;
      if (text.includes('"/static/')) rootStaticRefs++;
    }
  }
};
walk(dir);
check(jsFiles > 20, `bundler JS assets present (${jsFiles} files scanned)`);
check(badPublicPath === 0, "no webpack publicPath=\"/\" remains (sub-path workers would 404)");
check(rootStaticRefs === 0, 'no root-absolute "/static/" asset strings remain');

const require = createRequire(import.meta.url);
const clientEntry = require.resolve("@codesandbox/sandpack-client");
const clientPkg = resolve(dirname(clientEntry), "..", "package.json");
const pkg = JSON.parse(readFileSync(clientPkg, "utf8"));
check(pkg.exports?.["."]?.import, "sandpack-client exposes a browser ESM entry");

// every spec the runner virtualizes must have a fetched vendor bundle
check(
  Object.keys(VENDOR_MODULES).length >= 12,
  `vendor manifest still covers the playground modules (${Object.keys(VENDOR_MODULES).length} specs)`
);

console.log(failures.length ? `\nFAILED — ${failures.length} check(s)` : "\nOK — 0 failure(s)");
process.exit(failures.length ? 1 : 0);
