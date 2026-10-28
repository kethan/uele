# Writing a preset

A preset is a tiny module that tells uele how a signal library (or a diff engine) behaves. Everything
else — `h`, `add`, `For`, `map`, `If`, `useLive`, `uele/ui`, `uele/flow`, `uele/router` — is written
against that surface, so one file is all it takes to make the whole library work with a new signal
implementation.

This guide is the collected experience of building the signal integrations and diff presets that ship
with uele: the contract, a complete worked example, and the pitfalls that cost us real debugging time.

* [The `api` object](#the-api-object)
* [1. A signal adapter, line by line](#1-a-signal-adapter-line-by-line)
* [2. The authoring hooks (what `uele/reactive` needs)](#2-the-authoring-hooks-what-uelereactive-needs)
* [3. A diff engine preset](#3-a-diff-engine-preset)
* [4. Best practices](#4-best-practices)
* [5. The pitfalls, and how each preset handles them](#5-the-pitfalls-and-how-each-preset-handles-them)
* [6. Testing a preset](#6-testing-a-preset)
* [7. Checklist](#7-checklist)

## The `api` object

`import { api } from 'uele'` is a plain mutable object. Assigning to it is the whole extension
mechanism — there is no registration, no plugin list, no build step.

| hook | signature | what uele does with it |
| --- | --- | --- |
| `api.is(value)` | `(v) => boolean` | "is this a cell of your library?" |
| `api.get(cell)` | `(cell) => value` | read a cell's current value |
| `api.effect(fn)` | `(fn) => disposer` | run `fn`, re-run it when the cells it read change |
| `api.cleanup(fn)` | `(fn) => void` | register a teardown for the *current* effect run |
| `api.any(src)` | `(src) => (next) => unsubscribe` | subscribe to a non-cell source (promise, observable…) |
| `api.diff` | `(parent, old, next, end)` | apply a list update (see [§3](#3-a-diff-engine-preset)) |
| `api.udom` | `(node, key) => node` | `get` helper for engines with the udomdiff signature |
| `authoring hooks` | see [§2](#2-the-authoring-hooks-what-uelereactive-needs) | used by `uele/reactive` |

`api.get` is the read half of the contract and `api.is` the gate in front of it: uele calls `api.is`
before `api.get`, and treats anything else as a plain value.

`api.effect` + `api.cleanup` are the write half. uele never calls your library directly outside these
hooks, so an adapter is the *only* place library-specific behaviour lives.

## 1. A signal adapter, line by line

Here is a complete adapter for a hypothetical library with `createCell(value)`, `cell.get()` and
`cell.set(v)`, plus `watch(fn)` that returns a stop function:

```js
// mylib.js
import { api } from 'uele';
import { install } from './internal.js'; // optional helper: see below
import { createCell, watch } from 'mylib';

export const mylib = (target = api) =>
  install(target, {
    // ---- the four hooks uele itself needs ----
    is: (v) => v instanceof Cell,
    get: (v) => v.get(),
    effect: watch,
    // cleanup: only needed if the library has one (solid, sinuous, s-js)

    // ---- the authoring hooks (uele/reactive) ----
    signal: (v) => createCell(v),
    computed: (fn) => createComputed(fn),
    set: (cell, v) => cell.set(v),
    batch: (fn) => transaction(fn),
    untracked: (fn) => peek(fn)
  });
```

That is a preset. `mylib()` is all a user calls.

### `install(target, hooks)` — the shared helper

`signals/internal.js` contains the shared helpers used by the shipped integrations.
It is deliberately **not** a public package subpath. When writing a standalone integration,
keep a local helper (the source can serve as a reference), or assign the complete hook
surface directly. The imports below refer to that local helper:

```js
import { scoped, install, HOOKS } from './internal.js';
```

* **`install(target, hooks)`** assigns every hook you pass and **clears every hook you do not**
  (the full list is `HOOKS`: `is`, `get`, `effect`, `cleanup`, `any`, `signal`, `computed`, `set`,
  `batch`, `untracked`). This is what makes switching presets safe — calling `vue()` after
  `preactSignals()` cannot leave a preact `is()` behind. It returns the configured `api`.
* **`scoped(run)`** wraps a library effect runner into the `(api.effect, api.cleanup)` pair, for
  libraries whose effects accept a cleanup registration but do not expose a disposer:

  ```js
  const s = scoped((fn) => {
    let dispose;
    mylib.root((d) => {
      dispose = d;
      mylib.effect(fn);
    });
    return dispose;
  });
  install(api, { effect: s.effect, cleanup: s.cleanup /* …the rest of the hooks */ });
  ```

Both are optional. A preset that assigns the hooks by hand is exactly as valid — `install` is only
convenience plus the "clear what you did not set" guarantee.

### Naming and shape

* export one function: `use<Library>(target = api)` — `preactSignals`, `solid`, `mobx`…
* accept an optional `target` so the preset can configure `uele/lite` too
  (`preactSignals(liteApi)`)
* keep the library import static and the dependency an **optional peerDependency** — the eleven
  libraries in this repo add nothing to the install size of an app that uses one of them
* ship a `.d.ts` next to it, and let the build emit the `.cjs` twin (`rollup -c` does it)

## 2. The authoring hooks (what `uele/reactive` needs)

The four hooks above make uele *render* cells. Five more make it possible to **write code that creates
cells without knowing the library** — that is what `uele/reactive`, `uele/ui`, `uele/flow` and
`uele/router` are built on:

| hook | signature | used by |
| --- | --- | --- |
| `signal(value)` | `(v) => cell` | `signal()` |
| `computed(fn)` | `(fn) => cell` | `computed()` |
| `set(cell, value)` | `(cell, v) => void` | `write()` |
| `batch(fn)` | `(fn) => void` | `batch()` |
| `untracked(fn)` | `(fn) => value` | `untracked()` |

Publish them when the library has an equivalent. Leave them out when it does not — `uele/reactive`
then reports the truth instead of pretending:

```js
import { computed, canCompute, canEffect } from 'uele/reactive';

const doubled = canCompute() ? computed(() => read(count) * 2) : null; // rxjs, nanostores, tanstack
```

Calling `computed()` with no `computed` hook throws a named error explaining which preset is missing
what. There is no silent degradation, and no library-specific branch in user code.

## 3. A diff engine preset

`api.diff(parent, oldNodes, newNodes, end)` must leave `newNodes` in the DOM **before** `end`
(the end marker of the live region uele is updating) and may reuse nodes from `oldNodes`. This is the
[swapdom](https://github.com/dy/swapdom) signature:

```js
// diffs/swapdom.js
import { api } from 'uele';
import swapdom from 'swapdom';

export const swapdom = (target = api) => {
  target.diff = (parent, oldNodes, newNodes, end) => swapdom(parent, oldNodes, newNodes, end);
  return target;
};
```

Engines with the [udomdiff](https://github.com/WebReflection/udomdiff) signature take a `get` callback
instead; set `api.udom` and uele calls `api.diff(parent, old, next, api.udom, end)`:

```js
target.udom = (node, key) => node.__key === key ? node : null; // or your own key store
target.diff = (parent, oldNodes, newNodes, get, end) => udomdiff(parent, oldNodes, newNodes, get, end);
```

Engines that **mutate in place** (morphdom, nanomorph) keep the old element and write the new content
into it, so the nodes uele holds afterwards are not the ones it passed in. `diffs/util.js` exports
`morphAdapter(morphFn)` for exactly that: it runs the engine over matching pairs, writes the surviving
nodes back into the `newNodes` array uele owns, and reconciles the order afterwards (a morpher never
moves nodes itself).

```js
import { morphAdapter } from './util.js';

target.diff = morphAdapter((from, to) => morphdom(from, to));
```

`uele/diffs/rebuild` is the smallest conforming differ — remove everything, insert everything — and is
the shortest correct starting point when porting an engine:

```js
export const rebuild = (target = api) => {
  target.diff = (parent, oldNodes, newNodes, end) => {
    oldNodes.forEach((node) => parent.removeChild(node));
    newNodes.forEach((node) => parent.insertBefore(node, end || null));
  };
  target.udom = undefined; // never mix the two signatures
  return target;
};
```

Note the two habits in those nine lines, both of which the conformance suite enforces: clear `api.udom`
when you set `api.diff` (the two signatures are mutually exclusive), and insert relative to `end`, never
`parent.appendChild` — the region uele is updating is bounded by a marker node, and siblings after it
must stay where they are.

## 4. Best practices

**Assign the complete surface.** Use `install()` (or assign and clear by hand) so a preset switch cannot
leave a stale hook behind. The single most common bug in an unfinished adapter is a leftover `is()`
from another library that makes every cell "look foreign".

**Make `is()` cheap and narrow.** It is called for every attribute value, every child, every prop.
`v instanceof Signal` and `typeof v === 'function' && v.name.includes('readSignal')` are fine; walking
an object graph is not. When in doubt, prefer a false negative for foreign values over a false positive
for plain ones.

**Return a disposer from `effect`, always.** uele calls it when the binding goes away. If the library
gives you a stop function, return it; if it gives you a root, return the root's dispose; if it gives
you nothing, return a no-op and say so in the doc comment rather than leaking.

**Do not swallow errors in `effect`.** uele treats an observable error as terminal for that binding on
purpose (`README.md` → *Errors*): a throwing source must not be retried forever. If the library
converts throws into its own channel, do not "fix" that in the adapter.

**Keep the adapter stateless.** Module-level mutable state in an adapter is a red flag; the two places
the shipped presets need it (s-js batch mirroring, mobx configuration) are documented inline with the
reason.

**Treat the library as an optional peer dependency** and list it in `package.json` as one, so an app
that uses `preactSignals()` installs one library, not eleven.

**Document the library's quirks in the file's jsdoc**, not in the README: `docs/PRESETS.md` is
generated from those blocks (`python3 scripts/gen-presets-doc.py`), so the comment *is* the doc.

**Name the file after the npm package** (`signals/alien-signals.js`, `diffs/fast-array-diff.js`) so
`uele/signals/<slug>` is guessable, and export `use<Slug>`.

## 5. The pitfalls, and how each preset handles them

These are real. Every one of them was found by the conformance suite in this repo.

### A cell that does not emit on subscribe renders empty

If `subscribe()` does not call the listener immediately, a freshly rendered cell shows nothing until
its first *change* — the worst kind of bug, because the app looks fine after the first interaction.
`@tanstack/store` behaves this way; the preset fixes it at the source:

```js
class Cell extends Store {
  subscribe(listener) {
    listener(this.state);   // replay, then delegate
    return super.subscribe(listener);
  }
}

// …and the preset creates its cells with it:
const hooks = { signal: (v) => new Cell(v) /* …the rest of the hooks */ };
```

`rxjs` avoids it by using `BehaviorSubject` (which replays); a plain `Subject` would need the same
trick. Test: render a cell as a child and assert the text *before* any update.

### `batch()` that cannot see its own writes

Batching must not change results, only the number of notifications. `S.freeze()` defers writes, so a
read inside the batch returns the *old* value — `batch(() => { inc(); inc(); })` would end at 1 instead
of 2. And writing the same node twice inside a freeze throws `conflicting changes`. The s-js preset
keeps a mirror of pending writes, serves reads from it while a batch is open, and commits one final
value per node at the end:

```js
const hooks = (S) => {
  let depth = 0;
  const pending = new Map();
  return {
    get: (v) => (depth > 0 && pending.has(v) ? pending.get(v) : v()),
    set: (cell, v) => { if (depth > 0) pending.set(cell, v); else cell(v); },
    batch: (fn) => {
      depth++;
      try { return fn(); } finally { depth--; }
      // …then commit one final value per node inside a single S.freeze()
    }
  };
};
```

Rule of thumb: if your `batch` can change the *result* of the callback, do not expose it — running `fn`
immediately is always correct, batching is only an optimisation.

### Function cells: read and write are the same call

For s-js, alien-signals and solid the cell *is* a function. Consequences:

* `is()` must accept functions, which is a broad predicate — keep it as narrow as the library allows
  (solid: `v.name.includes('readSignal')`).
* Writes must go through the library's own hook. `write()` in `uele/reactive` therefore asks
  `api.is(cell)` **first** and only then falls back to shape sniffing (`.set`, `.next`, `.setState`,
  `.value`) for foreign cells. Getting this order wrong is subtle: it silently no-ops for one library
  and throws for another.
* Where the library splits read and write (solid's `createSignal` → `[read, write]`), attach the writer
  to the reader (`read.write = write`) in your `signal()` hook so one value is both cell and writer —
  and, in app code, pass a setter function as `model`: `<Input value={newTodo} model={setNewTodo} />`.

### Effects need an owner, and a cleanup hook

Libraries that scope disposals to a root (`S.root`, `createRoot`) need `scoped()` so each effect run
gets its own cleanup list, and `api.cleanup` must replace the previous teardown on re-run — not append
to it. Solid additionally needs `solid-js/dist/solid.js`: node resolves the bare package to its no-op
server build.

### Subscribe-only libraries have no effect runner

`rxjs`, `nanostores` and `@tanstack/store` can *subscribe* but cannot re-run a function. Those presets
deliberately publish no `effect`/`computed`: cells render and update (through the subscribe path), but
reactive thunks and `computed()` do not exist. Say so in the jsdoc and let `canEffect()` answer at
runtime. Do not fake an effect runner with `subscribe` — it double-renders and, worse, makes
`computed()` look available.

### Attributes are live, so `api.get` runs inside effects

Any prop can be a cell, so `api.get` is called inside an effect run. It must not subscribe on its own
(use the library's *untracked* read: `S.sample`, `untracked`, `peek`) — otherwise every attribute read
registers a dependency of an unrelated effect. `usignal` attributes a read to every enclosing effect;
that is documented in its preset because it changes how a user writes computed values.

### Diff engines mutate the array you hand them

In-place morphing engines replace nodes. If your `api.diff` does not write the surviving nodes back
into the `newNodes` array, uele's next update operates on detached nodes and the region goes blank
after two updates. Use `morphAdapter` from `diffs/util.js`, and run the 4 225-transition conformance
suite (`test/diff.transitions.test.js`) — it catches this on the second transition.

## 6. Testing a preset

Do not write a bespoke suite: drop the preset into the shared ones, which already assert the behaviour
that matters.

**1. The conformance suite** — one entry in `test/helpers/signal-adapters.js`, an async factory that
installs the hooks and describes the cell API:

```js
const mylib = async () => {
  const m = await import('mylib');
  const s = scoped(m.watch);
  return {
    name: 'mylib',
    reactiveThunks: true,
    notes: 'cells with get/set; watch() returns a disposer',
    overrides: { is: (v) => v instanceof Cell, get: (v) => v.get(), effect: s.effect, cleanup: s.cleanup },
    signal: (v) => m.createCell(v),
    set: (cell, v) => cell.set(v),
    read: (cell) => cell.get(),
    computed: (cell, fn) => m.createComputed(() => fn(cell.get()))
  };
};
export const ADAPTERS = [ulive, preact, vue, /* … */ mylib];
```

`test/signals.conformance.test.js` and `test/signals.libraries.test.js` then drive your library with the
same assertions as the other eleven (cells as children, as attributes, in `For`, in effects, dispose
semantics, and the "no stale hook after a preset switch" rule).

**2. The authoring/flow/router suite** — add the slug to the `PRESETS` table in `test/reactive.test.js`
and the same code that runs on every other preset runs on yours: `signal`/`computed`/`effect`/`batch`,
the `uele/ui` primitives, `Suspense`/`Await`/`ErrorBoundary`/`Portal`/`Title`, and the router.

**3. A diff engine** — one function in `test/helpers/diff-engines.js`, then
`test/diff.transitions.test.js` runs 4 225 exhaustive list-state transitions through it, and
`test/diff.conformance.test.js` pins the contract (after the call, `parent` holds exactly `newNodes`, in
order, with the end marker untouched).

**4. A complete app** — write `examples/todos/<slug>.jsx` and add `['<slug>', 'mylib']` to the `APPS`
table in `test/examples.test.js`; six scenarios (add, toggle, delete, filter, clear-completed,
independent instances) then prove the preset end to end. `docs/PRESETS.md` picks it up too.

Then run the gate: `npm test`, `npm run test:coverage` (100% is enforced on `src/`),
`npm run test:bundles` (the built ESM **and** CJS output), `npm run test:types`, `npm run size` and
`npm run test:pack`.

## 7. Checklist

- [ ] `signals/<slug>.js` exporting `use<Slug>(target = api)`; `.d.ts` beside it
- [ ] `install()` (or assign **and clear**) so no hook survives a preset switch
- [ ] `is` / `get` / `effect` (+ `cleanup` if the library has one)
- [ ] authoring hooks: `signal`, `computed`, `set`, `batch`, `untracked` — or a documented reason not to
- [ ] jsdoc block: what it wires, how to read/write a cell, the library's quirks (`docs/PRESETS.md` is
      generated from it by `python3 scripts/gen-presets-doc.py`)
- [ ] the library in `peerDependencies` **and** `peerDependenciesMeta.<pkg>.optional: true`
- [ ] entries in `test/helpers/signal-adapters.js` or `test/helpers/diff-engines.js`, in the `PRESETS`
      table of `test/reactive.test.js`, and an `examples/todos/<slug>.jsx` app
- [ ] subpath exported (`python3 scripts/add-subpath.py <name>` for a new top-level entry point)
- [ ] `npm test && npm run test:coverage && npm run test:bundles && npm run test:types && npm run size && npm run test:pack`
