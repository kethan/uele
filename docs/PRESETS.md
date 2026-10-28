# uele presets

One import, one call. Each preset assigns the complete surface (unused hooks are cleared, so switching
presets can never leave stale configuration behind) and returns the configured `api` object.

```jsx
import { preactSignals } from "uele/signals/preact";

preactSignals(); // that is the whole setup
```

Every signal preset accepts an optional target - pass the `api` exported by `uele/lite` to
configure the tiny core instead. The signal/diff library itself is a peer dependency: install the one
you use (`npm i @preact/signals-core`), nothing else is pulled in.

All examples below are JSX; point your bundler at the automatic runtime
(`{ "jsx": "react-jsx", "jsxImportSource": "uele" }`, or
`esbuild: { jsx: "automatic", jsxImportSource: "uele" }`).

Install presets at startup, before creating state or rendering. See [API.md](API.md)
for optional `configure()` and lite setup.

## Signal presets

### `uele/signals/alien-signals` - `alienSignals()`

Wire uele to `alien-signals` - plain-function signals: read `s()`, write `s(v)`.

```jsx
import { signal } from 'alien-signals';
import { alienSignals } from 'uele/signals/alien-signals';

alienSignals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `count(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/anod` - `anod()`

Wire uele to `anod`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { anod } from 'uele/signals/anod';

anod(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/lite-signal` - `liteSignal()`

Wire uele to `@zakkster/lite-signal`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { liteSignal } from 'uele/signals/lite-signal';

liteSignal(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/maverick` - `maverick()`

Wire uele to `@maverick-js/signals`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { maverick } from 'uele/signals/maverick';

maverick(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/mobx` - `mobx()`

Wire uele to `mobx` - boxed observables and computed values.

```jsx
import { observable } from 'mobx';
import { mobx } from 'uele/signals/mobx';

mobx(); // one call, whole api configured

const count = observable.box(0);

document.body.append(
  <button onclick={() => count.set(count.get() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.get()`, write it as `count.set(count.get() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/nanostores` - `nanostores()`

Wire uele to `nanostores` - atoms driven through `.subscribe()`; no effect runner.

```jsx
import { atom } from 'nanostores';
import { nanostores } from 'uele/signals/nanostores';

nanostores(); // one call, whole api configured

const count = atom(0);

document.body.append(
  <button onclick={() => count.set(count.get() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.get()`, write it as `count.set(count.get() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/oby` - `oby()`

Wire uele to `oby`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { oby } from 'uele/signals/oby';

oby(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/preact` - `preactSignals()`

Wire uele to `@preact/signals-core` - `Signal` instances; since 1.13 they also expose `.subscribe()`.

```jsx
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';

preactSignals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/reactively` - `reactively()`

Wire uele to `@reactively/core`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { reactively } from 'uele/signals/reactively';

reactively(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/reflex` - `reflex()`

Wire uele to `@volynets/reflex`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { reflex } from 'uele/signals/reflex';

reflex(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/rescript-signals` - `rescriptSignals()`

Wire uele to `rescript-signals`. Install before creating reactive content.

```jsx
import { api } from 'uele';
import { rescriptSignals } from 'uele/signals/rescript-signals';

rescriptSignals(); // one call, whole api configured

const count = api.signal(0);

document.body.append(
  <button onclick={() => api.set(count, api.get(count) + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `api.get(count)`, write it as `api.set(count, api.get(count) + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/rxjs` - `rxjs()`

Wire uele to `rxjs` - driven through `.subscribe()`; no effect runner, so no computed values.

```jsx
import { BehaviorSubject } from 'rxjs';
import { rxjs } from 'uele/signals/rxjs';

rxjs(); // one call, whole api configured

const count = new BehaviorSubject(0);

document.body.append(
  <button onclick={() => count.next(count.value + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.next(count.value + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/signals` - `signals()`

Wire uele to `@webreflection/signals` - `Signal` instances with a Preact-like API.

```jsx
import { signal } from '@webreflection/signals';
import { signals } from 'uele/signals/signals';

signals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/sjs` - `sjs()`

Wire uele to `s-js` - data nodes are read/written by calling them.

```jsx
import S from 's-js';
import { sjs } from 'uele/signals/sjs';

sjs(); // one call, whole api configured

const count = S.data(0);

document.body.append(
  <button onclick={() => count(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `count(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/solid` - `solid()`

Wire uele to `solid-js` - accessors (signals and memos alike) from the CLIENT build.

```jsx
// node resolves `solid-js` to its no-op server build; apps bundle the client build
import { createSignal } from 'solid-js/dist/solid.js';
import { solid } from 'uele/signals/solid';

solid(); // one call, whole api configured

const [count, setCount] = createSignal(0);

document.body.append(
  <button onclick={() => setCount(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `setCount(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/tanstack` - `tanstackStore()`

Wire uele to `@tanstack/store` - `Store` with `.state`/`.setState()`; `subscribe()` is not synchronous.

```jsx
import { Store } from '@tanstack/store';
import { tanstackStore } from 'uele/signals/tanstack';

tanstackStore(); // one call, whole api configured

const count = new Store(0);

document.body.append(
  <button onclick={() => count.setState(count.state + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.state`, write it as `count.setState(count.state + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/ulive` - `ulive()`

Wire uele to `ulive` - signals with `peek`/`value`.

```jsx
import { signal } from 'ulive';
import { ulive } from 'uele/signals/ulive';

ulive(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/usignal` - `usignal()`

Wire uele to `usignal` - `Signal` instances; a read is attributed to every enclosing effect.

```jsx
import { signal } from 'usignal';
import { usignal } from 'uele/signals/usignal';

usignal(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/signals/vue` - `vue()`

Wire uele to `@vue/reactivity` - `ref()`/`computed()` values.

```jsx
import { ref } from '@vue/reactivity';
import { vue } from 'uele/signals/vue';

vue(); // one call, whole api configured

const count = ref(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

## Diff engine presets

A diff engine is chosen the same way - one call. It only changes how a list update is applied, so the
example is the same for all of them:

### `uele/diffs/builtin` - `builtinDiff()`

Back to the built-in marker walk (the default): no `api.diff`, no dependency.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { builtinDiff } from 'uele/diffs/builtin';
import { signal } from 'ulive';

ulive();
builtinDiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/domdiff` - `domdiff()`

`domdiff` - takes an options object instead of a node (`{ before: end }`).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { domdiff } from 'uele/diffs/domdiff';
import { signal } from 'ulive';

ulive();
domdiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/fast-array-diff` - `fastArrayDiff()`

`fast-array-diff` - its LCS patch decides the ordering, the preset performs the DOM moves.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { fastArrayDiff } from 'uele/diffs/fast-array-diff';
import { signal } from 'ulive';

ulive();
fastArrayDiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/heckel` - `heckel()`

Heckel-style unique-token matching, independently implemented for uele. Algorithm family: https://github.com/luwes/js-diff-benchmark Map keys preserve node identity (unlike string-keyed symbol tables). DOM lists contain each node at most once, so shared tokens are unique matches.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { heckel } from 'uele/diffs/heckel';
import { signal } from 'ulive';

ulive();
heckel(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/list-difference` - `listDifference()`

Map-based list-difference reconciliation, independently implemented for uele. Algorithm family: https://github.com/luwes/js-diff-benchmark Keys are DOM node identities; caller-owned arrays are never modified.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { listDifference } from 'uele/diffs/list-difference';
import { signal } from 'ulive';

ulive();
listDifference(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/morphdom` - `morphdom()`

`morphdom` - updates nodes in place (the contract's write-back is handled for you by the shared adapter).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { morphdom } from 'uele/diffs/morphdom';
import { signal } from 'ulive';

ulive();
morphdom(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/nanomorph` - `nanomorph()`

`nanomorph` - updates nodes in place (write-back handled by the adapter).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { nanomorph } from 'uele/diffs/nanomorph';
import { signal } from 'ulive';

ulive();
nanomorph(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/rebuild` - `rebuild()`

The smallest conforming differ: drop everything, insert everything. Fine for tiny lists and a useful baseline in tests.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { rebuild } from 'uele/diffs/rebuild';
import { signal } from 'ulive';

ulive();
rebuild(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/snabbdom` - `snabbdom()`

Snabbdom-style node-identity reconciliation, independently implemented for uele's bounded live regions. Inspired by the algorithm family compared at https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { snabbdom } from 'uele/diffs/snabbdom';
import { signal } from 'ulive';

ulive();
snabbdom(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/spect` - `spect()`

Spect-style node-identity reconciliation, independently implemented for uele's bounded live regions. Inspired by the algorithm family compared at https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { spect } from 'uele/diffs/spect';
import { signal } from 'ulive';

ulive();
spect(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/stage0` - `stage0()`

Stage0-style node-identity reconciliation, independently implemented for uele's bounded live regions. Inspired by the algorithm family compared at https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { stage0 } from 'uele/diffs/stage0';
import { signal } from 'ulive';

ulive();
stage0(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/swapdom` - `swapdom()`

`swapdom` - a keyed differ written for exactly uele's `api.diff` signature.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { swapdom } from 'uele/diffs/swapdom';
import { signal } from 'ulive';

ulive();
swapdom(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/udomdiff` - `udomdiff()`

`udomdiff` - takes `(parent, a, b, get, before)`; uele supplies the get callback through `api.udom` and passes the end marker as `before`.

```jsx
import { For } from 'uele';
import { ulive } from 'uele/signals/ulive'; // any signal preset works
import { udomdiff } from 'uele/diffs/udomdiff';
import { signal } from 'ulive';

ulive();
udomdiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

## Which one should I use?

### Signal presets (`uele/signals/*`)

Install the library you want, call one function. Every preset is driven by the same conformance suite.
"install size" is the npm unpacked size of the library (all published files), not its bundle cost.

| preset                        | library                | install | preset | read         | write              | reactive thunks | subscribe path | notes                                                                                                                                                        |
| ----------------------------- | ---------------------- | ------- | ------ | ------------ | ------------------ | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uele/signals/ulive`         | `ulive`                | 15 kB   | 266 B  | `cell.value` | `cell.value = v`   | yes             | no             | smallest default; the baseline uele is tested against                                                                                                        |
| `uele/signals/preact`        | `@preact/signals-core` | 254 kB  | 360 B  | `cell.value` | `cell.value = v`   | yes             | yes            | signals also expose `.subscribe()`; great with Preact                                                                                                        |
| `uele/signals/vue`           | `@vue/reactivity`      | 342 kB  | 323 B  | `cell.value` | `cell.value = v`   | yes             | no             | `ref()`/`computed()`; the effect needs `stop(runner)`                                                                                                        |
| `uele/signals/usignal`       | `usignal`              | 46 kB   | 333 B  | `cell.value` | `cell.value = v`   | yes             | no             | tiny; attributes a read to every enclosing effect; usignal batches, so the first paint lands on the next tick                                                |
| `uele/signals/alien-signals` | `alien-signals`        | 46 kB   | 288 B  | `cell()`     | `cell(v)`          | yes             | no             | plain-function signals, very fast                                                                                                                            |
| `uele/signals/sjs`           | `s-js`                 | 221 kB  | 379 B  | `cell()`     | `cell(v)`          | yes             | no             | classic S.js; `S.root` owns the disposer                                                                                                                     |
| `uele/signals/mobx`          | `mobx`                 | 4723 kB | 365 B  | `cell.get()` | `cell.set(v)`      | yes             | no             | boxed observables; configure mobx yourself                                                                                                                   |
| `uele/signals/rxjs`          | `rxjs`                 | 4392 kB | 431 B  | `cell.value` | `cell.next(v)`     | no              | yes            | subscribe-only: no reactive thunks; `BehaviorSubject` reads sync                                                                                             |
| `uele/signals/nanostores`    | `nanostores`           | 54 kB   | 348 B  | `cell.get()` | `cell.set(v)`      | no              | yes            | subscribe-only atoms; tiny and framework-neutral                                                                                                             |
| `uele/signals/tanstack`      | `@tanstack/store`      | 121 kB  | 437 B  | `cell.state` | `cell.setState(v)` | no              | yes            | `Store.subscribe()` is not synchronous, so a bare `Store` paints on its first change - `new Cell(v)` (or `api.signal(v)`) from the preset paints immediately |
| `uele/signals/solid`         | `solid-js`             | 1051 kB | 471 B  | `cell()`     | `cell.write(v)`    | yes             | no             | client build (`solid-js/dist/solid.js`)                                                                                                                      |
| `uele/signals/signals`       | `@webreflection/signals` | 25 kB   | 482 B  | `cell.value` | `cell.value = v`   | yes             | no             | Preact-like API in miniature (by the `usignal` author); the library calls any effect return value as a cleanup, so the preset swallows returns            |

- **reactive thunks** — functions and components that re-run when their signals change (needs an effect runner).
- **subscribe path** — driven through `.subscribe()`: works without an effect runner, but reactive
  thunks and components cannot re-render themselves.

Short version: **ulive** if you have no preference (smallest, zero deps), **preact signals** if you use
Preact, **nanostores** if you only need subscribe-based stores, **solid** if you are already in solid-js.

### Diff engine presets (`uele/diffs/*`)

Every engine satisfies the same `api.diff` contract — verified over 63 375 list-state transitions. The
built-in marker walk is the right answer for most apps; swap one in when you have a specific reason.

| preset                       | dependency        | install | preset | strategy                                             | pick it when                                 |
| ---------------------------- | ----------------- | ------- | ------ | ---------------------------------------------------- | -------------------------------------------- |
| `uele/diffs/builtin`         | `—`               | —       | 208 B  | marker walk built into uele                          | default; zero dependencies                   |
| `uele/diffs/swapdom`         | `swapdom`         | 45 kB   | 209 B  | keyed list diff written for uele's signature         | small keyed lists                            |
| `uele/diffs/udomdiff`        | `udomdiff`        | 25 kB   | 245 B  | keyed diff, the smallest of the classic trio         | battle-tested keyed lists                    |
| `uele/diffs/domdiff`         | `domdiff`         | 48 kB   | 279 B  | keyed diff with an options object (`{ before }`)     | keyed lists, WebReflection stack             |
| `uele/diffs/morphdom`        | `morphdom`        | 199 kB  | 291 B  | morphs elements in place (the old element survives)  | server-rendered HTML, keep focus/media state |
| `uele/diffs/nanomorph`       | `nanomorph`       | 85 kB   | 271 B  | morphs in place, tiny                                | choo-style apps, keep DOM state              |
| `uele/diffs/fast-array-diff` | `fast-array-diff` | 40 kB   | 448 B  | an LCS patch decides the order, uele moves the nodes | ordered lists with few moves                 |
| `uele/diffs/rebuild`         | `—`               | —       | 303 B  | remove all, insert all                               | tiny regions, or as a baseline in tests      |

Five dependency-free algorithm presets inspired by
[js-diff-benchmark](https://github.com/luwes/js-diff-benchmark) are also available:

| preset | installer | strategy |
| --- | --- | --- |
| `uele/diffs/spect` | `spect` | forward cursor reconciliation |
| `uele/diffs/snabbdom` | `snabbdom` | double-ended keyed reconciliation |
| `uele/diffs/heckel` | `heckel` | unique-token symbol table with move-aware DOM application |
| `uele/diffs/list-difference` | `listDifference` | indexed list matching with insertion, removal and moves |
| `uele/diffs/stage0` | `stage0` | longest increasing subsequence; leaves an ordered subset in place |

These are independent node-identity implementations, not framework wrappers or exact copies
of the benchmark code. They preserve live-region markers and static siblings and require no
additional package. Shared nodes are matched by object identity, not by their string representation.

```js
import { stage0 } from 'uele/diffs/stage0';
stage0(); // main entry point
// stage0(liteApi); // or pass the API object from uele/lite
```

Short version: keep the **built-in** walk; reach for **swapdom** / **udomdiff** / **domdiff** for long keyed
lists, **morphdom** / **nanomorph** when you must preserve DOM state (focus, media, CSS transitions).

## Best practices

- **Install one signal preset (and at most one diff preset), once, at startup.** `api` is a single shared
  object, so a second preset of the same kind simply overwrites the first - `install` clears every hook it does
  not set. Install it **before** you render: a thunk that was rendered with the default `api.effect` runs once
  and never updates.
- **Replace, do not mutate.** A cell only notifies on a write:

  ```js
  todos.value = [...todos.value, todo]; // one write, one paint
  todos.value.push(todo); // silent: nothing repaints
  ```

- **Return the undo.** `r()` and `sub()` hand back an unsubscribe function. Keep it and call it when the
  subtree goes away - see [Cleanup Support](#cleanup-support).
- **Key a list when the row is not the item.** The default key is the item's identity, which is perfect for
  primitives and wrong for objects you replace: pass `key={(item) => item.id}` (and give the content its own
  signals if the row depends on the index).
- **Render, do not act.** A function child re-runs on every change of what it reads, so anything with a side
  effect - appending to the document, starting a timer, subscribing - repeats on every update. Do that in an
  event handler, in `ref`, or in an effect you own and dispose.
- **Write utilities against `uele/reactive`.** `signal`/`computed`/`read`/`write`/`effect` work on every
  preset, and `canEffect()`/`canCompute()` tell you when a library cannot do something (the subscribe-only
  ones have no effect runner) - ask, do not assume. That is how `uele/ui`, `uele/flow` and `uele/router` stay
  preset-agnostic.
- **Handle errors where you subscribe.** A rejected promise or a failed observable never throws into the
  render: the previous content stays. `r(source, next, error)` is the form that sees the error.
- **Keep the built-in diff engine** unless you have a concrete reason (long keyed lists, or DOM state you
  must preserve). It has no dependencies, and it is the engine the conformance suite is written around.
- **Unwrap values in a custom prop.** A `props` handler is handed the raw value; `r(value, (v) => …)` is what
  makes a cell, a thunk or a plain value all work.
- **Use `uele/lite` for a widget, the full build for an app.** `lite` is ~2.4 kB, has its own `api` instance
  (so it can run a different preset than the page) and no control flow components.
- **Detach deliberately.** uele replaces a region's content on every update, and usub releases a subscription
  once its source is unreachable - but a manual subscription to a long-lived store keeps running until you
  call the unsubscribe. [Cleanup Support](#cleanup-support) walks through the options.

## Complete example apps

[`examples/todos/`](../examples/todos) holds the same todos app written for every signal preset - add,
toggle, delete, filter (all/active/completed), clear-completed. Every file is JSX and runnable as is:

```jsx
import { mountTodos } from "./examples/todos/preact.jsx";
mountTodos(document.body);
```

`test/examples.test.js` runs all eleven through the same scenarios, so the examples cannot rot.
Writing your own preset - a signal adapter or a diff engine - is documented in
[ADAPTERS.md](ADAPTERS.md).
