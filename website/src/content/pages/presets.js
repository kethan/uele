export const title = "Custom Reactive Presets";

export const markdown = `## Custom reactive presets — the \`api\` object

The \`api\` object is how uele learns about another signal library. Adapters wrap this in a single call — for example \`usePreactSignals()\` from \`uele/adapters/preact\`. The hooks a preset installs are:

| Hook | Signature | Purpose |
| --- | --- | --- |
| \`is\` | \`(value) → boolean\` | Recognise a cell of this library |
| \`get\` | \`(cell) → value\` | Read a cell's current value |
| \`effect\` | \`(fn) → disposer\` | Run fn now and on change |
| \`cleanup\` | \`(fn)\` → void | Register an effect teardown |
| \`signal\` | \`(value) → cell\` | Create a cell (authoring) |
| \`derived\` | \`(fn) → cell\` | Create a derived cell (authoring) |
| \`set\` | \`(cell, value)\` → void | Write to any cell (authoring) |
| \`batch\` | \`(fn)\` → result | Coalesce writes (authoring) |
| \`untracked\` | \`(fn)\` → result | Read without subscribing (authoring) |

Only \`is\`, \`get\`, \`effect\` and \`cleanup\` are required — the rest are authoring conveniences used by \`uele/reactive\`.

## Using an adapter

Each adapter installs its hooks on \`api\` (or a target you pass):

\`\`\`js
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed, effect, write, read } from "uele/reactive";

usePreactSignals();

const count = signal(0);
const doubled = computed(() => read(count) * 2);

effect(() => console.log(read(doubled)));
write(count, 5);
\`\`\`

\`\`\`js
import { useUlive } from "uele/adapters/ulive";
import { signal, read, write } from "uele/reactive";

useUlive();

const name = signal("stranger");
\`\`\`

## Installing \`api\` manually

\`\`\`js
import { api } from "uele";

api.is = (v) => !!v?.peek;
api.get = (v) => v.value;
api.effect = (fn) => {
  const off = someLibrary.effect(fn);
  return () => off();
};
api.cleanup = (fn) => { /* register teardown */ };
\`\`\`

Once configured, cells of that library render directly as children, props, class values and style values.

## Available adapters

| Adapter | Import | Library |
| --- | --- | --- |
| ulive | \`uele/adapters/ulive\` | ulive |
| preact | \`uele/adapters/preact\` | @preact/signals-core |
| signals | \`uele/adapters/signals\` | @preact/signals |
| usignal | \`uele/adapters/usignal\` | usignal |
| alien-signals | \`uele/adapters/alien-signals\` | alien-signals |
| sjs | \`uele/adapters/sjs\` | s-js |
| mobx | \`uele/adapters/mobx\` | mobx |
| rxjs | \`uele/adapters/rxjs\` | rxjs |
| nanostores | \`uele/adapters/nanostores\` | nanostores |
| tanstack | \`uele/adapters/tanstack\` | @tanstack/store |
| solid | \`uele/adapters/solid\` | solid-js |
| vue | \`uele/adapters/vue\` | vue |

Two capabilities are library-dependent — feature-detect them:

* \`canEffect()\` — reactive thunks/effects (false for subscribe-only stores like RxJS, nanostores, TanStack store)
* \`canCompute()\` — \`computed()\` (needs an effect runner)

> **Tip:** Use \`uele/reactive\` when you want preset-agnostic components. Use the adapter's native API when you want to use library-specific features.

---

> Next: [**Diff Engine**](#/diffs) — how uele reconciles lists and DOM.
`;
