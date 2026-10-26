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

export const FEATURES = [
  {
    icon: "🪶",
    title: "Tiny core",
    text: "A few kilobytes of runtime with zero framework dependencies. The whole engine fits in a single readable source file.",
  },
  {
    icon: "🌳",
    title: "Real DOM, no VDOM",
    text: "h() returns actual elements. Reactive values become small marker regions that update only the nodes they own.",
  },
  {
    icon: "⚡",
    title: "JSX built in",
    text: "An automatic JSX runtime ships in the package — configure jsxImportSource and write components immediately.",
  },
  {
    icon: "🔌",
    title: "Reactive anything",
    text: "Promises, async iterables, observables, functions and signal cells are all valid children that update themselves.",
  },
  {
    icon: "🧩",
    title: "Control-flow components",
    text: "If, Show, For, Switch, Match and Dynamic express conditionals and lists without recompiling the tree.",
  },
  {
    icon: "🔄",
    title: "Bring your own signals",
    text: "The api object plugs in ulive, Solid, Preact, Vue, MobX, RxJS and more — one call and the same components run everywhere.",
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
