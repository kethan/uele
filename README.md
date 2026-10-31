# UEle — Universal Element

A small reactive UI library for JavaScript and JSX. Build DOM elements,
connect your preferred signal library, and compose reusable components.

[![npm version](https://img.shields.io/npm/v/uele.svg)](https://www.npmjs.com/package/uele)

## Install

```sh
npm install uele
```

Examples below use JavaScript modules with a bundler and a browser DOM.
JSX examples also need an automatic JSX transform.

## Vite starter

Want a complete app to edit? Start with the
[Vite + JSX starter](examples/vite-starter/README.md): full uele, Preact
Signals, a responsive todo app, and working dev/build/preview commands.
No React plugin or additional state layer is needed.

## Quick start

No signal library or JSX is needed for this counter:

<!-- readme-example:counter -->
```js
import { h, useLive } from 'uele/tiny';

const [count, setCount] = useLive(0);
const increment = () => setCount(value => value + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

`h(tag, props, ...children)` creates DOM nodes. `useLive(initialValue)`
returns renderable nodes and a function that replaces their content.

## Choose an entry

| Import | Use it for |
| --- | --- |
| `uele` | Full renderer; the simplest starting point |
| `uele/lite` | Compact signal integration and SVG/MathML |
| `uele/tiny` or `uele/core` | Minimal renderer; bring your own integration |

There are **three variants**: core and tiny are aliases, not separate renderers.
Full includes `map`, `f`, `lazy`, and compact swapdom reconciliation.
Lite and full include reactivity support and SVG/MathML rules.

For most apps, start with **`uele`**. See the
[tier guide](core/README.md) for the detailed differences.

## Use signals

Install the signal library you want. For example, Preact Signals:

```sh
npm install @preact/signals-core
```

<!-- readme-example:signals -->
```js
import { h } from 'uele';
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals();

const count = signal(0);
const increment = () => count.value++;

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

Install a preset **once, before creating state and rendering**. Other options
include `uele/signals/ulive`, `uele/signals/vue`, and more. Install only the
signal package you use.

<!-- signal-catalog:start -->
<details>
<summary>All 19 signal presets</summary>

Import installers from `uele/signals/<suffix>`.

| Suffix → installer | Signal package |
| --- | --- |
| `alien-signals` → `alienSignals()` | `alien-signals` |
| `anod` → `anod()` | `anod` |
| `lite-signal` → `liteSignal()` | `@zakkster/lite-signal` |
| `maverick` → `maverick()` | `@maverick-js/signals` |
| `mobx` → `mobx()` | `mobx` |
| `nanostores` → `nanostores()` | `nanostores` |
| `oby` → `oby()` | `oby` |
| `preact` → `preactSignals()` | `@preact/signals-core` |
| `reactively` → `reactively()` | `@reactively/core` |
| `reflex` → `reflex()` | `@volynets/reflex` |
| `rescript-signals` → `rescriptSignals()` | `rescript-signals`, `@rescript/runtime` |
| `rxjs` → `rxjs()` | `rxjs` |
| `signals` → `signals()` | `@webreflection/signals` |
| `sjs` → `sjs()` | `s-js` |
| `solid` → `solid()` | `solid-js` |
| `tanstack` → `tanstackStore()` | `@tanstack/store` |
| `ulive` → `ulive()` | `ulive` |
| `usignal` → `usignal()` | `usignal` |
| `vue` → `vue()` | `@vue/reactivity` |

</details>
<!-- signal-catalog:end -->

[Exact install commands and runnable usage for every signal preset](docs/PRESETS.md#signal-presets).

Pass a signal directly, or use a function for derived content:

<!-- readme-example:derived -->
```js
import { h } from 'uele';
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals();

const name = signal('World');
const greeting = h('p', null, () => `Hello, ${name.value}!`);

document.body.append(greeting);
name.value = 'uele';
```

Functions re-run reactively only with an effect-capable preset, such as Preact
or ulive. Subscribe-only libraries do not track arbitrary function reads.

## Signals, async values, and SVG in one view

Full uele can bind signals, resolve promises into DOM content, and create SVG
in the same view—no separate component model or virtual DOM is needed:

<!-- readme-example:mixed-sources -->
```js
import { h } from 'uele';
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals();
const count = signal(0);

const app = h('main', null,
  h('button', { onclick: () => count.value++ }, count),
  h('p', { id: 'status' }, Promise.resolve('Ready')),
  h('svg', { viewBox: '0 0 24 24', width: 48 },
    h('circle', { cx: 12, cy: 12, r: () => count.value + 5 })
  )
);
document.body.append(app);
```

Clicking updates the counter and circle radius. The promise fills its own
content region when it resolves. Full also supports observable sources and
async iterables; use renderer-owned teardown for views that are unmounted.

## Use JSX

Point your compiler at uele's automatic JSX runtime. For TypeScript, the
relevant `tsconfig.json` settings are:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "uele"
  }
}
```

Save JSX code in a `.jsx` or `.tsx` file:

<!-- readme-example:jsx -->
```jsx
/** @jsxImportSource uele */
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals();
const count = signal(0);

const Counter = () => (
  <button onclick={() => count.value++}>
    Count: {count}
  </button>
);

document.body.append(<Counter />);
```

Components are functions that return DOM nodes. They receive their children
as an array. Extract `children` before forwarding props to a DOM element:

<!-- readme-example:component -->
```js
import { h } from 'uele';

const Box = ({ children, ...attrs }) =>
  h('section', attrs, children);

const app = h(Box, { id: 'greeting' }, 'Hello!');
document.body.append(app);
```

Use positional children with `h()`, not `h('div', { children: ... })`.
The JSX runtime handles this conversion for you.

## Render lists

`For` renders a reactive list. Use stable, unique keys for object items:

<!-- readme-example:list -->
```jsx
/** @jsxImportSource uele */
import { For } from 'uele/flow';
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals();
const items = signal([{ id: 1, text: 'Learn uele' }]);

const app = (
  <ul>
    <For each={items} key={item => item.id}>
      {item => <li>{item.text}</li>}
    </For>
  </ul>
);

document.body.append(app);
items.value = [...items.value, { id: 2, text: 'Build an app' }];
```

`If`, `Show`, `Switch`, `Match`, and `Dynamic` also come from `uele/flow`.
See the [control-flow reference](core/README.md#imports-after-migration).

## Todo examples

Choose a complete, runnable file rather than copying a large app from here:

- [Preact todo](examples/todos/preact.jsx): add, toggle, delete, filter,
  clear completed, and remaining count.
- [Simple State todo](examples/todos/state.js): no signal package or preset;
  uses your callback-based State function and a small subscription bridge.
- [Tiny ulive todo](examples/size-proof/todo.js): the measured small-app example.
- [All todo examples and instructions](examples/README.md).

## Attributes, properties and events

Use ordinary DOM properties, event handlers, and style/class objects:

<!-- readme-example:attributes -->
```js
import { h } from 'uele';

const button = h('button', {
  type: 'button',
  class: { primary: true },
  style: { color: 'white', background: 'royalblue' },
  onclick: event => {
    event.currentTarget.textContent = 'Clicked!';
  }
}, 'Click me');

document.body.append(button);
```

Signals can also drive attributes, properties, individual style values,
and class flags. For optional form bindings, DOM actions, and other prop
handlers, see [the props guide](docs/PROPS.md).

## Reusable UI, hooks and routing

These modules work with the configured main renderer and signal preset:

- **`uele/ui`** — buttons, forms, layout, dialogs, tables, and other UI primitives.
  See [the component examples](examples/README.md).
- **`uele/hooks`** — fetch, timers, forms, storage, browser events, and more.
  See [the hooks guide](docs/HOOKS.md).
- **`uele/themes`** — theme tokens, styles, and `ThemeProvider`.
  See [the themed sample pages](examples/README.md#pages--sample-pages-on-the-unified-signal-layer).
- **`uele/router`** — `createRouter`, `Router`, `Link`, and navigation.
  See [the routing guide](docs/ROUTER.md).
- **`uele/flow`** — lists, conditional views, async boundaries, portals, and titles.
  See [flow behavior and tests](docs/FLOW-TESTING.md).

## Write once, run on any preset (`uele/reactive`)

Use your signal library's native API, or use `uele/reactive` when writing
components that should work across different signal libraries:

<!-- readme-example:reactive -->
```js
import { h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { signal, read, write } from 'uele/reactive';

preactSignals();

const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

This is an authoring facade, **not another signal engine**. It delegates to
the installed preset. `computed` and `effect` need a capable preset; check
`canCompute()` and `canEffect()` if your code supports subscribe-only stores.

Full uele uses **usub** internally to read and subscribe to reactive/async
sources. You do not need to import usub to use these examples.
[More about configuration](docs/API.md).

## Object and array state with ustor

[UStor](https://github.com/kethan/ustor) is optional. It lets you update object
properties directly and define computed getters.

```sh
npm install ustor@^0.3.0 @preact/signals-core
```

Connect UStor to the same signal library as uele, then use a normal store:

<!-- ustor-example:start -->
```js
import { api, h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { store, api as storeApi } from 'ustor';

preactSignals();
const { signal, get, set, is, computed } = api;
Object.assign(storeApi, {
  signal, get, set, is, computed, getComputed: get
});

const state = store({
  count: 0,
  get double() { return this.count * 2; }
});

const app = h('section', null,
  h('button', {
    onclick: () => state.count++
  }, 'Increment'),
  h('output', { 'data-count': '' }, () => state.count),
  h('output', { 'data-double': '' }, state.$double)
);
document.body.append(app);
```
<!-- ustor-example:end -->

Use `() => state.count` or `state.$count` for live rendering. Reading
`state.count` directly while creating a node gives you a snapshot.

No `region()` helper is needed. The larger examples use `useLive` directly
when they need an explicit `dispose()` method; see
[how unmounting works](examples/ustor/README.md#how-unmounting-works).

### What this enables

The [runnable UStor cart](examples/ustor/cart.js) combines:

- **Nested state:** `item.quantity++` immediately updates its quantity label.
- **Computed totals:** the store's `total` getter updates the displayed sum.
- **Live arrays:** `push`, `splice`, and `reverse` update a keyed `For` list.
- **Retained DOM:** reordering keeps the existing keyed row nodes.
- **Explicit teardown:** `dispose()` stops the view's owned subscriptions.

No JSX, virtual DOM, named region helper, or extra diff package is required.
The example uses full uele's default reconciliation. See
[the cart demo and setup](examples/ustor/README.md) and
[advanced integration details](docs/USTOR.md) for Vue and store limitations.

## Cleanup Support

Use `useLive` when you need to replace or unmount a whole view:

<!-- readme-example:cleanup -->
```js
import { h, useLive } from 'uele';

const [view, replace] = useLive(h('p', null, 'Hello'));
document.body.append(...view);

replace(h('p', null, 'Updated'));
replace(null); // unmount and stop owned subscriptions
```

`For` also owns the subscriptions in rows it removes. Arbitrary native DOM
removal such as `element.remove()` is **not** a renderer lifecycle signal.
See [ownership details](core/README.md) before writing custom teardown code.

## Diff engine presets (`uele/diffs/*`)

Most apps need no setup: full uses compact `swapdom/deflate`; core/tiny and
lite use basic marker replacement. Pick another engine only when needed.

| Preset path suffix | Additional package |
| --- | --- |
| `builtin` | None; reset to basic replacement |
| `swapdom` | `swapdom` |
| `udomdiff` | `udomdiff` |
| `domdiff` | `domdiff` |
| `morphdom` | `morphdom` |
| `nanomorph` | `nanomorph` |
| `fast-array-diff` | `fast-array-diff` |
| `rebuild` | None |
| `spect` | None |
| `snabbdom` | None |
| `heckel` | None |
| `list-difference` | None |
| `stage0` | None |

The five dependency-free algorithms `spect`, `snabbdom`, `heckel`,
`list-difference`, and `stage0` are inspired by
[js-diff-benchmark](https://github.com/luwes/js-diff-benchmark).
They are independent node-identity implementations, not framework wrappers.

For example, select `stage0` once, before rendering:

<!-- readme-example:diff -->
```js
import { stage0 } from 'uele/diffs/stage0';

stage0();
```

The explicit `swapdom` preset uses upstream's larger inflate variant, not
full's compact default. `builtinDiff()` from `uele/diffs/builtin` resets
any entry to basic replacement. See [all diff preset recipes](docs/PRESETS.md#diff-engine-presets).

## Authoring guides and reference

Keep the first app simple. These guides cover the advanced topics when needed:

- [API, configuration, and naming](docs/API.md)
- [Renderer tiers, `map`, and lower-level hooks](core/README.md)
- [Writing custom props, signal adapters, and diff engines](docs/AUTHORING.md)
- [Adapter contracts and compatibility pitfalls](docs/ADAPTERS.md)
- [Props and form bindings](docs/PROPS.md)
- [Hook reference](docs/HOOKS.md)
- [All runnable examples](examples/README.md)
- [Production-readiness review and known advisory](docs/PRODUCTION-READINESS.md)

For contributors, `npm ci` followed by `npm run test:release` runs the
coverage, core, ESM/CJS, types, installed-consumer, size, and browser checks.
Linux may need Chromium system libraries; see the CI workflow.

## Thanks and inspiration

[usub](https://github.com/kethan/usub),
[swapdom](https://github.com/dy/swapdom), and the signal and diff libraries
listed in [the preset guide](docs/PRESETS.md).

## License

[MIT](LICENSE)

## Complete app size proofs

| Runnable example | Complete JS, gzip |
| --- | ---: |
| Hello World | **966 B** (<1 kB) |
| Stateful counter | **1,051 B** (<1.4 kB) |
| Signal counter with ulive | **1,248 B** (<1.4 kB) |
| Signal todo: add, toggle, delete | **1,473 B** (<1.8 kB) |

Measured on the current build with Rollup + Terser; decimal kB. These use
the public tiny/core entries, **not the full entry**. Counts include app code,
renderer, signal integration, and signal dependency where used. HTML and HTTP
headers are excluded. Both default gzip and level 9 pass the limits.

The exact measured bundles run in Chromium without extra JavaScript loads.
[Sources, methodology, and reproduction](examples/size-proof/README.md).
[Map/For and every flow component: stress-test coverage](docs/FLOW-TESTING.md).
