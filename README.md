# UEle

A Reactive frontend library.

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uele) [![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uele)

**yarn**: `yarn add uele`

**npm**: `npm i uele`

**cdn**: https://unpkg.com/uele

**module**: https://unpkg.com/uele?module

- **Tiny** [![Badge size](https://deno.bundlejs.com/badge?q=uele@0.7.0&treeshake=[{h,Fragment}])](https://unpkg.com/uele)
- **Simple API**
- **Fast**
- **JSX**
- **Fragment**
- **Components**
- **SVG**
- **Refs**
- **Style Maps**
- **Lazy Components**
- **Promise**
- **AscynIterable**
- **Control Flow Components** - If, For, Show, Switch, Match, Suspense
- **Extend with any reactive library using api** - effect, is, get
- **For and map** - For efficient array diffing
- **Add any diffing** - Using api.diff
- **Automatic Cleanup for Subscriptions**

### h

```js
let frag = (
	<>
		{asyncIterable} or {promise} or {any html node or component} or {any reactive signal or library}
	</>
);
```

### lazy

Load a component lazily with a optional fallback

```js
const LazyComp = lazy(() => import("./SomeComp"), <div>Failed</div>);
```

### map

Efficient diffing of array of items

```js
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
import { h, Fragment, lazy, api, If, For, map } from "uele";
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

#### `Suspense`

```jsx
import { Suspense } from "uele";

<Suspense fallback={<div>Loading...</div>}>{asyncComponent}</Suspense>;
```

### Cleanup Support

Subscriptions and side-effects in `UEle` are automatically cleaned up when elements are garbage collected using `FinalizationRegistry`. You don't need to manually clean up unless desired, but it can be done through provided `usub` functions.

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
api.is = (v) => (v) => isObservable(v); // or api.is = (v) => v?.$o;
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
```

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT
