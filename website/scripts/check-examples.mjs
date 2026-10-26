/**
 * Validates every live example in the docs (doc-page `jsx live` fences, the
 * gallery and the home hero) the same way the browser playground does:
 *
 *   1. Babel compiles the JSX with uele's automatic runtime
 *   2. import declarations are rewritten against the locally bundled uele
 *   3. the code executes inside a linkedom DOM with the real uele bundle
 *   4. every button is clicked and every field exercised to flush out
 *      runtime errors in handlers
 *
 * Exits non-zero on the first failure.
 */
import Babel from "@babel/standalone";
import { parseHTML } from "linkedom";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ueleNS = await import(resolve(here, "..", "public", "uele.js"));
const rtNS = await import(resolve(here, "..", "public", "jsx-runtime.js"));
const { PAGES } = await import(resolve(here, "..", "src", "content", "pages", "index.js"));
const { EXAMPLES } = await import(resolve(here, "..", "src", "content", "examples.js"));
const home = await import(resolve(here, "..", "src", "content", "home.js"));

const cases = [];
for (const [slug, page] of Object.entries(PAGES)) {
  for (const m of page.markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g)) {
    cases.push({ name: `docs:${slug}`, code: m[1] });
  }
}
for (const ex of EXAMPLES) cases.push({ name: `example:${ex.id}`, code: ex.code });
cases.push({ name: "home:hero", code: home.HERO_CODE });

function compile(code) {
  const transformed = Babel.transform(code, {
    presets: [["react", { runtime: "automatic", importSource: "uele" }]],
    filename: "playground.jsx",
    babelrc: false,
    configFile: false,
    sourceType: "module",
  }).code;

  // rewrite ESM imports into destructuring from the pre-imported namespaces
  return transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*"(uele(?:\/jsx-runtime)?)";?/g,
    (_, names, spec) =>
      `const {${names.replace(/\s+as\s+/g, ": ")}} = ${
        spec === "uele" ? "ueleNS" : "rtNS"
      };`
  );
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runCase({ name, code }) {
  const dom = parseHTML("<!doctype html><html><body></body></html>");
  const { window, document, Node, Event, CustomEvent, MouseEvent } = dom;
  // the uele bundle reads DOM APIs as ambient globals
  globalThis.window = window;
  globalThis.document = document;
  globalThis.Node = Node;
  globalThis.Event = Event;
  globalThis.CustomEvent = CustomEvent || Event;
  globalThis.MouseEvent = MouseEvent || Event;
  globalThis.alert = () => {};
  const compiled = compile(code);

  const fn = new AsyncFunction(
    "window", "document", "Node", "Event", "ueleNS", "rtNS",
    "alert", "setTimeout", "setInterval", "clearTimeout", "clearInterval",
    compiled
  );

  await fn(
    window, document, Node, Event, ueleNS, rtNS,
    globalThis.alert, setTimeout, setInterval, clearTimeout, clearInterval
  );

  // let promises / async iterables / lazy components settle
  await sleep(2000);

  // exercise every interactive element once
  for (const btn of document.querySelectorAll("button")) {
    btn.click();
    await sleep(5);
  }
  for (const field of document.querySelectorAll("input, textarea")) {
    if (field.type === "checkbox") field.checked = !field.checked;
    else if (field.type !== "color" && field.type !== "range") field.value = "test input";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(5);
  }
  for (const form of document.querySelectorAll("form")) {
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await sleep(5);
  }

  if (!document.body.children.length) {
    throw new Error("rendered an empty <body>");
  }
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
