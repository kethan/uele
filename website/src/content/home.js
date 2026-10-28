export const HERO_CODE = `import { h, useLive } from "uele";

const [count, setCount] = useLive(0);

document.body.append(
  <main>
    <h2>Try uele right here</h2>
    <p>Edit this code — the preview re-runs automatically.</p>
    <button onClick={() => setCount((c) => c - 1)}>−</button>
    <strong style={{ margin: "0 12px", fontSize: "22px" }}>{count}</strong>
    <button className="primary" onClick={() => setCount((c) => c + 1)}>+</button>
  </main>
);`;

export const HERO_FEATURES = [
  { label: "~45 KB", text: "gzip'd runtime — lighter than Preact and Solid" },
  { label: "Zero dependencies", text: "npm install uele and you're done" },
  { label: "JSX built in", text: "Automatic JSX runtime, configure once and go" },
  { label: "Real DOM, no VDOM", text: "h() returns actual elements — no virtual tree" },
  { label: "Bring your own signals", text: "ulive, Solid, Preact, Vue, MobX, RxJS — one call" },
  { label: "129 UI primitives", text: "Headless components from uele/ui" },
];

export const FEATURES = [
  {
    icon: "🪶",
    title: "Tiny core",
    text: "A few kilobytes of runtime with zero framework dependencies. The whole engine fits in a single readable source file.",
    sub: ["~45 KB gzip JS", "4 KB gzip CSS", "No build step required"],
  },
  {
    icon: "🌳",
    title: "Real DOM, no VDOM",
    text: "h() returns actual elements. Reactive values become small marker regions that update only the nodes they own.",
    sub: ["True signal reactivity", "No reconciliation overhead", "Direct DOM mutation"],
  },
  {
    icon: "⚡",
    title: "JSX built in",
    text: "An automatic JSX runtime ships in the package — configure jsxImportSource and write components immediately.",
    sub: ["import { h } from \"uele\"", "jsxImportSource: \"uele\"", "Works with any bundler"],
  },
  {
    icon: "🔌",
    title: "Reactive anything",
    text: "Promises, async iterables, observables, functions and signal cells are all valid children that update themselves.",
    sub: ["Signals, promises, async iterables", "Observables (RxJS)", "Thunks and functions"],
  },
  {
    icon: "🧩",
    title: "Control-flow components",
    text: "If, Show, For, Switch, Match and Dynamic express conditionals and lists without recompiling the tree.",
    sub: ["<If>", "<Show>", "<For>", "<Switch>", "<Match>"],
  },
  {
    icon: "🔄",
    title: "Bring your own signals",
    text: "The api object plugs in ulive, Solid, Preact, Vue, MobX, RxJS and more — one call and the same components run everywhere.",
    sub: ["signal(), computed(), effect()", "15+ reactive adapters", "Custom api config"],
  },
  {
    icon: "🎨",
    title: "Headless UI kit",
    text: "uele/ui ships 129 primitives — Radix-style behavior and ARIA with no CSS of your own.",
    sub: ["Buttons, inputs, selects, dialogs", "Tabs, drawers, toasts", "Themeable with uele/themes"],
  },
  {
    icon: "🎯",
    title: "Signal-first",
    text: "signal(), computed(), effect() and write() work with any preset — write once, run on any signal library.",
    sub: ["signal(), computed(), effect(), write()", "batch(), untracked(), read()", "15+ adapters"],
  },
];

export const TEASER = `// elements are functions, components are functions, JSX compiles to both
import { h, For } from "uele";

const todos = ["learn h()", "write some JSX", "ship it"];

document.body.append(
  <main>
    <h2>Todos</h2>
    <ul>
      <For each={todos} fallback={<li>Nothing yet</li>}>
        {(todo, i) => <li key={i}>{todo}</li>}
      </For>
    </ul>
  </main>
);`;

