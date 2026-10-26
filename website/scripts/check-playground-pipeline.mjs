/**
 * Replicates the browser playground's iframe pipeline as closely as Node
 * allows: Babel output keeps its ESM import declarations, but both uele
 * specifiers are rewritten to the same base64 data-URL module the iframe
 * receives through its import map. The compiled module is then imported as a
 * data URL itself and executed against a linkedom DOM.
 */
import Babel from "@babel/standalone";
import { parseHTML } from "linkedom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FOOTER = `
const jsx = (tag, props = {}) => {
  const { children, key, ...attrs } = props || {};
  return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};
export { jsx, jsx as jsxs, jsx as jsxDev, jsx as jsxDEV, h as Fragment, h as createElement };
`;

const bundle = readFileSync(resolve(here, "..", "public", "uele.js"), "utf8") + FOOTER;
const runtimeUrl = "data:text/javascript;base64," + Buffer.from(bundle, "utf8").toString("base64");

const { EXAMPLES } = await import(resolve(here, "..", "src", "content", "examples.js"));
const { HERO_CODE } = await import(resolve(here, "..", "src", "content", "home.js"));

function compileToDataUrl(code) {
  const transformed = Babel.transform(code, {
    presets: [["react", { runtime: "automatic", importSource: "uele" }]],
    filename: "playground.jsx",
    babelrc: false,
    configFile: false,
    sourceType: "module",
  }).code;
  // exactly what the iframe import map resolves "uele" / "uele/jsx-runtime" to
  const rewired = transformed.replace(
    /from "(uele(?:\/jsx-runtime)?)"/g,
    `from "${runtimeUrl}"`
  );
  return "data:text/javascript;base64," + Buffer.from(rewired, "utf8").toString("base64");
}

const cases = [...EXAMPLES.map((e) => ({ name: e.id, code: e.code })), { name: "hero", code: HERO_CODE }];
let failed = 0;

for (const c of cases) {
  const dom = parseHTML("<!doctype html><html><body></body></html>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.document,
    Node: dom.Node,
    Event: dom.Event,
    alert: () => {},
  });
  try {
    await import(compileToDataUrl(c.code));
    await sleep(1800);
    // click through every button, like a user exploring the preview
    for (const btn of dom.document.querySelectorAll("button")) {
      btn.click();
      await sleep(2);
    }
    if (!dom.document.body.children.length) throw new Error("empty body");
    if (dom.document.body.innerHTML.includes("[object")) throw new Error("stringified node array");
    console.log(`  ✓ iframe-pipeline: ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ iframe-pipeline: ${c.name}\n    ${err.stack || err}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
