/**
 * Behavioral assertions for the signal/adapter/hook/diff examples. Where
 * check-examples.mjs proves every example mounts and survives clicks, this
 * script asserts the reactive semantics that make those examples worth
 * showing: cells update text and attributes, preset swaps work, hooks mutate
 * their cells, and diff presets keep the right nodes through reorders.
 */
import { build } from "esbuild";
import { parseHTML } from "linkedom";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repo = resolve(root, "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALIAS = {
  uele: resolve(repo, "src", "index.js"),
  "uele/jsx-runtime": resolve(repo, "jsx-runtime", "index.ts"),
  "uele/reactive": resolve(repo, "reactive", "index.js"),
  "uele/hooks": resolve(repo, "hooks", "index.js"),
  "uele/ui": resolve(repo, "ui", "index.js"),
  "uele/themes": resolve(repo, "themes", "index.js"),
  "uele/router": resolve(repo, "router", "index.js"),
  "uele/adapters/preact": resolve(repo, "adapters", "preact.js"),
  "uele/adapters/ulive": resolve(repo, "adapters", "ulive.js"),
  "uele/diffs/rebuild": resolve(repo, "diffs", "rebuild.js"),
  "uele/diffs/udomdiff": resolve(repo, "diffs", "udomdiff.js"),
};

const plugin = (code) => ({
  name: "uele-playground-alias",
  setup(b) {
    b.onResolve({ filter: /^uele(?:\/[\w-]+)*$/ }, (a) =>
      ALIAS[a.path] ? { path: ALIAS[a.path] } : undefined
    );
    b.onResolve({ filter: /^entry\.jsx$/ }, () => ({ path: "entry.jsx", namespace: "virt" }));
    b.onLoad({ filter: /.*/, namespace: "virt" }, () => ({ contents: code, loader: "jsx", resolveDir: root }));
  },
});

const mount = async (code) => {
  const result = await build({
    entryPoints: ["entry.jsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    jsxImportSource: "uele",
    plugins: [plugin(code)],
    nodePaths: [resolve(root, "node_modules")],
    logLevel: "silent",
  });
  const dom = parseHTML("<!doctype html><html><body></body></html>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.document,
    Node: dom.Node,
    Event: dom.Event,
    CustomEvent: dom.CustomEvent || dom.Event,
    alert: () => {},
  });
  const url = "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text, "utf8").toString("base64");
  await import(url);
  await sleep(50);
  return dom;
};

const text = (dom, sel) => dom.document.querySelector(sel)?.textContent.trim();
const click = async (dom, sel) => {
  dom.document.querySelector(sel).click();
  await sleep(20);
};

let failures = 0;
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/* --- preact signals: cell as child AND as a prop ------------------------- */
await test("preact signal updates text and flips disabled", async () => {
  const dom = await mount(`
    import { h } from "uele";
    import { usePreactSignals } from "uele/adapters/preact";
    import { signal, computed } from "@preact/signals-core";
    usePreactSignals();
    const count = signal(0);
    const isZero = computed(() => count.value === 0);
    document.body.append(
      <main>
        <h2 id="n">{count}</h2>
        <button id="minus" disabled={isZero} onClick={() => (count.value -= 1)}>−1</button>
        <button id="plus" onClick={() => (count.value += 1)}>+1</button>
      </main>
    );
  `);
  const { document } = dom;
  assert(text(dom, "#n") === "0", "initial render shows 0");
  assert(document.querySelector("#minus").disabled === true, "minus starts disabled");
  await click(dom, "#plus");
  assert(text(dom, "#n") === "1", "cell child updated to 1");
  assert(document.querySelector("#minus").disabled === false, "disabled prop reactively flipped");
  await click(dom, "#minus");
  assert(text(dom, "#n") === "0", "back to 0");
  assert(document.querySelector("#minus").disabled === true, "disabled prop reactively restored");
});

/* --- uele/reactive portable API through a preset ------------------------ */
await test("uele/reactive writes/computed/effect all run", async () => {
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));
  const dom = await mount(`
    import { h } from "uele";
    import { usePreactSignals } from "uele/adapters/preact";
    import { signal, computed, effect, read, write } from "uele/reactive";
    usePreactSignals();
    const count = signal(0);
    const doubled = computed(() => read(count) * 2);
    effect(() => console.log("eff " + read(count)));
    document.body.append(
      <main>
        <span id="c">{count}</span>
        <span id="d">{doubled}</span>
        <button id="b" onClick={() => write(count, read(count) + 1)}>go</button>
      </main>
    );
  `);
  await click(dom, "#b");
  await sleep(20);
  assert(text(dom, "#c") === "1", "write() updates the rendered cell");
  assert(text(dom, "#d") === "2", "computed re-derived");
  assert(logs.some((l) => l === "eff 0") && logs.some((l) => l === "eff 1"), `effect ran on init and change (${JSON.stringify(logs)})`);
  console.log = origLog;
});

/* --- ulive preset swap ---------------------------------------------------- */
await test("ulive preset renders and mutates the same JSX", async () => {
  const dom = await mount(`
    import { h } from "uele";
    import { useUlive } from "uele/adapters/ulive";
    import { signal } from "ulive";
    useUlive();
    const count = signal(0);
    document.body.append(
      <main>
        <h2 id="n">{count}</h2>
        <button id="b" onClick={() => (count.value = count.value + 1)}>go</button>
      </main>
    );
  `);
  assert(text(dom, "#n") === "0", "ulive cell renders initially");
  await click(dom, "#b");
  await click(dom, "#b");
  assert(text(dom, "#n") === "2", "ulive cell updates on write");
});

/* --- hooks: toggle, counter, list ---------------------------------------- */
await test("uele/hooks actions mutate their cells", async () => {
  const dom = await mount(`
    import { h, If, For } from "uele";
    import { usePreactSignals } from "uele/adapters/preact";
    import { useToggle, useCounter, useList } from "uele/hooks";
    usePreactSignals();
    const [open, toggle] = useToggle(true);
    const counter = useCounter(0, { min: 0, max: 30, step: 10 });
    const tasks = useList(["a", "b"]);
    document.body.append(
      <main>
        <button id="t" onClick={toggle}>toggle</button>
        <If when={open}><section id="panel">panel</section></If>
        <span id="c">{counter.count}</span>
        <button id="inc" onClick={() => counter.inc()}>inc</button>
        <ul id="l">
          <For each={tasks.list}>{(t, i) => <li key={i}>{t}</li>}</For>
        </ul>
        <button id="push" onClick={() => tasks.push("c")}>push</button>
        <button id="rm" onClick={() => tasks.removeAt(0)}>rm</button>
      </main>
    );
  `);
  const { document } = dom;
  assert(!!document.querySelector("#panel"), "If renders when open");
  await click(dom, "#t");
  assert(!document.querySelector("#panel"), "If removed the branch on toggle");
  await click(dom, "#inc");
  await click(dom, "#inc");
  assert(text(dom, "#c") === "20", "useCounter stepped twice");
  await click(dom, "#inc");
  await click(dom, "#inc");
  assert(text(dom, "#c") === "30", "useCounter clamps at max");
  assert(document.querySelectorAll("#l li").length === 2, "list starts with 2 rows");
  await click(dom, "#push");
  assert(document.querySelectorAll("#l li").length === 3, "useList.push adds a row");
  await click(dom, "#rm");
  assert(document.querySelectorAll("#l li").length === 2, "useList.removeAt removes a row");
  assert(text(dom, "#l li:first-child") === "b", "remaining rows shifted");
});

/* --- diff presets keep correct nodes through repeated reorders ---------- */
for (const [preset, spec] of [
  ["rebuild", "uele/diffs/rebuild"],
  ["udomdiff", "uele/diffs/udomdiff"],
]) {
  await test(`${preset} differ survives reverse/shuffle/remove cycles`, async () => {
    const dom = await mount(`
      import { h, For } from "uele";
      import { ${preset === "rebuild" ? "useRebuild" : "useUdomdiff"} } from "${spec}";
      import { useUlive } from "uele/adapters/ulive";
      import { signal } from "ulive";
      ${preset === "rebuild" ? "useRebuild();" : "useUdomdiff();"}
      useUlive();
      const rows = signal([1, 2, 3, 4, 5].map((n) => ({ id: n })));
      document.body.append(
        <main>
          <ul id="l">
            <For each={rows} key={(r) => r.id} fallback={<p>empty</p>}>
              {(r) => <li key={r.id}>row {r.id}</li>}
            </For>
          </ul>
          <button id="rev" onClick={() => (rows.value = [...rows.value].reverse())}>rev</button>
          <button id="shuf" onClick={() => (rows.value = [...rows.value].sort(() => Math.random() - 0.5))}>shuf</button>
          <button id="rm" onClick={() => (rows.value = rows.value.slice(1))}>rm</button>
          <button id="add" onClick={() => (rows.value = [...rows.value, { id: Math.max(...rows.value.map((r) => r.id)) + 1 }])}>add</button>
        </main>
      );
    `);
    const { document } = dom;
    for (let i = 0; i < 4; i++) {
      await click(dom, "#rev");
      await click(dom, "#shuf");
      assert(
        document.querySelectorAll("#l li").length === 5,
        `cycle ${i}: five rows survive reorder`
      );
      const ids = [...document.querySelectorAll("#l li")].map((li) => li.textContent.trim());
      assert(ids.every((x) => /^row \d+$/.test(x)), `cycle ${i}: rows are intact (${ids.join(",")})`);
    }
    await click(dom, "#rm");
    assert(document.querySelectorAll("#l li").length === 4, "remove shrinks the list");
    await click(dom, "#add");
    assert(document.querySelectorAll("#l li").length === 5, "add grows it back");
  });
}

console.log(`\n${failures ? "FAILED" : "OK"} — ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
