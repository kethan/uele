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
// or esbuild/vite
esbuild: { jsx: "automatic", jsxImportSource: "uele" }
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
    {asyncIterable} or {promise} or {any html node or component} or {any reactive signal or library}
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

```js
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

```js
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
<input autofocus/>
<input validate={(val) => (val.length < 3 ? "Too short" : "")} />
<button tooltip={{<div>click me!</div>}}>Hover me</button>
<div ref={(v) => { setTimeout(() => v.remove(), 2000)}}
	 unmount={() => console.log("unmounted!")}>
	Remove me
</div>
```

### Control Flow Components

Control flow components accept boolean or reactive values for conditions.

#### `If` and `Show`

```jsx
import { If, Show } from 'uele';

<If when={cond} fallback={<div>False</div>}>
  <div>True</div>
</If>

<Show when={cond} fallback={<div>False</div>}>
  <div>True</div>
</Show>
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

### Cleanup Support

`sub`/`r` return an unsubscribe function and `usub` registers subscriptions with a `FinalizationRegistry`,
so a subscription is released once the *source* (signal/observable) is garbage collected.

There is one important caveat: an active subscription keeps its source alive, and a source usually keeps its
subscribers alive. A mounted `h("div", null, someStore)` therefore stays subscribed - and keeps its detached
nodes reachable - until the store itself goes away. `FinalizationRegistry` cannot break that cycle on its own.
For long lived stores, dispose explicitly when the subtree is unmounted:

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
npm test           # vitest, 282 tests over src, lite and both jsx runtimes
npm run test:coverage  # 100% statements/branches/functions/lines are enforced
npm run test:types     # type-checks the public api and jsx usage
npm run test:pack      # packs, installs in a clean project, checks exports/files/types
npm run size           # fails when a bundle exceeds its byte budget
```

The runtime has no dependencies except [`usub`](https://github.com/kethan/usub) and stays inside these budgets
(raw / gzip):

| bundle | budget | notes |
| --- | --- | --- |
| `dist/index.min.js` | ~3.5 kB / ~1.7 kB | full library, iife |
| `lite/dist/index.min.js` | ~2.4 kB / ~1.3 kB | `h`, `add`, `useLive`, `props`, `r` |
| `jsx-runtime/dist/index.es.js` | ~0.4 kB / ~0.3 kB | re-exports the shared `h` |

`lite` uses `usub/tiny`, so it supports functions/signals, promises and async iterables, but not `subscribe`
based observables, and it ships no control flow components (`If`, `For`, `Switch`, `Dynamic`, `lazy`, `map`).

### Errors

Children that are promises, observables or async iterables never throw into the render: a rejected promise or a
stream error is ignored and the previous content (or the placeholder) stays. Subscribe manually with
`r(source, next, error)` when you need to handle errors - it also gives you an unsubscribe function.

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT
