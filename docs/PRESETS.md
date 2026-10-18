# uele presets

One import, one call. Each preset assigns the complete surface (unused hooks are cleared, so switching
presets can never leave stale configuration behind) and returns the configured `api` object.

```jsx
import { usePreactSignals } from "uele/adapters/preact";

usePreactSignals(); // that is the whole setup
```

Every signal preset accepts an optional target - pass the `api` exported by `uele/lite` to
configure the tiny core instead. The signal/diff library itself is a peer dependency: install the one
you use (`npm i @preact/signals-core`), nothing else is pulled in.

All examples below are JSX; point your bundler at the automatic runtime
(`{ "jsx": "react-jsx", "jsxImportSource": "uele" }`, or
`esbuild: { jsx: "automatic", jsxImportSource: "uele" }`).

## Signal adapter presets

### `uele/adapters/alien-signals` - `useAlienSignals()`

Wire uele to `alien-signals` - plain-function signals: read `s()`, write `s(v)`.

```jsx
import { signal } from 'alien-signals';
import { useAlienSignals } from 'uele/adapters/alien-signals';

useAlienSignals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `count(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/mobx` - `useMobx()`

Wire uele to `mobx` - boxed observables and computed values.

```jsx
import { observable } from 'mobx';
import { useMobx } from 'uele/adapters/mobx';

useMobx(); // one call, whole api configured

const count = observable.box(0);

document.body.append(
  <button onclick={() => count.set(count.get() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.get()`, write it as `count.set(count.get() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/nanostores` - `useNanostores()`

Wire uele to `nanostores` - atoms driven through `.subscribe()`; no effect runner.

```jsx
import { atom } from 'nanostores';
import { useNanostores } from 'uele/adapters/nanostores';

useNanostores(); // one call, whole api configured

const count = atom(0);

document.body.append(
  <button onclick={() => count.set(count.get() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.get()`, write it as `count.set(count.get() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/preact` - `usePreactSignals()`

Wire uele to `@preact/signals-core` - `Signal` instances; since 1.13 they also expose `.subscribe()`.

```jsx
import { signal } from '@preact/signals-core';
import { usePreactSignals } from 'uele/adapters/preact';

usePreactSignals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/rxjs` - `useRxjs()`

Wire uele to `rxjs` - driven through `.subscribe()`; no effect runner, so no derived values.

```jsx
import { BehaviorSubject } from 'rxjs';
import { useRxjs } from 'uele/adapters/rxjs';

useRxjs(); // one call, whole api configured

const count = new BehaviorSubject(0);

document.body.append(
  <button onclick={() => count.next(count.value + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.next(count.value + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/signals` - `useSignals()`

Wire uele to `@webreflection/signals` - `Signal` instances with a Preact-like API.

```jsx
import { signal } from '@webreflection/signals';
import { useSignals } from 'uele/adapters/signals';

useSignals(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/sjs` - `useSjs()`

Wire uele to `s-js` - data nodes are read/written by calling them.

```jsx
import S from 's-js';
import { useSjs } from 'uele/adapters/sjs';

useSjs(); // one call, whole api configured

const count = S.data(0);

document.body.append(
  <button onclick={() => count(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `count(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/solid` - `useSolid()`

Wire uele to `solid-js` - accessors (signals and memos alike) from the CLIENT build.

```jsx
// node resolves `solid-js` to its no-op server build; apps bundle the client build
import { createSignal } from 'solid-js/dist/solid.js';
import { useSolid } from 'uele/adapters/solid';

useSolid(); // one call, whole api configured

const [count, setCount] = createSignal(0);

document.body.append(
  <button onclick={() => setCount(count() + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count()`, write it as `setCount(count() + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/tanstack` - `useTanstackStore()`

Wire uele to `@tanstack/store` - `Store` with `.state`/`.setState()`; `subscribe()` is not synchronous.

```jsx
import { Store } from '@tanstack/store';
import { useTanstackStore } from 'uele/adapters/tanstack';

useTanstackStore(); // one call, whole api configured

const count = new Store(0);

document.body.append(
  <button onclick={() => count.setState(count.state + 1)}>
    clicked {count} times
  </button>
);
```

Read it as `count.state`, write it as `count.setState(count.state + 1)` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/ulive` - `useUlive()`

Wire uele to `ulive` - signals with `peek`/`value`.

```jsx
import { signal } from 'ulive';
import { useUlive } from 'uele/adapters/ulive';

useUlive(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/usignal` - `useUsignal()`

Wire uele to `usignal` - `Signal` instances; a read is attributed to every enclosing effect.

```jsx
import { signal } from 'usignal';
import { useUsignal } from 'uele/adapters/usignal';

useUsignal(); // one call, whole api configured

const count = signal(0);

document.body.append(
  <button onclick={() => count.value = count.value + 1}>
    clicked {count} times
  </button>
);
```

Read it as `count.value`, write it as `count.value = count.value + 1` - and `uele/reactive` writes that code for you
(`signal()`, `read()`, `write()` work on every preset).

### `uele/adapters/vue` - `useVue()`

Wire uele to `@vue/reactivity` - `ref()`/`computed()` values.

```jsx
import { ref } from '@vue/reactivity';
import { useVue } from 'uele/adapters/vue';

useVue(); // one call, whole api configured

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

### `uele/diffs/builtin` - `useBuiltinDiff()`

Back to the built-in marker walk (the default): no `api.diff`, no dependency.

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useBuiltinDiff } from 'uele/diffs/builtin';
import { signal } from 'ulive';

useUlive();
useBuiltinDiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/domdiff` - `useDomdiff()`

`domdiff` - takes an options object instead of a node (`{ before: end }`).

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useDomdiff } from 'uele/diffs/domdiff';
import { signal } from 'ulive';

useUlive();
useDomdiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/fast-array-diff` - `useFastArrayDiff()`

`fast-array-diff` - its LCS patch decides the ordering, the preset performs the DOM moves.

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useFastArrayDiff } from 'uele/diffs/fast-array-diff';
import { signal } from 'ulive';

useUlive();
useFastArrayDiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/morphdom` - `useMorphdom()`

`morphdom` - updates nodes in place (the contract's write-back is handled for you by the shared adapter).

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useMorphdom } from 'uele/diffs/morphdom';
import { signal } from 'ulive';

useUlive();
useMorphdom(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/nanomorph` - `useNanomorph()`

`nanomorph` - updates nodes in place (write-back handled by the adapter).

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useNanomorph } from 'uele/diffs/nanomorph';
import { signal } from 'ulive';

useUlive();
useNanomorph(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/rebuild` - `useRebuild()`

The smallest conforming differ: drop everything, insert everything. Fine for tiny lists and a useful baseline in tests.

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useRebuild } from 'uele/diffs/rebuild';
import { signal } from 'ulive';

useUlive();
useRebuild(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/swapdom` - `useSwapdom()`

`swapdom` - a keyed differ written for exactly uele's `api.diff` signature.

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useSwapdom } from 'uele/diffs/swapdom';
import { signal } from 'ulive';

useUlive();
useSwapdom(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

### `uele/diffs/udomdiff` - `useUdomdiff()`

`udomdiff` - takes `(parent, a, b, get, before)`; uele supplies the get callback through `api.udom` and passes the end marker as `before`.

```jsx
import { For } from 'uele';
import { useUlive } from 'uele/adapters/ulive'; // any signal preset works
import { useUdomdiff } from 'uele/diffs/udomdiff';
import { signal } from 'ulive';

useUlive();
useUdomdiff(); // sets api.diff (and api.udom, when the engine needs it)

const items = signal([1, 2, 3]);
document.body.append(
  <ul>
    <For each={items} key={(item) => item}>{(item) => <li>{item}</li>}</For>
  </ul>
);
```

## Which one should I use?

### Signal presets (`uele/adapters/*`)

Install the library you want, call one function. Every preset is driven by the same conformance suite.
"install size" is the npm unpacked size of the library (all published files), not its bundle cost.

| preset                        | library                | install | preset | read         | write              | reactive thunks | subscribe path | notes                                                                                                                                                        |
| ----------------------------- | ---------------------- | ------- | ------ | ------------ | ------------------ | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uele/adapters/ulive`         | `ulive`                | 15 kB   | 266 B  | `cell.value` | `cell.value = v`   | yes             | no             | smallest default; the baseline uele is tested against                                                                                                        |
| `uele/adapters/preact`        | `@preact/signals-core` | 254 kB  | 360 B  | `cell.value` | `cell.value = v`   | yes             | yes            | signals also expose `.subscribe()`; great with Preact                                                                                                        |
| `uele/adapters/vue`           | `@vue/reactivity`      | 342 kB  | 323 B  | `cell.value` | `cell.value = v`   | yes             | no             | `ref()`/`computed()`; the effect needs `stop(runner)`                                                                                                        |
| `uele/adapters/usignal`       | `usignal`              | 46 kB   | 333 B  | `cell.value` | `cell.value = v`   | yes             | no             | tiny; attributes a read to every enclosing effect; usignal batches, so the first paint lands on the next tick                                                |
| `uele/adapters/alien-signals` | `alien-signals`        | 46 kB   | 288 B  | `cell()`     | `cell(v)`          | yes             | no             | plain-function signals, very fast                                                                                                                            |
| `uele/adapters/sjs`           | `s-js`                 | 221 kB  | 379 B  | `cell()`     | `cell(v)`          | yes             | no             | classic S.js; `S.root` owns the disposer                                                                                                                     |
| `uele/adapters/mobx`          | `mobx`                 | 4723 kB | 365 B  | `cell.get()` | `cell.set(v)`      | yes             | no             | boxed observables; configure mobx yourself                                                                                                                   |
| `uele/adapters/rxjs`          | `rxjs`                 | 4392 kB | 431 B  | `cell.value` | `cell.next(v)`     | no              | yes            | subscribe-only: no reactive thunks; `BehaviorSubject` reads sync                                                                                             |
| `uele/adapters/nanostores`    | `nanostores`           | 54 kB   | 348 B  | `cell.get()` | `cell.set(v)`      | no              | yes            | subscribe-only atoms; tiny and framework-neutral                                                                                                             |
| `uele/adapters/tanstack`      | `@tanstack/store`      | 121 kB  | 437 B  | `cell.state` | `cell.setState(v)` | no              | yes            | `Store.subscribe()` is not synchronous, so a bare `Store` paints on its first change - `new Cell(v)` (or `api.signal(v)`) from the preset paints immediately |
| `uele/adapters/solid`         | `solid-js`             | 1051 kB | 471 B  | `cell()`     | `cell.write(v)`    | yes             | no             | client build (`solid-js/dist/solid.js`)                                                                                                                      |
| `uele/adapters/signals`       | `@webreflection/signals` | 25 kB   | 482 B  | `cell.value` | `cell.value = v`   | yes             | no             | Preact-like API in miniature (by the `usignal` author); the library calls any effect return value as a cleanup, so the preset swallows returns            |

- **reactive thunks** — functions and components that re-run when their signals change (needs an effect runner).
- **subscribe path** — driven through `.subscribe()`: works without an effect runner, but reactive
  thunks and components cannot re-render themselves.

Short version: **ulive** if you have no preference (smallest, zero deps), **preact signals** if you use
Preact, **nanostores** if you only need subscribe-based stores, **solid** if you are already in solid-js.

### Diff engine presets (`uele/diffs/*`)

Every engine satisfies the same `api.diff` contract — verified over 42 250 list-state transitions. The
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

Short version: keep the **built-in** walk; reach for **swapdom** / **udomdiff** / **domdiff** for long keyed
lists, **morphdom** / **nanomorph** when you must preserve DOM state (focus, media, CSS transitions).

## Best practices

- **Install one signal preset (and at most one diff preset), once, at startup.** `api` is a single shared
  object, so a second preset of the same kind simply overwrites the first - `wire` clears every hook it does
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
