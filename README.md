# UEle - Universal Element

A Reactive frontend library.

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uele) [![Badge size](https://deno.bundlejs.com/badge?q=uele&treeshake=[*]&config={"compression":"brotli"})](https://unpkg.com/uele) [![Badge size](https://deno.bundlejs.com/badge?q=uele&treeshake=[*]&config={"compression":"gzip"})](https://unpkg.com/uele)

**yarn**: `yarn add uele`

**npm**: `npm i uele`

**cdn**: https://unpkg.com/uele

**module**: https://unpkg.com/uele?module

### Lite Version

[![Badge size](https://deno.bundlejs.com/badge?q=uele/lite&treeshake=[{h}]&config={"compression":"brotli"})](https://unpkg.com/uele/lite) [![Badge size](https://deno.bundlejs.com/badge?q=uele/lite&treeshake=[{h}]&config={"compression":"gzip"})](https://unpkg.com/uele/lite)

**cdn**: https://unpkg.com/uele/lite

**module**: https://unpkg.com/uele/lite?module

```js
import { h, r, is, get, api, add, props, useLive } from "uele/lite";

// @preact/signals, ulive, usignal api config
api.effect = effect;
api.is = (v) => v.peek;
api.get = (v) => v.value;
```

- **Tiny** [![Badge size](https://deno.bundlejs.com/badge?q=uele/lite&treeshake=[{h}]&config={"compression":"brotli"})](https://unpkg.com/uele/lite)
- **Simple API**
- **Fast**
- **JSX**
- **Fragment**
- **Components**
- **SVG and MATH ML**
- **Refs**
- **Style Maps**
- **Lazy Components**
- **Promise**
- **AsyncIterable**
- **Observable** (`subscribe`/`Symbol.observable`)
- **Control Flow Components** - If, For, Show, Switch, Match
- **Extend with any reactive library using api** - effect, is, get
- **Efficient Array Diffing with For and map**
- **Add Any Diffing** - Using api.diff
- **Automatic Cleanup for Subscriptions**
- **Extend html attributes and props**

1. [counter](#counter)
2. [h](#h)
3. [lazy](#lazy)
4. [map](#map)
5. [Example](#example)
6. [Utility Functions](#utility-functions)
   - [get](#get)
   - [r](#r)
   - [f](#f)
   - [useLive](#uselive)
7. [Props](#props)
8. [Control Flow Components](#control-flow-components)
   - [If and Show](#if-and-show)
   - [For](#for)
   - [Switch and Match](#switch-and-match)
9. [Cleanup Support](#cleanup-support)
10. [Other Settings](#other-settings)

11. [For any other reactive library](#for-any-other-reactive-library)

12. [Thanks and Inspiration](#thanks-and-inspiration)
13. [License](#license)

### Counter

### Without Build tools

#### 1. h

```js
import { h, useLive } from "uele";

let [count, setCount] = useLive(0);

document.body.append(
  h("main", [
    h("button", { onclick: () => setCount((c) => c - 1) }, "-"),
    count,
    h("button", { onclick: () => setCount((c) => c + 1) }, "+"),
  ])
);
```

#### 2. html

```js
import { h, useLive } from "uele";
import htm from "htm";
const html = htm.bind(h);

let [count, setCount] = useLive(0);

document.body.append(
  html`
    <main>
      <button onClick=${() => setCount((c) => c - 1)}>-</button>
      ${count}
      <button onClick=${() => setCount((c) => c + 1)}>+</button>
    </main>
  `
);
```

#### 3. f

```js
import { h, useLive, f } from "uele";
const { button, main } = f(h);

let [count, setCount] = useLive(0);

document.body.append(
  main([
    button({ onclick: () => setCount((c) => c - 1) }, "-"),
    count,
    button({ onclick: () => setCount((c) => c + 1) }, "+"),
  ])
);
```

### With Build tools

#### 4. jsx

The package ships an [automatic JSX runtime](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html),
so no `h` import is needed and components are resolved from the same module instance as `import ... from "uele"`.

```jsonc
// tsconfig.json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "uele" } }
```

```js
// or esbuild/vite - vite.config.js
export default {
  esbuild: { jsx: "automatic", jsxImportSource: "uele" }
};
```

```jsx
import { useLive } from "uele";

let [count, setCount] = useLive(0);

document.body.append(
  <main>
    <button onClick={() => setCount((c) => c - 1)}>-</button>
    {count}
    <button onClick={() => setCount((c) => c + 1)}>+</button>
  </main>
);
```

`uele/jsx-runtime` and `uele/jsx-dev-runtime` only re-export the shared `h` (`Fragment === h`) - importing both
the runtime and the library never duplicates the implementation.

### h

```jsx
let frag = (
  <>
    {asyncIterable} or {promise} {/* or any html node, component, signal or library */}
  </>
);
```

### lazy

Load a component lazily with an optional fallback

```jsx
const LazyComp = lazy(() => import("./SomeComp"), <div>Failed</div>);
```

### map

Keyed list rendering with node reuse.

```jsx
import { map } from "uele";

let items = o([1, 2, 3]);

const Items = () => {
  return map(
    items,
    (item, i) => (
      <div>
        {item} {i}
      </div>
    ),
    <div>No items</div>,
    (item, i) => item.id // optional key, defaults to the item itself
  );
};
```

**Node reuse**: a node is reused while its key is present, and the callback is *not* re-run for reused keys.
Items are keyed by identity (`key = (v, i) => v`) unless a `key` function is given, so a pure reorder only moves
existing nodes - the rendered content (including `i`) stays as it was for that node. Give a key (or make the
content reactive) when the callback output depends on the index. `For` uses the same engine:

```jsx
<For each={items} key={(item) => item.id} fallback={<div>No items</div>}>
  {(item, i) => <div>{item} {i}</div>}
</For>
```

Lists accept any iterable (`Array`, `Set`, generator, `NodeList`). Nodes whose keys disappear are released
immediately, so filtering a large list does not leak nodes. A node is reused at most once per render, so
duplicate keys are safe: with the default key `[1, 1, 2]` renders three elements (the second `1` builds a fresh
node).

### Example

```jsx
import {
  h,
  lazy,
  api,
  If,
  For,
  map,
  get,
  r,
  useLive,
  props,
} from "uele";

import { o, effect, memo } from "ulive/fn"; // Or any other reactive library

// ulive settings
api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v();

// Check below for other reactive library settings

const LazyComp = lazy(() => import("./lazy"));

// Async Component
const TodoItem = async ({ id }) => {
  let api = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  let todo = await api.json();

  return (
    <li>
      <span>{todo.title}</span>
      <input type="checkbox" checked={todo.completed} />
    </li>
  );
};

const count = o(0);
const inc = () => count(count() + 1);
const dec = () => count(count() - 1);

const Counter = () => {
  let square = memo(() => count() * count());
  let cube = memo(() => square() * count());
  effect(() => console.log(count(), square(), cube()));
  return (
    <div>
      <div>
        Count: {count} {square} {cube}
      </div>
      <button onclick={inc}>+</button>
      <button onclick={dec}>-</button>
    </div>
  );
};

// AsyncIterator

const asyncIterable = {
  [Symbol.asyncIterator]() {
    return {
      i: 0,
      next() {
        if (this.i < 200)
          return new Promise((ok) =>
            setTimeout(
              () =>
                ok({
                  value: <div>{this.i++}</div>,
                  done: false,
                }),
              10
            )
          );
        return new Promise((ok) => ok({ done: true }));
      },
    };
  },
};

let items = o([1, 2, 3]);

const App = () => (
  <main>
    <Counter />
    <LazyComp />
    <TodoItem />
    {asyncIterable}
    {map(items, (item, i) => (
      <div>
        {item} {i}
      </div>
    ))}
    <svg>...</svg>
  </main>
);

document.body.append(<App />);
```

### Utility Functions

#### `get`

A utility function to handle and unwrap values of signals, observables, etc., especially functions.

```js
import { get } from "uele";

let value = get(someReactiveSignal);
```

#### `r`

The `r` function handles reactive subscriptions, providing a callback when the value changes.

```js
import { r } from "uele";

r(someObservable, (value, is) => {
  console.log("Value changed to", value, is);
});
```

#### `f`

The `f` function is a utility that provides a convenient shorthand for creating elements using the h function. It returns a proxy that allows you to call HTML elements as functions directly. The property name is used as the tag name, so `f(h)["my-widget"]({ id: "x" })` creates a custom element.

```js
import { h, useLive, f } from "uele";
const { button, main } = f(h);

const [count, setCount] = useLive(0);

document.body.append(
  main([
    button({ onclick: () => setCount((c) => c - 1) }, "-"),
    count,
    button({ onclick: () => setCount((c) => c + 1) }, "+"),
  ])
);
```

#### `useLive`

`useLive` helps manage dynamic parts of the DOM by tracking specific start and end markers.

```jsx
import { useLive } from "uele";

let [live, setLive] = useLive("....");

let c = 0;
setInterval(() => {
  setLive(c++);
}, 1000);

const App = () => <main>{live}</main>;
```

### Attributes, properties and events

- `null`/`undefined`/`false` remove an attribute, `true` sets it to `""`, numbers are stringified.
- Attributes that exist as element properties (`value`, `checked`, `id`, `textContent`, ...) are set as
  properties and accept reactive values; `null`/`undefined` empty them instead of writing `"null"`.
- `className` maps to `class`. A `class` object toggles classes (`{ active: signal }`), a string/reactive string
  sets the attribute, and an array is joined by the DOM (`["a","b"]` -> `"a,b"`).
- `style` accepts a string or an object; object keys may be camelCase, kebab-case or custom properties
  (`"--my-var"`), values may be reactive and `null`/`undefined` clears them. Numbers must carry a unit.
- `on*` handlers are assigned as properties when the element has that handler (`onclick`), otherwise they are
  bound with `addEventListener`, so custom events work: `h("div", { onmyevt: fn })`.
  Assigning a falsy value unregisters a native handler.
- `ref` receives `(element, props)` for elements.
- Attributes are applied after the children are built.

### Props

The `props` object allows setting custom properties and event handlers on elements.

```jsx
import { props } from "uele";

props.set("autofocus", (tag, value, name, attrs) => {
	setTimeout(() => tag.focus(), 0);
});

props.set("validate", (node, validateFn) => {
	node.addEventListener("input", () => {
		const error = validateFn(node.value);
		if (error) {
			console.log("error", error);
		} else {
			console.log("no err");
		}
	});
});

props.set("tooltip", (node, value) => {
	const tooltip = <div class="tooltip">{value}</div>;
	node.addEventListener("mouseenter", () => {
		document.body.appendChild(tooltip);
		const { left, top } = node.getBoundingClientRect();
		tooltip.style.position = "absolute";
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top - 20}px`;
	});

	node.addEventListener("mouseleave", () => {
		tooltip.remove();
	});
});

props.set("unmount", (node, cleanupFn) => {
	// Check if the node has a parent node
const setupObserver = () => {
	if (node.parentNode) {
		// Create a MutationObserver to watch for DOM changes (removals)
		const observer = new MutationObserver((mutationsList) => {
			for (let mutation of mutationsList) {
				mutation.removedNodes.forEach((removedNode) => {
					if (removedNode === node) {
						// Node has been removed, trigger the cleanup function
						cleanupFn();
						observer.disconnect(); // Stop observing
					}
				});
			}
		});

		// Start observing the parent node for childList changes (node removals)
		observer.observe(node.parentNode, { childList: true });
	} else {
		// If node has no parentNode, retry after DOM insertion
		requestAnimationFrame(setupObserver); // Try again on the next frame
	}
};

	setupObserver(); // Initialize the observer
});
<>
	<input autofocus/>
	<input validate={(val) => (val.length < 3 ? "Too short" : "")} />
	<button tooltip={<div>click me!</div>}>Hover me</button>
	<div ref={(v) => { setTimeout(() => v.remove(), 2000)}}
		 unmount={() => console.log("unmounted!")}>
		Remove me
	</div>
</>
```

### Control Flow Components

Control flow components accept boolean or reactive values for conditions.

#### `If` and `Show`

```jsx
import { If, Show } from 'uele';

<>
  <If when={cond} fallback={<div>False</div>}>
    <div>True</div>
  </If>

  <Show when={cond} fallback={<div>False</div>}>
    <div>True</div>
  </Show>
</>
```

#### `For`

```jsx
import { For } from "uele";

<For each={[1, 2, 3]} fallback={<div>No Items</div>}>
  {(val) => <div>{val}</div>}
</For>;
```

#### `Switch` and `Match`

```jsx
import { Switch, Match } from "uele";

<Switch fallback={<div>Default case</div>}>
  <Match when={condition1}>
    <div>Case 1</div>
  </Match>
  <Match when={condition2}>
    <div>Case 2</div>
  </Match>
</Switch>;
```

### 30-second todos app

Copy, paste, run — the whole app in JSX (this is the exact code `test/readme.test.jsx` runs):

```jsx
import { For } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal } from "@preact/signals-core";
import { Form, Row, Card, Stack, Button, Input, Checkbox, Label } from "uele/ui";

usePreactSignals(); // one call, whole api configured

const TodoApp = () => {
  const text = signal("");
  const todos = signal([]);
  let seq = 0;
  const add = () => {
    const title = text.value.trim();
    if (title) todos.value = [...todos.value, { id: ++seq, title, done: false }];
    text.value = "";
  };
  const toggle = (todo) =>
    (todos.value = todos.value.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));

  return (
    <Card>
      <h1>Todos</h1>
      <Form onSubmit={add}>
        <Row>
          <Input model={text} placeholder="What needs doing?" />
          <Button type="submit">Add</Button>
        </Row>
      </Form>
      <Stack>
        <For each={todos} fallback={<Label>Nothing here</Label>}>
          {(todo) => (
            <Row>
              <Checkbox checked={todo.done} onChange={() => toggle(todo)} />
              <Label style={todo.done ? { textDecoration: "line-through" } : null}>{todo.title}</Label>
              <Button onclick={() => (todos.value = todos.value.filter((t) => t.id !== todo.id))}>×</Button>
            </Row>
          )}
        </For>
      </Stack>
    </Card>
  );
};

document.body.append(TodoApp());
```

The same app, written for each of the eleven signal libraries, lives in [`examples/todos/`](examples/todos) —
each one is a complete runnable file (`mountTodos(document.body)`) and is driven end to end by
`test/examples.test.js`: add, toggle, delete, filter (all/active/completed), clear-completed and
independent instances.

## UI primitives

`uele/ui` is a dozen thin wrappers over `h()` so the common tags read like components. Every prop is live —
pass a signal anywhere a value is expected:

```jsx
import { Form, Field, Button, Input, Textarea, Checkbox, Select, Card, Stack, Row, Label } from "uele/ui";

<>
  <Button onclick={save}>Save</Button>                  {/* defaults to type="button" */}
  <Input model={cell} />                                {/* two-way bound (a value cell works too) */}
  <Checkbox model={done} />                             {/* checked <-> boolean */}
  <Select model={choice} options={["a", { value: "b", label: "B" }]} />
  <Field label="Name"><Input model={name} /></Field>
  <Card>…</Card> <Stack>…</Stack> <Row>…</Row>           {/* minimal layout defaults */}
  <Form onSubmit={save}>…</Form>                        {/* preventDefault, then onSubmit */}
</>
```

They are plain functions, so the call form (`Card({ children: "…" })`) works too — JSX is just nicer.

`model` accepts any writable cell our presets produce (`.value`, `.set()`, `.next()`, `.setState()`) or a
plain setter function. Pass the cell as `value`/`checked` instead and it becomes the model automatically.

## Presets: one-call interop

Instead of wiring the `api` object by hand, import a preset and call it:

```js
import { usePreactSignals } from "uele/adapters/preact";

usePreactSignals(); // that is the whole setup
```

There is one preset per supported signal library (`uele/adapters/*` - 11 of them, `ulive` to
`solid-js`) and per diff engine (`uele/diffs/*` - 8, the built-in marker walk through `swapdom`,
`morphdom` and `fast-array-diff`). Every preset assigns the complete surface - unused hooks are cleared, so
switching presets can never leave stale configuration behind - accepts an optional target
(`usePreactSignals(liteApi)` configures `uele/lite`), and treats the signal/diff library as an
optional peer dependency: install the one you use, nothing else is pulled in. All of them are documented with
runnable examples in [docs/PRESETS.md](docs/PRESETS.md) and driven end to end by `test/presets.test.js`.

## Write once, run on any preset (`uele/reactive`)

Utilities and primitives should not care which signal library is installed. `uele/reactive` is nine
functions that delegate to the hooks the active preset published, so this counter runs unchanged on ulive,
preact, vue, usignal, alien-signals, s-js, mobx and solid — and, for the parts that need no effect runner,
on rxjs, nanostores and `@tanstack/store`:

```jsx
import { signal, computed, read, write, effect, batch, untracked, canEffect, canCompute } from "uele/reactive";

// written once, no knowledge of the library underneath
const useCounter = (start = 0) => {
  const count = signal(start);
  const doubled = canCompute() ? computed(() => read(count) * 2) : null;
  return { count, doubled, inc: () => write(count, read(count) + 1) };
};

// and it renders like any other cell
const { count, inc } = useCounter();
document.body.append(<button onclick={inc}>{count}</button>);
```

`signal`, `computed`, `effect`, `batch` and `untracked` are the authoring hooks; `read`/`write`/`isCell`
talk to any cell shape; `canEffect()`/`canCompute()` are the two feature detections you need (a
subscribe-only store has no effect runner — ask instead of guessing). `uele/ui`, `uele/flow` and
`uele/router` are all built on this layer, which is why they work with every preset.

## Flow components (`uele/flow`)

```jsx
import { Suspense, Await, ErrorBoundary, Portal, Title } from "uele/flow";

<>
  <Title>My app</Title>{/* document.title: a string, a cell or a thunk */}
  <ErrorBoundary fallback={(e) => <p>Failed: {e.message}</p>}>{risky()}</ErrorBoundary>
  <Suspense fallback={<Spinner />}>{lazyView()}</Suspense>
  <Await for={fetchUser(id)} fallback={<Spinner />}>{(user) => <b>{user.name}</b>}</Await>
  <Portal mount={document.body}><Toast /></Portal>
</>
```

`Await` takes a promise, a thunk or a cell (a cell re-resolves whenever it changes, and a late response
never overwrites a newer one). `Suspense` shows its fallback until the async children resolve.
`ErrorBoundary` catches a synchronous throw *and* a rejected promise, keeps rendering the fallback and
calls `onError`. `Portal` moves its children into another container and leaves a comment marker where it
was. Every one of them is signal-agnostic: the reactive parts are function children, so uele re-runs and
disposes them — and they work on all eleven presets, not just the ones with an effect runner.

## Routing (`uele/router`)

`useRouter` talks to **any** router that answers `fetch(Request)` with the view — `uflite/nano`,
`createRouter()` (built in, zero dependencies) or your own:

```jsx
import { createRouter, useRouter, Link, Router } from "uele/router";
import { usePreactSignals } from "uele/adapters/preact";

usePreactSignals();

const app = createRouter();
app.get("/", () => <h1>Home</h1>);
app.get("/user/:id", ({ params }) => <h1>User {params.id}</h1>);
app.get("*", () => <h1>404</h1>);

// one line: the live view, click interception, and a navigate() function
const App = () => {
  const [view, linkProps, navigate] = useRouter(app);
  return (
    <main {...linkProps()}>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/user/42">A user</Link>
      </nav>
      {view}
      <button onclick={() => navigate("/user/7")}>Go</button>
    </main>
  );
};

document.body.append(<Router app={app} />);
```

Routes support `:params`, `*` wildcards and query strings (`request.query`); `linkProps()` intercepts
in-app `<a href="/…">` clicks (external links, `target="_blank"` and modifier clicks fall through to the
browser) and `navigate(path)` pushes a history entry. Because the view is just a cell, the router works
with every signal preset — and with `uflite/nano`, where `app.fetch(request)` resolves to the raw handler
result.

## Authoring guides

Writing your own preset — a signal adapter or a diff engine — is documented with the pitfalls we hit while
building the eleven that ship: [docs/ADAPTERS.md](docs/ADAPTERS.md).

## Which one should I use?

### Signal presets (`uele/adapters/*`)

Install the library you want, call one function. Every preset is driven by the same conformance suite.
"install size" is the npm unpacked size of the library (all published files), not its bundle cost.

| preset | library | install | preset | read | write | reactive thunks | subscribe path | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `uele/adapters/ulive` | `ulive` | 15 kB | 266 B | `cell.value` | `cell.value = v` | yes | no | smallest default; the baseline uele is tested against |
| `uele/adapters/preact` | `@preact/signals-core` | 254 kB | 360 B | `cell.value` | `cell.value = v` | yes | yes | signals also expose `.subscribe()`; great with Preact |
| `uele/adapters/vue` | `@vue/reactivity` | 342 kB | 323 B | `cell.value` | `cell.value = v` | yes | no | `ref()`/`computed()`; the effect needs `stop(runner)` |
| `uele/adapters/usignal` | `usignal` | 46 kB | 333 B | `cell.value` | `cell.value = v` | yes | no | tiny; attributes a read to every enclosing effect; usignal batches, so the first paint lands on the next tick |
| `uele/adapters/alien-signals` | `alien-signals` | 46 kB | 288 B | `cell()` | `cell(v)` | yes | no | plain-function signals, very fast |
| `uele/adapters/sjs` | `s-js` | 221 kB | 379 B | `cell()` | `cell(v)` | yes | no | classic S.js; `S.root` owns the disposer |
| `uele/adapters/mobx` | `mobx` | 4723 kB | 365 B | `cell.get()` | `cell.set(v)` | yes | no | boxed observables; configure mobx yourself |
| `uele/adapters/rxjs` | `rxjs` | 4392 kB | 431 B | `cell.value` | `cell.next(v)` | no | yes | subscribe-only: no reactive thunks; `BehaviorSubject` reads sync |
| `uele/adapters/nanostores` | `nanostores` | 54 kB | 348 B | `cell.get()` | `cell.set(v)` | no | yes | subscribe-only atoms; tiny and framework-neutral |
| `uele/adapters/tanstack` | `@tanstack/store` | 121 kB | 437 B | `cell.state` | `cell.setState(v)` | no | yes | `Store.subscribe()` is not synchronous, so a bare `Store` paints on its first change - `new Cell(v)` (or `api.signal(v)`) from the preset paints immediately |
| `uele/adapters/solid` | `solid-js` | 1051 kB | 471 B | `cell()` | `cell.write(v)` | yes | no | client build (`solid-js/dist/solid.js`) |

* **reactive thunks** — functions and components that re-run when their signals change (needs an effect runner).
* **subscribe path** — driven through `.subscribe()`: works without an effect runner, but reactive
  thunks and components cannot re-render themselves.

Short version: **ulive** if you have no preference (smallest, zero deps), **preact signals** if you use
Preact, **nanostores** if you only need subscribe-based stores, **solid** if you are already in solid-js.

### Diff engine presets (`uele/diffs/*`)

Every engine satisfies the same `api.diff` contract — verified over 42 250 list-state transitions. The
built-in marker walk is the right answer for most apps; swap one in when you have a specific reason.

| preset | dependency | install | preset | strategy | pick it when |
| --- | --- | --- | --- | --- | --- |
| `uele/diffs/builtin` | `—` | — | 208 B | marker walk built into uele | default; zero dependencies |
| `uele/diffs/swapdom` | `swapdom` | 45 kB | 209 B | keyed list diff written for uele's signature | small keyed lists |
| `uele/diffs/udomdiff` | `udomdiff` | 25 kB | 245 B | keyed diff, the smallest of the classic trio | battle-tested keyed lists |
| `uele/diffs/domdiff` | `domdiff` | 48 kB | 279 B | keyed diff with an options object (`{ before }`) | keyed lists, WebReflection stack |
| `uele/diffs/morphdom` | `morphdom` | 199 kB | 291 B | morphs elements in place (the old element survives) | server-rendered HTML, keep focus/media state |
| `uele/diffs/nanomorph` | `nanomorph` | 85 kB | 271 B | morphs in place, tiny | choo-style apps, keep DOM state |
| `uele/diffs/fast-array-diff` | `fast-array-diff` | 40 kB | 448 B | an LCS patch decides the order, uele moves the nodes | ordered lists with few moves |
| `uele/diffs/rebuild` | `—` | — | 303 B | remove all, insert all | tiny regions, or as a baseline in tests |

Short version: keep the **built-in** walk; reach for **swapdom** / **udomdiff** / **domdiff** for long keyed
lists, **morphdom** / **nanomorph** when you must preserve DOM state (focus, media, CSS transitions).


## Cleanup Support

`sub`/`r` return an unsubscribe function and `usub` registers subscriptions with a `FinalizationRegistry`,
so a subscription is released once the *source* (signal/observable) is garbage collected.

Since **usub 0.9.0** (which uele depends on), disposing a subscription releases the source and the callback
immediately - the effect runner's disposer is no longer parked in the registry - while the finalizer safety net
remains for subscribe/promise/async-iterator sources. `test/memory.test.js` asserts the exact release under
`--expose-gc`: zero retained chains, disposed or not, and it fails if any chain survives.

(History: usub 0.8.x parked every disposer in the registry, and a parked value reaches its source - so the
entry could never clear and each subscription retained one chain (source + last rendered nodes) forever, even
after `stop()`. Upgrading to usub 0.9.0 is the fix; `test/memory.test.js` pins both halves of that rule.)

For long lived stores, disposing when the subtree unmounts is still good hygiene - it stops the updates the
moment the subtree goes away:

```jsx
import { h, props, api } from "uele";

props.set("unmount", (node, cleanup) => {
  const observe = () => {
    if (!node.parentNode) return requestAnimationFrame(observe);
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const removed of record.removedNodes)
          if (removed === node) (cleanup(), observer.disconnect());
    });
    observer.observe(node.parentNode, { childList: true });
  };
  observe();
});

// per binding: keep the unsubscribe returned by r()/sub()
const off = r(store, render);
h("div", { unmount: off }, render);
```

Alternatively subscribe by hand (`r(store, render)` + a `disconnect` on route change) and let `add()` render
plain functions - a function child is re-evaluated on every change of the signals it reads.


### Other Settings

UEle can be configured to work with any reactive library by setting the `api` object accordingly.

Refer more at **[usub](https://github.com/kethan/usub)**

```js
// preact/signals-core or usignal settings
api.effect = effect;
api.is = (v) => v instanceof Signal; // or preact signals
api.get = (v) => v?.value;

// oby or sinuous settings
api.effect = effect; // or api.effect = subscribe
api.is = (v) => isObservable(v); // or api.is = (v) => v?.$o;
api.get = (v) => v?.();

// solid-js settings
api.effect = createEffect;
api.is = (v) => v?.name?.includes("readSignal");
api.get = (v) => v?.();
```

#### For any other reactive library

Set the `api` object to match the library's functions:

```js
import { api } from 'uele';

api.effect = ...; // Function to create an effect
api.is = (v) => ...; // Function to check if a value is reactive
api.get = (v) => ...; // Function to get the current value
api.cleanup = ...; // Explicit cleanup function for solid.js, sinuous and similar
api.any = ...; // Go crazy with anything.
api.diff = ...; // Any diffing library - signature below
api.udom = ...; // udomdiff `get` helper, switches api.diff to the udomdiff signature
```

`api.diff` receives `(parent, oldNodes, newNodes, end)` and must place `newNodes` before the `end` marker
(this is the [swapdom](https://github.com/dy/swapdom) signature). Set `api.udom` to use the
[udomdiff](https://github.com/WebReflection/udomdiff) signature instead:
`api.diff(parent, oldNodes, newNodes, api.udom, end)`.

#### SVG and MathML

Tag names are matched against a tag list (`isSVG`) to pick the namespace, because the parent element is not
known while children are being created. Custom elements must contain a dash
([as in the spec](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)),
which keeps `<my-icon>`/`<m-button>` in the HTML namespace. For the few ambiguous tags (`title`, `style`,
`script`) pass a namespaced node yourself: `document.createElementNS("http://www.w3.org/2000/svg", "title")`.

### Testing, types and size

```sh
npm test               # vitest, 1308 tests: src, lite, jsx runtimes, presets, ui, flow, router and every example app
npm run test:coverage  # 100% statements/branches/functions/lines are enforced
npm run test:bundles   # re-runs the suites against the built ESM and CJS output
npm run test:types     # type-checks the public api and jsx usage
npm run test:pack      # packs, installs in a clean project, checks exports/files/types
npm run size           # fails when a bundle exceeds its byte budget
```

The runtime has no dependencies except [`usub`](https://github.com/kethan/usub) and stays inside these budgets
(raw / gzip):

| bundle | budget | notes |
| --- | --- | --- |
| `dist/index.min.js` | ~3.7 kB / ~1.85 kB | full library, iife |
| `lite/dist/index.min.js` | ~2.4 kB / ~1.3 kB | `h`, `add`, `useLive`, `props`, `r` |
| `jsx-runtime/dist/index.es.js` | ~0.4 kB / ~0.3 kB | re-exports the shared `h` |

`lite` uses `usub/tiny`, so it supports functions/signals, promises and async iterables, but not `subscribe`
based observables, and it ships no control flow components (`If`, `For`, `Switch`, `Dynamic`, `lazy`, `map`).

The suite is deliberately conformance heavy: the whole runtime is driven against **eleven signal libraries**
(`ulive`, `@preact/signals-core`, `@vue/reactivity`, `usignal`, `alien-signals`, `s-js`, `mobx`, `rxjs`,
`nanostores`, `@tanstack/store`, `solid-js`) through the `api` adapter, and `map`/`For`/`useLive`/`add` are
exercised against **ten diff engines** (`swapdom`, `udomdiff`, `domdiff`, `morphdom`, `nanomorph`,
`fast-array-diff`, `@thi.ng/diff`, `list-diff2`, a rebuild engine and the built-in marker walk) - including
42 250 exhaustive list-state transitions (`test/diff.transitions.test.js`). `test/dom.cleanup.test.js` pins
what is detached after every kind of update, and `test/memory.test.js` measures reachability with a
`FinalizationRegistry` oracle under `--expose-gc`. `npm run test:bundles` re-runs the behavioural suites
against the built ESM **and** CJS output, and `npm run test:pack` installs the tarball in a clean project and
exercises both `import` and `require` consumers.

### Errors

Children that are promises, observables or async iterables never throw into the render: a rejected promise or a
stream error is ignored and the previous content (or the placeholder) stays. Subscribe manually with
`r(source, next, error)` when you need to handle errors - it also gives you an unsubscribe function.

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT
