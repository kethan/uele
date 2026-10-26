/**
 * Validates every live example in the docs (doc-page `jsx live` fences, the
 * gallery and the home hero) by compiling and running the SAME module graph
 * the iframe import map assembles:
 *
 *   1. esbuild bundles each example with uele's automatic JSX runtime
 *   2. an alias plugin resolves every "uele*" specifier to the real repo
 *      source; signal packages resolve from website/node_modules — so the
 *      bundled module shares one uele `api`, exactly like the iframe
 *   3. the self-contained bundle executes under linkedom
 *   4. buttons are clicked, fields filled and forms submitted to exercise
 *      signal writes, hook actions and diff presets
 *
 * Exits non-zero on the first failure.
 */
import { build } from "esbuild";
import { parseHTML } from "linkedom";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repo = resolve(root, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { PAGES } = await import(resolve(root, "src", "content", "pages", "index.js"));
const { EXAMPLES } = await import(resolve(root, "src", "content", "examples.js"));
const home = await import(resolve(root, "src", "content", "home.js"));

const cases = [];
for (const [slug, page] of Object.entries(PAGES)) {
  for (const m of page.markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g)) {
    cases.push({ name: `docs:${slug}`, code: m[1] });
  }
}
for (const ex of EXAMPLES) cases.push({ name: `example:${ex.id}`, code: ex.code });
cases.push({ name: "home:hero", code: home.HERO_CODE });

// playground specifier -> real source in this repository
const ALIAS = {
  uele: resolve(repo, "src", "index.js"),
  "uele/jsx-runtime": resolve(repo, "jsx-runtime", "index.ts"),
  "uele/reactive": resolve(repo, "reactive", "index.js"),
  "uele/hooks": resolve(repo, "hooks", "index.js"),
  "uele/adapters/preact": resolve(repo, "adapters", "preact.js"),
  "uele/adapters/ulive": resolve(repo, "adapters", "ulive.js"),
  "uele/diffs/rebuild": resolve(repo, "diffs", "rebuild.js"),
  "uele/diffs/udomdiff": resolve(repo, "diffs", "udomdiff.js"),
};

const aliasPlugin = (code) => ({
  name: "uele-playground-alias",
  setup(build) {
    build.onResolve({ filter: /^uele(?:\/[\w-]+)*$/ }, (args) =>
      ALIAS[args.path] ? { path: ALIAS[args.path] } : undefined
    );
    build.onResolve({ filter: /^entry\.jsx$/ }, () => ({
      path: "entry.jsx",
      namespace: "virt",
    }));
    build.onLoad({ filter: /.*/, namespace: "virt" }, () => ({
      contents: code,
      loader: "jsx",
      resolveDir: root,
    }));
  },
});

async function bundleExample(code) {
  const result = await build({
    entryPoints: ["entry.jsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    jsxImportSource: "uele",
    plugins: [aliasPlugin(code)],
    nodePaths: [resolve(root, "node_modules")],
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runCase({ name, code }) {
  const dom = parseHTML("<!doctype html><html><body></body></html>");
  const { window, document, Node, Event } = dom;
  Object.assign(globalThis, {
    window,
    document,
    Node,
    Event,
    CustomEvent: dom.CustomEvent || Event,
    alert: () => {},
  });

  const bundled = await bundleExample(code);
  const url = "data:text/javascript;base64," + Buffer.from(bundled, "utf8").toString("base64");
  await import(url);

  // let promises, debounces, async iterables and lazy components settle
  await sleep(1800);

  // exercise every interactive element once
  for (const btn of document.querySelectorAll("button")) {
    btn.click();
    await sleep(4);
  }
  for (const field of document.querySelectorAll("input, textarea")) {
    if (field.type === "checkbox") field.checked = !field.checked;
    else if (field.type !== "color" && field.type !== "range") field.value = "test input";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(4);
  }
  for (const form of document.querySelectorAll("form")) {
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await sleep(4);
  }
  await sleep(500); // debounced effects (e.g. useDebounce) get a chance to flush

  if (!document.body.children.length) throw new Error("rendered an empty <body>");
  if (document.body.innerHTML.includes("[object")) {
    throw new Error("a node array was stringified — wrap useLive regions in JSX instead of appending them raw");
  }
  return document.body.children.length;
}

let failed = 0;
for (const c of cases) {
  try {
    const nodes = await runCase(c);
    console.log(`  ✓ ${c.name} (${nodes} root node${nodes === 1 ? "" : "s"})`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${c.name}\n    ${err.stack || err}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} examples passed`);
process.exit(failed ? 1 : 0);
