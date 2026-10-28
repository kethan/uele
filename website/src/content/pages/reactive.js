export const title = "Reactive";

export const markdown = `## uele/reactive — signal, computed, effect and the preset system

Write a UI primitive or utility **once** and run it on any signal library. Every function here delegates to the hooks the active preset installed (usePreactSignals(), …), so the same code runs on ulive, preact, vue, usignal, alien-signals, s-js, mobx or solid-js.

\`\`\`jsx
import { signal, computed, effect, write, read } from "uele/reactive";

const count = signal(0);
const doubled = computed(() => read(count) * 2);

effect(() => console.log("count changed:", read(count)));

document.body.append(
  <main>
    <h1>{() => read(doubled)}</h1>
    <button onClick={() => write(count, read(count) + 1)}>Increment</button>
  </main>
);
\`\`\`

## API

| Export | Signature | Description |
| --- | --- | --- |
| \`signal\` | \`(value)\` → cell | Create a reactive cell |
| \`computed\` | \`(fn)\` → cell | Derived value, re-runs when dependencies change |
| \`effect\` | \`(fn)\` → disposer | Run now and on every change; returns unsubscribe |
| \`batch\` | \`(fn)\` → result | Coalesce writes into one update |
| \`untracked\` | \`(fn)\` → result | Run without subscribing |
| \`read\` | \`(cell)\` → value | Read a cell's current value |
| \`write\` | \`(cell, value)\` → void | Write to any cell the preset produces |
| \`isCell\` | \`(value)\` → boolean | Is this a cell of the active library? |
| \`canEffect\` | \`() → boolean\` | Does the preset support effects? |
| \`canCompute\` | \`() → boolean\` | Does the preset support computed? |
| \`active\` | \`() → api\` | The raw \`api\` configuration object |

## Two capabilities are library-dependent

Feature-detect them instead of guessing:

* \`canEffect()\` — reactive thunks/effects (false for subscribe-only stores like RxJS, nanostores, @tanstack/store)
* \`canCompute()\` — \`computed()\` (needs an effect runner)

## Custom reactive (presets)

The \`api\` object is how uele learns about another signal library. Adapters wrap this in a single call — for example \`usePreactSignals()\` from \`uele/adapters/preact\`. The three core hooks are:

\`\`\`js
import { api } from "uele";

api.effect = (fn) => effect(fn);   // run fn now and whenever its cells change
api.is = (v) => !!v?.peek;          // recognise a cell of this library
api.get = (v) => v.value;           // read a cell's current value
\`\`\`

Once configured, cells of that library render directly as children, props, class values and style values — and the same component code runs unchanged on every preset (ulive, Solid, Preact, Vue, MobX, s-js, alien-signals, RxJS, nanostores, TanStack store and more).

Available adapters:

* \`uele/adapters/preact\` — \`usePreactSignals()\`
* \`uele/adapters/ulive\` — \`useUlive()\`
* \`uele/adapters/signals\` — @preact/signals-core
* \`uele/adapters/usignal\` — usignal
* \`uele/adapters/alien-signals\` — alien-signals
* \`uele/adapters/sjs\` — s-js
* \`uele/adapters/mobx\` — mobx
* \`uele/adapters/rxjs\` — rxjs
* \`uele/adapters/nanostores\` — nanostores
* \`uele/adapters/tanstack\` — @tanstack/store
* \`uele/adapters/solid\` — solid-js
* \`uele/adapters/vue\` — vue

> **Tip:** Use \`uele/reactive\` when you want preset-agnostic components. Use the adapter's native API when you want to use library-specific features.

---

> Next: [**Diff Engine**](#/diffs) — how uele reconciles lists and DOM.
`;
