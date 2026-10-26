/**
 * End-to-end replica of the browser iframe execution path:
 *
 *   1. every public/ module (core + vendor) is loaded and turned into a
 *      data: URL, rewriting the bare imports INSIDE vendor files to the same
 *      URLs — exactly the graph the iframe import map assembles
 *   2. each example is compiled with Babel's automatic runtime, the same
 *      transform the playground editor runs
 *   3. its specifiers are rewritten to those data URLs and it executes under
 *      linkedom
 *
 * This catches failures the esbuild alias harness cannot: wrong module
 * formats (CJS-only default exports), missing named exports, import-map
 * coverage gaps, and Babel-specific codegen issues.
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

// --- assemble the data-URL module graph -----------------------------------
const sources = {};
for (const [spec, path] of Object.entries(VENDOR_MODULES)) {
  sources[spec] = readFileSync(resolve(root, "public", path.slice(1)), "utf8");
}

// rewrite only real import/export-from statements — never string contents
const rewriteImports = (code, map) =>
  code.replace(
    /((?:^|\n)\s*(?:import|export)\b[^"\n]*?from\s*)"([^"]+)"/g,
    (m, head, spec) => (map[spec] ? `${head}"${map[spec]}"` : m)
  );

// Build a FRESH module graph per run, keyed by a unique media-type parameter.
// This mirrors the browser, where every playground iframe gets its own srcdoc
// and therefore its own module instances — so a preset mutating `api` in one
// example can never leak into the next one.
let runId = 0;
const buildGraph = () => {
  const tag = `r${++runId}`;
  const enc = (code) =>
    `data:text/javascript;x=${tag};base64,` + Buffer.from(code, "utf8").toString("base64");
  const cache = new Map();
  const buildUrl = (spec) => {
    if (cache.has(spec)) return cache.get(spec);
    if (CORE_SPECS.has(spec)) {
      const url = enc(sources["uele"] + FOOTER);
      cache.set(spec, url);
      return url;
    }
    const deps = [...sources[spec].matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    const map = Object.fromEntries(deps.map((dep) => [dep, buildUrl(dep)]));
    const url = enc(rewriteImports(sources[spec], map));
    cache.set(spec, url);
    return url;
  };
  return Object.fromEntries(Object.keys(VENDOR_MODULES).map((s) => [s, buildUrl(s)]));
};

const babelCompile = (code) =>
  Babel.transform(code, {
    presets: [["react", { runtime: "automatic", importSource: "uele" }]],
    filename: "playground.jsx",
    babelrc: false,
    configFile: false,
    sourceType: "module",
  }).code;

const runInDom = async (code) => {
  const urls = buildGraph();
  const rewired = rewriteImports(babelCompile(code), urls);
  const unmapped = [...rewired.matchAll(/from\s+"([^"]+)"/g)].filter((m) => !m[1].startsWith("data:"));
  if (unmapped.length) throw new Error(`unmapped imports: ${unmapped.map((m) => m[1]).join(", ")}`);

  const dom = parseHTML("<!doctype html><html><body></body></html>");
  // linkedom ships HTMLSelectElement.value as a getter-only accessor; in strict
  // module code assigning it (uele's reactive value binding does exactly this)
  // throws "only a getter". Real browsers always have a setter, so give the
  // fixture a spec-shaped value/selectedIndex bridge before examples run.
  const selectProto = dom.window.HTMLSelectElement?.prototype;
  if (selectProto && !Object.getOwnPropertyDescriptor(selectProto, "value")?.set) {
    Object.defineProperty(selectProto, "value", {
      configurable: true,
      get() {
        const option = this.options && this.options[this.selectedIndex];
        return option ? option.value : "";
      },
      set(next) {
        const idx = Array.from(this.options || []).findIndex(
          (o) => o.value === String(next)
        );
        if (idx >= 0) this.selectedIndex = idx;
      },
    });
  }
  // linkedom omits location/history; uele/router reads pathname on mount and
  // calls history.pushState on in-app navigation. Browsers always have both.
  if (!dom.window.location) dom.window.location = new URL("http://localhost/");
  if (!dom.window.history)
    dom.window.history = {
      state: null,
      pushState: () => {},
      replaceState: () => {},
      go: () => {},
      back: () => {},
      forward: () => {},
    };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.document,
    Node: dom.Node,
    Event: dom.Event,
    CustomEvent: dom.CustomEvent || dom.Event,
    alert: () => {},
  });
  const dataUrl = "data:text/javascript;base64," + Buffer.from(rewired, "utf8").toString("base64");
  await import(dataUrl);
  return dom;
};

// --- gather every live example ---------------------------------------------
const { PAGES } = await import(resolve(root, "src", "content", "pages", "index.js"));
const { EXAMPLES } = await import(resolve(root, "src", "content", "examples.js"));
const { HERO_CODE } = await import(resolve(root, "src", "content", "home.js"));
const cases = [
  ...EXAMPLES.map((e) => ({ name: `example:${e.id}`, code: e.code })),
  { name: "home:hero", code: HERO_CODE },
  ...Object.entries(PAGES).flatMap(([slug, p]) =>
    [...p.markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g)].map((m) => ({
      name: `docs:${slug}`,
      code: m[1],
    }))
  ),
];

let failures = 0;
for (const c of cases) {
  try {
    const dom = await runInDom(c.code);
    await sleep(300);
    if (!dom.document.body.children.length) throw new Error("empty body");
    if (dom.document.body.innerHTML.includes("[object")) throw new Error("stringified node array");
    console.log(`  ✓ ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${c.name}\n    ${err.message.split("\n")[0]}`);
  }
}

// --- behavioral assertions through the real browser module graph ----------
const behavioral = [];
const test = (name, fn) => behavioral.push({ name, fn });
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const click = async (dom, sel) => {
  dom.document.querySelector(sel).click();
  await sleep(20);
};

test("preact signals named imports resolve and update", async () => {
  const dom = await runInDom(`
    import { h } from "uele";
    import { usePreactSignals } from "uele/adapters/preact";
    import { Signal, signal, computed } from "@preact/signals-core";
    usePreactSignals();
    const count = signal(0);
    const zero = computed(() => count.value === 0);
    document.body.append(
      <main>
        <span id="n">{count}</span>
        <button id="b" disabled={zero} onClick={() => (count.value += 1)}>+1</button>
      </main>
    );
  `);
  assert(dom.document.querySelector("#n").textContent === "0", "initial render");
  await click(dom, "#b");
  assert(dom.document.querySelector("#n").textContent === "1", "cell updated");
  assert(dom.document.querySelector("#b").disabled === false, "prop flipped");
});

test("ulive named imports (batch) resolve and update", async () => {
  const dom = await runInDom(`
    import { h } from "uele";
    import { useUlive } from "uele/adapters/ulive";
    import { signal, batch } from "ulive";
    useUlive();
    const a = signal(1), b = signal(2);
    document.body.append(
      <main>
        <span id="s">{a}</span>
        <button id="b" onClick={() => batch(() => { a.value = 10; b.value = 20; })}>go</button>
      </main>
    );
  `);
  await click(dom, "#b");
  assert(dom.document.querySelector("#s").textContent === "10", "batched write rendered");
});

test("promise child resolves into the region", async () => {
  const dom = await runInDom(`
    import { h } from "uele";
    const p = new Promise((res) => setTimeout(() => res(<strong id="loaded">DONE</strong>), 30));
    document.body.append(<main><p id="wait">waiting</p>{p}</main>);
  `);
  await sleep(300);
  assert(!!dom.document.querySelector("#loaded"), "promise resolved content rendered");
});

test("async component resolves", async () => {
  const dom = await runInDom(`
    import { h } from "uele";
    const C = async () => { await new Promise((r) => setTimeout(r, 30)); return <em id="loaded">ASYNC</em>; };
    document.body.append(<main><C /></main>);
  `);
  await sleep(300);
  assert(!!dom.document.querySelector("#loaded"), "async component rendered");
});

// --- content contracts: what must be visible WITHOUT any click ------------
// These encode the reported regressions — blank initial renders, missing
// default panels, invisible boolean state — so they cannot come back.
// Self-contained replicas of the docs' mount-time patterns. Every contract
// must pass WITHOUT a single click — that is what guards against the
// setter-before-mount regression where regions were blank on first paint.
const contracts = [
  {
    name: "attributes example shows the enabled button before any toggle",
    code: `
      import { h, useLive } from "uele";
      let disabled = false;
      const build = () => <button disabled={disabled}>{disabled ? "Disabled" : "Enabled"} button</button>;
      const [view, setView] = useLive(build());
      document.body.append(<main>{view}</main>);
    `,
    expect: (dom) =>
      dom.document.body.textContent.includes("Enabled") &&
      dom.document.querySelector("button").disabled === false,
  },
  {
    name: "class/style card is visible on mount",
    code: `
      import { h, useLive } from "uele";
      let featured = false;
      const build = () => <section className={{ card: true, featured }}><h3>Class + style maps</h3></section>;
      const [card] = useLive(build());
      document.body.append(<main>{card}</main>);
    `,
    expect: (dom) => dom.document.body.textContent.includes("Class + style maps"),
  },
  {
    name: "ref fills the input and reports status on mount",
    code: `
      import { h } from "uele";
      const status = <p>waiting for ref…</p>;
      document.body.append(
        <main>
          <input ref={(el) => { el.value = "filled by the ref"; status.textContent = "ref ran"; }} />
          {status}
        </main>
      );
    `,
    expect: (dom) =>
      dom.document.querySelector("input")?.value === "filled by the ref" &&
      dom.document.body.textContent.includes("ref ran"),
  },
  {
    name: "forms show the em-dash placeholder and update on submit",
    code: `
      import { h, useLive } from "uele";
      const [submitted, setSubmitted] = useLive("—");
      let draft = "";
      document.body.append(
        <main>
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(draft || "—"); }}>
            <input placeholder="m" onInput={(e) => (draft = e.target.value)} />
            <button type="submit">Send</button>
          </form>
          <p>Last message: <strong>{submitted}</strong></p>
        </main>
      );
    `,
    expect: async (dom) => {
      if (!dom.document.body.textContent.includes("—")) return false;
      const input = dom.document.querySelector("input");
      input.value = "hello";
      input.dispatchEvent(new dom.Event("input", { bubbles: true }));
      dom.document.querySelector("form").dispatchEvent(new dom.Event("submit", { cancelable: true, bubbles: true }));
      await sleep(20);
      return dom.document.body.textContent.includes("hello");
    },
  },
  {
    name: "checkbox agreement state is visible text and flips",
    code: `
      import { h, useLive } from "uele";
      const [agreed, setAgreed] = useLive("no");
      document.body.append(
        <main>
          <input type="checkbox" onChange={(e) => setAgreed(e.target.checked ? "yes" : "no")} />
          <p>Agreed: <strong>{agreed}</strong></p>
        </main>
      );
    `,
    expect: async (dom) => {
      if (!dom.document.body.textContent.includes("Agreed: no")) return false;
      const box = dom.document.querySelector('input[type="checkbox"]');
      box.checked = true;
      box.dispatchEvent(new dom.Event("change", { bubbles: true }));
      await sleep(20);
      return dom.document.body.textContent.includes("Agreed: yes");
    },
  },
  {
    name: "Switch renders its default (home) panel on mount",
    code: `
      import { h, useLive, Switch, Match } from "uele";
      let route = "home";
      const build = () => (
        <Switch fallback={<p>404</p>}>
          <Match when={route === "home"}><p>Home page</p></Match>
          <Match when={route === "about"}><p>About page</p></Match>
        </Switch>
      );
      const [view] = useLive(build());
      document.body.append(<main><section>{view}</section></main>);
    `,
    expect: (dom) => dom.document.body.textContent.includes("Home page"),
  },
  {
    name: "Dynamic renders its default component on mount",
    code: `
      import { h, useLive, Dynamic } from "uele";
      const Red = ({ label }) => <p>{label}</p>;
      const [slot] = useLive(<Dynamic component={Red} label="Swapped at runtime" />);
      document.body.append(<main>{slot}</main>);
    `,
    expect: (dom) => dom.document.body.textContent.includes("Swapped at runtime"),
  },
  {
    name: "interactive task list shows its two initial tasks",
    code: EXAMPLES.find((e) => e.id === "todos").code,
    expect: (dom) => dom.document.querySelectorAll("li").length === 2,
  },
  {
    name: "gallery tabs render the first panel on mount",
    code: EXAMPLES.find((e) => e.id === "tabs").code,
    expect: (dom) => dom.document.body.textContent.includes("first tab"),
  },
  {
    name: "gallery swatch renders the color block on mount",
    code: EXAMPLES.find((e) => e.id === "swatch").code,
    expect: (dom) => !!dom.document.querySelector("code") && dom.document.body.textContent.includes("#635bff"),
  },
  {
    name: "gallery diff-shuffle renders six cards on mount",
    code: EXAMPLES.find((e) => e.id === "diff-shuffle").code,
    expect: (dom) => dom.document.querySelectorAll("li").length === 6,
  },
  {
    name: "like-post subtree renders before any click",
    code: `
      import { h, useLive } from "uele";
      let liked = false;
      const build = () => <article><p>{liked ? "liked" : "Not liked yet"}</p></article>;
      const [card] = useLive(build());
      document.body.append(<main>{card}</main>);
    `,
    expect: (dom) => dom.document.body.textContent.includes("Not liked yet"),
  },
];

for (const c of contracts) {
  try {
    const dom = await runInDom(c.code);
    const ok = await c.expect(dom);
    if (!ok) throw new Error("content contract failed");
    console.log(`  ✓ contract: ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ contract: ${c.name}\n    ${err.message.split("\n")[0]}`);
  }
}

for (const t of behavioral) {
  try {
    await t.fn();
    console.log(`  ✓ behavior: ${t.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ behavior: ${t.name}\n    ${err.message}`);
  }
}

// --- the actual async-page examples must settle in the real module graph ---
const asyncFences = [
  ...PAGES.async.markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g),
].map((m) => m[1]);
const asyncContracts = [
  { i: 0, find: "Loaded after a moment", wait: 1200, name: "promise child swaps in its resolved value" },
  { i: 1, find: "Lovelace", wait: 1200, name: "async component renders after awaiting" },
  { i: 2, find: /Tick \d of 5/, wait: 1200, name: "async iterable streams values into the region" },
  { i: 3, find: "Seconds:", wait: 1200, name: "observable emits into the region" },
  { i: 4, find: "lazy component", wait: 1400, name: "lazy component replaces its fallback" },
];
for (const c of asyncContracts) {
  try {
    const dom = await runInDom(asyncFences[c.i]);
    await sleep(c.wait);
    const text = dom.document.body.textContent;
    const found = c.find instanceof RegExp ? c.find.test(text) : text.includes(c.find);
    if (!found) {
      throw new Error(`"${c.find}" never rendered; body: ${text.slice(0, 120)}`);
    }
    console.log(`  ✓ async: ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ async: ${c.name}\n    ${err.message.split("\n")[0]}`);
  }
}

// --- UI Kit fences: every uele/ui family must render its content on mount --
// Contracts run the ACTUAL fences shipped on the UI Kit page (no copied code),
// so a rewrite of an example can never silently drift from what is asserted.
const uiFences = [
  ...PAGES["ui-kit"].markdown.matchAll(/```jsx live[^\n]*\n([\s\S]*?)```/g),
].map((m) => m[1]);
const uiContracts = [
  {
    name: "ui kit: buttons, badges and indicators render",
    text: ["Solid", "Active", "Saving your changes…", "Selected view: grid"],
  },
  {
    name: "ui kit: form controls bind cells on mount",
    text: ["Sign up", "Volume", "How do you rate uele?"],
    check: (dom) =>
      dom.document.querySelector("input")?.value === "Ada Lovelace" &&
      dom.document.querySelectorAll("select option").length === 3,
  },
  {
    name: "ui kit: advanced inputs render with empty state",
    text: ["Drop files here, or click to browse", "Picked 0 file(s)"],
  },
  {
    name: "ui kit: pickers, calendar and editable render",
    text: ["Listbox", "Svelte", "Date picker", "Untitled document"],
  },
  {
    name: "ui kit: layout and typography primitives render",
    text: [
      "Typography & layout",
      "16:9 media slot",
      "Scroll row 1",
      "Skip to content",
      "Real DOM nodes, no virtual DOM",
    ],
  },
  {
    name: "ui kit: feedback components render",
    text: ["All systems operational", "No notifications", "129"],
  },
  {
    name: "ui kit: data table, plain table and virtual list render",
    text: ["Tokyo", "uele/ui", "Row 1"],
  },
  {
    name: "ui kit: tree, timeline, countdown and carousel render",
    text: ["Release history", "ui-kit.js", "Slide one", "nothing yet"],
  },
  {
    name: "ui kit: navigation components render their initial state",
    text: ["Overview panel", "Current step: 1 of 3", "Page 1"],
  },
  {
    name: "ui kit: accordion, collapsible and wizard render",
    text: [
      "Frequently asked questions",
      "Do playgrounds work offline?",
      "Show advanced details",
      "Step one: create your profile.",
    ],
  },
  {
    name: "ui kit: overlay triggers render while panels stay closed",
    text: [
      "Open dialog",
      "Open drawer",
      "Delete account",
      "Account menu",
      "Open palette (⌘K)",
      "Last action: none yet",
    ],
    check: (dom) =>
      dom.document.querySelectorAll('[data-uele-overlay]').length === 0,
  },
  {
    name: "ui kit: toaster renders empty until a toast is pushed",
    text: ["Show toast", "Show error toast"],
    check: (dom) =>
      dom.document.querySelectorAll("[data-uele-toast]").length === 0,
  },
  {
    name: "ui kit: app shell renders with light theme",
    text: ["Dashboard", "Acme", "Switch to dark", "Appearance: light"],
    check: (dom) =>
      dom.document.querySelector("[data-uele-app-shell]") &&
      dom.document.querySelector('[data-theme="light"]'),
  },
  {
    name: "ui kit: router resolves the home path on mount",
    text: [],
    // the initial cell is transient; useRouter() resolves "/" on a microtask
    check: async (dom) => {
      await sleep(80);
      const text = dom.document.body.textContent;
      return (
        text.includes("Home route") &&
        !!dom.document.querySelector('a[href="/about"]')
      );
    },
  },
];
for (let i = 0; i < uiContracts.length; i++) {
  const c = uiContracts[i];
  try {
    const dom = await runInDom(uiFences[i]);
    const text = dom.document.body.textContent;
    const missing = c.text.filter((needle) => !text.includes(needle));
    if (missing.length) throw new Error(`missing text: ${missing.join(", ")}`);
    if (c.check && !(await c.check(dom))) throw new Error("custom check failed");
    console.log(`  ✓ contract: ${c.name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ contract: ${c.name}\n    ${err.message.split("\n")[0]}`);
  }
}

const totalChecks =
  cases.length +
  contracts.length +
  behavioral.length +
  asyncContracts.length +
  uiContracts.length;
console.log(`\n${failures ? "FAILED" : "OK"} — ${failures} failure(s) across ${totalChecks} checks`);
process.exit(failures ? 1 : 0);
