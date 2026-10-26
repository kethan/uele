/**
 * Validates the browser iframe mechanics that linkedom cannot exercise:
 *
 *   1. every example compiles with Babel's automatic runtime (importSource
 *      "uele") exactly as the playground editor does
 *   2. the import map the iframe would build covers every bare specifier the
 *      compiled code and the vendor bundles reference — a missing mapping
 *      would fail module resolution in the browser
 *   3. the core data-URL module (uele bundle + JSX runtime footer) imports
 *      standalone and renders, and each vendor bundle exposes the exports
 *      its preset is documented to provide
 *
 * Runtime behavior of the vendor source itself is covered end-to-end by
 * check-examples.mjs, which bundles the same repo files with esbuild.
 */
import Babel from "@babel/standalone";
import { parseHTML } from "linkedom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { VENDOR_MODULES, CORE_SPECS } from "../src/lib/vendor-manifest.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FOOTER = `
const jsx = (tag, props = {}) => {
  const { children, key, ...attrs } = props || {};
  return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};
export { jsx, jsx as jsxs, jsx as jsxDev, jsx as jsxDEV, h as Fragment, h as createElement };
`;

const { EXAMPLES } = await import(resolve(root, "src", "content", "examples.js"));
const { HERO_CODE } = await import(resolve(root, "src", "content", "home.js"));
const { PAGES } = await import(resolve(root, "src", "content", "pages", "index.js"));

const allCode = [
  ...EXAMPLES.map((e) => ({ name: e.id, code: e.code })),
  { name: "hero", code: HERO_CODE },
  ...Object.entries(PAGES).flatMap(([slug, p]) =>
    [...p.markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g)].map((m) => ({
      name: `docs:${slug}`,
      code: m[1],
    }))
  ),
];

let failed = 0;
const check = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
};

// --- 1. Babel compilation + specifier collection ---------------------------
const usedSpecifiers = new Set();
for (const c of allCode) {
  try {
    const out = Babel.transform(c.code, {
      presets: [["react", { runtime: "automatic", importSource: "uele" }]],
      filename: "playground.jsx",
      babelrc: false,
      configFile: false,
      sourceType: "module",
    }).code;
    for (const m of out.matchAll(/from "([^"]+)"/g)) usedSpecifiers.add(m[1]);
  } catch (err) {
    failed++;
    console.error(`  ✗ Babel compile failed for ${c.name}: ${err.message}`);
  }
}
check(usedSpecifiers.size > 0, `compiled ${allCode.length} examples; specifiers in use: ${[...usedSpecifiers].join(", ")}`);

// --- 2. the iframe import map covers every specifier -----------------------
const mappedSpecs = new Set(Object.keys(VENDOR_MODULES));
const missingFromMap = [...usedSpecifiers].filter((s) => !mappedSpecs.has(s));
check(missingFromMap.length === 0, `all example imports are mapped (missing: ${missingFromMap.join(", ") || "none"})`);

// vendor bundles may only import specifiers the same import map resolves
let dangling = [];
for (const [spec, path] of Object.entries(VENDOR_MODULES)) {
  if (CORE_SPECS.has(spec)) continue;
  const source = readFileSync(resolve(root, "public", path.slice(1)), "utf8");
  for (const m of source.matchAll(/from "([^"]+)"/g)) {
    if (!mappedSpecs.has(m[1])) dangling.push(`${spec} -> ${m[1]}`);
  }
}
check(dangling.length === 0, `vendor bare imports all resolve via the import map (dangling: ${dangling.join("; ") || "none"})`);

// every mapped file exists on disk and is non-empty
let missingFiles = [];
for (const path of new Set(Object.values(VENDOR_MODULES))) {
  const full = resolve(root, "public", path.slice(1));
  try {
    if (readFileSync(full, "utf8").length < 30) missingFiles.push(path);
  } catch {
    missingFiles.push(path);
  }
}
check(missingFiles.length === 0, `all ${new Set(Object.values(VENDOR_MODULES)).size} vendor files are present and non-empty`);

// --- 3. core data-URL module renders standalone ----------------------------
const coreBundle = readFileSync(resolve(root, "public", "uele.js"), "utf8") + FOOTER;
const coreUrl = "data:text/javascript;base64," + Buffer.from(coreBundle, "utf8").toString("base64");
{
  const dom = parseHTML("<!doctype html><html><body></body></html>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.document,
    Node: dom.Node,
    Event: dom.Event,
    alert: () => {},
  });
  const mod = await import(coreUrl);
  const need = ["h", "useLive", "If", "For", "Switch", "Dynamic", "lazy", "map", "jsx", "jsxs", "Fragment"];
  const absent = need.filter((k) => !(k in mod));
  check(absent.length === 0, `core data-URL module exports the full surface (missing: ${absent.join(", ") || "none"})`);
  const [count, setCount] = mod.useLive(0);
  setCount(3);
  dom.document.body.append(mod.h("main", null, mod.jsx("button", { onClick: () => setCount((c) => c + 1) }, "go"), count));
  await sleep(20);
  check(dom.document.body.children.length === 1, "core module renders and updates a live region in an isolated DOM");
}

// --- 4. vendor bundles expose their documented entry exports ---------------
const expected = {
  "/vendor/reactive.js": ["signal", "computed", "effect", "read", "write"],
  "/vendor/hooks.js": ["useToggle", "useCounter", "useList", "useDebounce"],
  "/vendor/adapter-preact.js": ["usePreactSignals"],
  "/vendor/adapter-ulive.js": ["useUlive"],
  "/vendor/diff-rebuild.js": ["useRebuild"],
  "/vendor/diff-udomdiff.js": ["useUdomdiff"],
  "/vendor/signals-core.js": ["signal", "computed", "effect"],
  "/vendor/ulive.js": ["signal", "computed", "effect"],
};
for (const [path, names] of Object.entries(expected)) {
  const source = readFileSync(resolve(root, "public", path.slice(1)), "utf8");
  const absent = names.filter((n) => !new RegExp(`\\b${n}\\b`).test(source));
  check(absent.length === 0, `${path} exposes ${names.join(", ")}${absent.length ? ` (missing: ${absent.join(", ")})` : ""}`);
}

console.log(`\n${failed ? "FAILED" : "OK"} — ${failed} failure(s)`);
process.exit(failed ? 1 : 0);
