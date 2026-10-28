export const title = "Signals & Presets";

export const markdown = `
Core uele ships with \`useLive\` for local state, but the library is
signal-agnostic: the \`api\` object lets any signal library drive the DOM.
A **preset** is a one-call adapter that wires a specific signal package into
that \`api\` — Preact signals, ulive, Solid, Vue, MobX and others all ship in
\`uele/adapters/*\`. These playgrounds bundle two of them
(\`@preact/signals-core\` and \`ulive\`) plus the portable
\`uele/reactive\` and \`uele/hooks\` subpaths.

> **Note:** unlike \`useLive\` regions (which are DOM nodes usable only as
> children), signal **cells are values**. Once a preset is installed they can
> be dropped into JSX as children *or* passed as attributes, class maps,
> style values, lists and refs — uele subscribes per binding.

## Installing a preset

One call configures the whole \`api\` surface — \`is\`, \`get\`, effect
runner, cleanup and authoring hooks. The same component code then runs on any
preset; only this call changes.

\`\`\`jsx
import { h } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed } from "@preact/signals-core";

usePreactSignals();

const count = signal(0);
const doubled = computed(() => count.value * 2);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums" }}>{count}</h2>
    <p>doubled: <strong>{doubled}</strong></p>
    <button onClick={() => (count.value -= 1)}>−1</button>
    <button className="primary" onClick={() => (count.value += 1)}>+1</button>
  </main>
);
\`\`\`

The cell \`{count}\` is a live child: writing \`count.value\` updates just that
text node. A \`computed\` cell works the same and re-derives only when its
dependencies change.

## Cells work as props too

This is the big difference from \`useLive\` — a signal can drive an attribute,
a class toggle or a CSS property directly, no subtree rebuild:

\`\`\`jsx
import { h } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed } from "@preact/signals-core";

usePreactSignals();

const featured = signal(false);
const label = computed(() => (featured.value ? "on" : "off"));
const bg = computed(() => (featured.value ? "#eeedff" : "#f5f5f8"));

document.body.append(
  <main>
    <section
      className={{ card: true, featured }}
      style={{ padding: "20px", borderRadius: "12px", background: bg, border: "1px solid #d8dae5" }}
    >
      <h3 style={{ marginTop: 0 }}>Reactive class + style</h3>
      <p>The \`featured\` class is {label} — watch the attribute and CSS flip.</p>
      <button onClick={() => (featured.value = !featured.value)}>Toggle featured</button>
    </section>
  </main>
);
\`\`\`

## The portable uele/reactive API

If you want your code to survive a change of signal library, write it against
\`uele/reactive\` instead of a package directly. Every function delegates to
the active preset, so the same utilities run unchanged on Preact signals,
ulive, Solid or Vue.

\`\`\`jsx
import { h } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed, effect, read, write } from "uele/reactive";

usePreactSignals();

const count = signal(0);
const doubled = computed(() => read(count) * 2);

// runs immediately and again whenever count changes — see the console panel
const stop = effect(() => console.log("count is", read(count)));

document.body.append(
  <main>
    <h2>{count}</h2>
    <p>doubled: <strong>{doubled}</strong></p>
    <button className="primary" onClick={() => write(count, read(count) + 1)}>
      write(count, read(count) + 1)
    </button>
    <button onClick={stop}>Stop effect</button>
  </main>
);
\`\`\`

Available helpers include \`signal\`, \`computed\`, \`effect\`, \`read\`,
\`write\`, \`batch\`, \`untracked\`, \`isCell\`, \`canEffect()\` and
\`canCompute()\` — the last two feature-detect subscribe-only stores such as
RxJS or nanostores.

## Hooks (uele/hooks)

\`uele/hooks\` are written once against \`uele/reactive\`, so they work on any
effect-capable preset. They return cells you render directly, plus plain
action functions.

\`\`\`jsx
import { h, If, For } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { useToggle, useCounter, useList } from "uele/hooks";
import { computed, read } from "uele/reactive";

usePreactSignals();

const [open, toggle] = useToggle(false);
const openLabel = computed(() => (read(open) ? "Hide" : "Show") + " detail");
const counter = useCounter(0, { min: 0, step: 5 });
const tasks = useList(["read the signals guide", "try another preset"]);
const taskCount = computed(() => read(tasks.list).length);

document.body.append(
  <main>
    <p>
      <button onClick={toggle}>{openLabel}</button>
    </p>
    <If when={open}>
      <section style={{ padding: 12, border: "1px solid #d8dae5", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>useCounter (step 5, min 0)</h3>
        <p>{counter.count}</p>
        <button onClick={() => counter.dec()}>−5</button>
        <button className="primary" onClick={() => counter.inc()}>+5</button>
        <button onClick={counter.reset}>Reset</button>
      </section>
    </If>
    <h3>useList — {taskCount} item(s)</h3>
    <For each={tasks.list} fallback={<p>list is empty</p>}>
      {(task, i) => (
        <li key={i} style={{ display: "flex", gap: 8, margin: "4px 0" }}>
          <span style={{ flex: 1 }}>{task}</span>
          <button onClick={() => tasks.removeAt(i)}>remove</button>
        </li>
      )}
    </For>
    <button onClick={() => tasks.push("another task " + (read(taskCount) + 1))}>
      Push
    </button>
    <button onClick={tasks.clear}>Clear</button>
  </main>
);
\`\`\`

## Switching presets: same code, different engine

The exact same component logic runs on ulive — uele's ultra-small signals
package — by changing a single import and the setup call. Notice the JSX
itself does not move.

\`\`\`jsx
import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal, computed } from "ulive";

useUlive();

const count = signal(0);
const squared = computed(() => count.value * count.value);

document.body.append(
  <main>
    <h2>{count}</h2>
    <p>squared: <strong>{squared}</strong></p>
    <button className="primary" onClick={() => (count.value = count.value + 1)}>
      +1 with ulive
    </button>
  </main>
);
\`\`\`

## Which should I reach for?

| Need | Reach for |
| --- | --- |
| A bit of local state, zero dependencies | \`useLive\` from core |
| Reactive props (disabled, class, style, \`For each={cell}\`) | A preset + signal cells |
| Library-agnostic utilities and hooks | \`uele/reactive\`, \`uele/hooks\` |
| Smallest possible signal footprint | \`useUlive()\` + \`ulive\` |
| Familiar ecosystem signals | \`usePreactSignals()\` + \`@preact/signals-core\` |

> **Tip:** every adapter assigns a *complete* reactivity surface and clears
> hooks the library lacks, so switching presets can never leave a stale hook
> behind. The full preset list lives in \`uele/adapters/*\` — Solid, Vue,
> MobX, s-js, alien-signals, RxJS, nanostores, TanStack store and more.
`;
