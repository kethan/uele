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
- **Control Flow Components** - If, For, Show, Switch, Match
- **Extend with any reactive library using api** - effect, is, get
- **Efficient Array Diffing with For and map**
- **Add Any Diffing** - Using api.diff
- **Explicit Cleanup and Keyed-Row Subscription Disposal**
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

```jsx
import { h, useLive } from "uele";

let [count, setCount] = useLive(0);

document.body.append(
  <main>
    <button onClick={() => setCount((c) => c - 1)}>-</button>
    {count}
    <button onClick={() => setCount((c) => c + 1)}>+</button>
  </main>
);
```

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

Efficient diffing of an array of items

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
    <div>No items</div>
  );
};
```

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

The `f` function is a utility that provides a convenient shorthand for creating elements using the h function. It returns a proxy that allows you to call HTML elements as functions directly.

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

Use `dispose(root)` before permanently removing a manually mounted subtree:

```js
import { dispose } from 'uele';
dispose(root);
root.remove();
```

`For`/`map` dispose subscriptions in evicted rows and discard removed keys. Bindings
created inside a reactive rendering function are owned by that render and disposed
before replacement; independently prebuilt DOM remains reusable. Custom
prop handlers can return a cleanup function. Removing DOM directly, hiding an `If`,
or replacing a `useLive` region does not automatically destroy independently created reusable nodes;
explicitly dispose nodes you permanently discard. Cleanup does not remove DOM or
undo arbitrary event listeners. Do not rely on garbage-collection timing.

List keys must be unique. Surviving keys retain their node instances and
creation-time indices; use reactive fields to update their content. A key removed
and later re-added renders a fresh row. Fragment rows and nested lists are supported.
Mount live regions before calling their setters.

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
api.diff = ...; // Any diffing library
api.udom = ...; //udomdiff get method
```

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT


## Development and production checks

Use Node 22.17+ (22.x) or Node 24+. Run `npm ci`, then `npm run test:all` for runtime
coverage, the same runtime tests against built ESM/CommonJS modules, actual npm-package
consumption, strict TypeScript checks, forced-GC probes, real Chromium scenarios and
minified/gzip size budgets. `npm test` is non-watch;
`npm run test:watch` starts watch mode.

Automatic JSX uses the full runtime's `api` configuration. Configure TypeScript
with `jsx: "react-jsx"` (or `react-jsxdev`) and `jsxImportSource: "uele"`.
For direct script usage, load the full `uele` bundle before the JSX adapter, whose
global is `ueleJSX`. Lite is available through `uele/lite` and has its own adapter.

See [the repository audit and test matrix](docs/REPOSITORY_AUDIT.md) for measured
coverage, byte budgets, lifecycle contracts, compatibility changes and remaining
production-validation boundaries. 100% code coverage is not exhaustive proof of
correctness.


### Interoperability and memory checks

`npm run test:interop` exercises six signal libraries and six diff engines across
full/lite runtimes. `npm run test:memory` runs mandatory forced-GC tests;
`npm run test:browser` also checks real Chromium DOM/listener and heap growth.
All are included in `npm run test:all`.

See [the interoperability and memory report](docs/INTEROPERABILITY_AND_MEMORY.md)
for exact library versions, executable adapters, usignal-specific lifecycle caveats,
retention fixes, measurement methodology and the updated byte budgets.

### Bundle size checks

All shipped JavaScript formats are minified. `npm run test:bundles` runs the existing
runtime suite against the ESM and CommonJS builds; `npm run test:size` checks every
shipped JavaScript file. Both are included in `npm run test:all`.

See [the byte-optimization report](docs/BYTE_OPTIMIZATION.md) for before/after sizes,
compression trade-offs and the checks preserving subscription and DOM cleanup.
