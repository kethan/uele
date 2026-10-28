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

1. [Counter](#counter) — [without](#without-build-tools) and [with](#with-build-tools) build tools
2. [h](#h)
3. [lazy](#lazy)
4. [map](#map)
5. [Example](#example)
6. [Utility Functions](#utility-functions) — [get](#get), [r](#r), [sub](#sub), [is](#is), [f](#f),
   [useLive](#uselive), [add](#add)
7. [Attributes, properties and events](#attributes-properties-and-events)
8. [Props](#props)
9. [Control Flow Components](#control-flow-components) — [If and Show](#if-and-show), [For](#for),
   [Switch and Match](#switch-and-match), [Dynamic](#dynamic)
10. [30-second todos app](#30-second-todos-app)
11. [UI primitives](#ui-primitives) — 45+ headless components: forms, layout, navigation,
    disclosure, overlays
12. [Hooks (`uele/hooks`)](#hooks-uelehooks)
13. [Themes (`uele/themes`)](#themes-uelethemes)
14. [Presets: one-call interop](#presets-one-call-interop)
15. [Write once, run on any preset (`uele/reactive`)](#write-once-run-on-any-preset-uelereactive)
16. [Flow components (`uele/flow`)](#flow-components-ueleflow)
17. [Routing (`uele/router`)](#routing-uelerouter)
18. [How it works](#how-it-works)
19. [Authoring guides](#authoring-guides) — [a plugin](#write-a-plugin),
    [a signal adapter](#write-a-signal-adapter), [a diff engine](#write-a-diff-engine)
20. [Which one should I use?](#which-one-should-i-use)
21. [Best practices](#best-practices)
22. [Cleanup Support](#cleanup-support)
23. [Other Settings](#other-settings) — [any other reactive library](#for-any-other-reactive-library),
    [SVG and MathML](#svg-and-mathml)
24. [Testing, types and size](#testing-types-and-size)
25. [Errors](#errors)
26. [Thanks and Inspiration](#thanks-and-inspiration)
27. [License](#license)

### Counter

### Without Build tools

No bundler? One script tag is enough — `unpkg` serves the IIFE build, which publishes a single `uele` global
(`uele/lite` publishes its own):

```html
<script src="https://unpkg.com/uele"></script>
<script>
  const { h, useLive } = uele;
</script>
```

Or as real ES modules — import the URL and it runs as is, no import map and no build step (this is the whole
app; paste it into JSFiddle or CodePen):

```html
<script type="module">
  import { h, useLive } from "https://esm.sh/uele";
  let [count, setCount] = useLive(0);

  document.body.append(
    h("main", [
      h("button", { onclick: () => setCount((c) => c - 1) }, "-"),
      count,
      h("button", { onclick: () => setCount((c) => c + 1) }, "+"),
    ])
  );
</script>
```

A full URL works for every subpath — `https://esm.sh/uele/lite`, `…/uele/ui`, `…/uele/adapters/preact` — and
the CDN rewrites the plain `'uele'` imports inside them, so they all land on **one** copy of the runtime:
`api`, `props` and `h` are shared, exactly as under a bundler. An import map is only sugar — it buys back the
bare `uele` specifiers:

```html
<script type="importmap">
  {
    "imports": {
      "uele": "https://esm.sh/uele@1",
      "uele/": "https://esm.sh/uele@1/"
    }
  }
</script>
```

Two rules once it is more than a fiddle: **pin the major** (`uele@1`, not bare `uele`) so every specifier
resolves to the same version, and leave the query string alone — `?bundle` or `?external=uele` inlines a
*second* copy of the runtime, and then the `api` you configure is not the `api` that `uele/ui` renders through.
Presets need nothing installed locally either: `import { usePreactSignals } from
"https://esm.sh/uele/adapters/preact"` pulls its library from the CDN.

JSX is the one thing a CDN cannot do for you — a browser does not compile `<div />`. Without a build step use
`h` (below), or [`htm`](https://github.com/developit/htm) for tagged templates
(`import htm from "https://esm.sh/htm"; const html = htm.bind(h);` — see `#### 2. html`). With a bundler, the
import map is unnecessary: it resolves `uele` from `node_modules`.

#### 1. h

```html
<script type="importmap">
	{
		"imports": {
			"uele": "https://esm.sh/uele@1",
			"uele/": "https://esm.sh/uele@1/"
		}
	}
</script>
<script type="module">
	import { h, useLive } from "uele";

	let [count, setCount] = useLive(0);
	document.body.append(
		h("button", { onclick: () => setCount((c) => c + 1) }, count),
	);
</script>
```
or 

```html
<script type="module">
  import { h, useLive } from "https://esm.sh/uele";
  import { Button, Row } from "https://esm.sh/uele/ui";

  let [count, setCount] = useLive(0);
  document.body.append(h("button", { onclick: () => setCount((c) => c + 1) }, count));

</script>
```

#### 2. html

```js
import { h, useLive } from "uele";
import htm from "htm";
const html = htm.bind(h);

let [count, setCount] = useLive(0);

document.body.append(html`
	<main>
		<button onClick=${() => setCount((c) => c - 1)}>-</button>
		${count}
		<button onClick=${() => setCount((c) => c + 1)}>+</button>
	</main>
`);
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
	]),
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
	esbuild: { jsx: "automatic", jsxImportSource: "uele" },
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
	</main>,
);
```

`uele/jsx-runtime` and `uele/jsx-dev-runtime` only re-export the shared `h` (`Fragment === h`) - importing both
the runtime and the library never duplicates the implementation.

### h

```jsx
let frag = (
	<>
		{asyncIterable} or {promise}{" "}
		{/* or any html node, component, signal or library */}
	</>
);
```

`<></>` **is** `h`: the fragment is the `h` function itself (`Fragment === h`), so a fragment simply returns
its children — there is no wrapper element and nothing to unwrap.

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
		(item, i) => item.id, // optional key, defaults to the item itself
	);
};
```

**Node reuse**: a node is reused while its key is present, and the callback is _not_ re-run for reused keys.
Items are keyed by identity (`key = (v, i) => v`) unless a `key` function is given, so a pure reorder only moves
existing nodes - the rendered content (including `i`) stays as it was for that node. Give a key (or make the
content reactive) when the callback output depends on the index. `For` uses the same engine:

```jsx
<For each={items} key={(item) => item.id} fallback={<div>No items</div>}>
	{(item, i) => (
		<div>
			{item} {i}
		</div>
	)}
</For>
```

Lists accept any iterable (`Array`, `Set`, generator, `NodeList`). Nodes whose keys disappear are released
immediately, so filtering a large list does not leak nodes. A node is reused at most once per render, so
duplicate keys are safe: with the default key `[1, 1, 2]` renders three elements (the second `1` builds a fresh
node).

### Example

```jsx
import { h, lazy, api, If, For, map, get, r, useLive, props } from "uele";

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
							10,
						),
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

#### `sub`

`sub` is the subscription itself — no unwrapping, no "run once for plain values": it returns the
unsubscribe function, so _you_ decide when it ends. Errors are the third argument.

```js
import { sub } from "uele";

const off = sub(
	source,
	(value) => console.log(value),
	(err) => console.error(err),
);

// later - the subscription is released, and the callback with it
off();
```

#### `is`

`is(v)` answers the question uele asks about every child: "is this reactive?" - `true` for cells of the
configured signal library, functions, promises, observables (`subscribe` or `Symbol.observable`) and async
iterables.

```js
import { is } from "uele";

const node = document.createElement("div");

is(cell); // true  -> uele subscribes and re-renders it
is(node); // false -> appended as is
is(42); // false
is(() => 1); // true  -> a function child is an effect (see "How it works")
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
	]),
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

#### `add`

`add(...children)` is the step `h` runs on its children: it flattens arrays, turns plain values into text
nodes and turns anything reactive (a cell, a thunk, a promise, an observable, an async iterable) into a live
region, and returns a plain `Node[]`. Reach for it when you mount content yourself.

```jsx
import { add } from "uele";

// everything below is optional: arrays, null, and pending promises are all fine
const nodes = add(
	"Hello",
	[1, 2, 3].map((n) => <li>{n}</li>),
	fetchCount(),
);
document.body.append(...nodes);
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
	<input autofocus />
	<input validate={(val) => (val.length < 3 ? "Too short" : "")} />
	<button tooltip={<div>click me!</div>}>Hover me</button>
	<div
		ref={(v) => {
			setTimeout(() => v.remove(), 2000);
		}}
		unmount={() => console.log("unmounted!")}
	>
		Remove me
	</div>
</>;
```

### Control Flow Components

Control flow components accept boolean or reactive values for conditions.

#### `If` and `Show`

```jsx
import { If, Show } from "uele";

<>
	<If when={cond} fallback={<div>False</div>}>
		<div>True</div>
	</If>

	<Show when={cond} fallback={<div>False</div>}>
		<div>True</div>
	</Show>
</>;
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

#### `Dynamic`

`Dynamic` renders whatever component it is handed, with the rest of the props — a component chosen at
runtime.

```jsx
import { Dynamic } from "uele";

<Dynamic component={user.isAdmin ? AdminPanel : GuestPanel} user={user} />;
```

`component` is read when the element is created, so pick it inside a function component (or a thunk) when
the choice itself depends on a signal — that parent re-runs, and `Dynamic` is rebuilt with the new component.

### 30-second todos app

Copy, paste, run — the whole app in JSX (this is the exact code `test/readme.test.jsx` runs):

```jsx
import { For } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal } from "@preact/signals-core";
import {
	Form,
	Row,
	Card,
	Stack,
	Button,
	Input,
	Checkbox,
	Label,
} from "uele/ui";

usePreactSignals(); // one call, whole api configured

const TodoApp = () => {
	const text = signal("");
	const todos = signal([]);
	let seq = 0;
	const add = () => {
		const title = text.value.trim();
		if (title)
			todos.value = [...todos.value, { id: ++seq, title, done: false }];
		text.value = "";
	};
	const toggle = (todo) =>
		(todos.value = todos.value.map((t) =>
			t.id === todo.id ? { ...t, done: !t.done } : t,
		));

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
							<Label
								style={todo.done ? { textDecoration: "line-through" } : null}
							>
								{todo.title}
							</Label>
							<Button
								onclick={() =>
									(todos.value = todos.value.filter((t) => t.id !== todo.id))
								}
							>
								×
							</Button>
						</Row>
					)}
				</For>
			</Stack>
		</Card>
	);
};

document.body.append(TodoApp());
```

The same app, written for each of the twelve signal libraries, lives in [`examples/todos/`](examples/todos) —
each one is a complete runnable file (`mountTodos(document.body)`) and is driven end to end by
`test/examples.test.js`: add, toggle, delete, filter (all/active/completed), clear-completed and
independent instances.

## UI primitives

`uele/ui` is a Radix-style catalogue of **45+ headless primitives** (85 exports
with aliases) over `h()`. They are accessible by default (roles, `aria-*`,
keyboard where it matters), carry `data-state`/`data-*` styling hooks, read the
`--uele-*` theme variables from [`uele/themes`](#themes-uelethemes) with
light-theme fallbacks, and every prop is live — pass a signal from **any**
library anywhere a value is expected:

```jsx
import {
	Form, Field, Button, Input, Textarea, Checkbox, Select, Card, Stack, Row, Label,
} from "uele/ui";

<>
	<Button onclick={save}>Save</Button> {/* defaults to type="button" */}
	<Input model={cell} /> {/* two-way bound (a value cell works too) */}
	<Checkbox model={done} /> {/* checked <-> boolean */}
	<Select model={choice} options={["a", { value: "b", label: "B" }]} />
	<Field label="Name">
		<Input model={name} />
	</Field>
	<Card>content</Card> <Stack>content</Stack> <Row>content</Row>
	<Form onSubmit={save}>content</Form> {/* preventDefault, then onSubmit */}
</>;
```

They are plain functions, so the call form (`Card({ children: "hi" })`) works
too — JSX is just nicer.

**Forms** — `Form` `Field` `Label` `FieldHint` `FieldError` `Button` `Input`
`Textarea` `Checkbox` `Radio` `RadioGroup` `Switch` `Slider` `Select` `Option`
`Combobox` `Rating` `NumberInput` `SearchInput` `OTPInput` (aliases `PinInput`,
`OTP`) `TagInput` `FileInput` `Dropzone`

**Layout** — `Card` `Stack` `Row` `Grid` `Container` `Center` `Spacer`
`Separator` (`Divider`) `AspectRatio` `ScrollArea`

**Typography** — `Heading` `Text` `Link` `Kbd` `Code` `Blockquote` `List`
`ListItem`

**Data display** — `Badge` `Avatar` `Skeleton` `Spinner` `Alert` `Progress`
`Stat` `Empty` `Table` `TableHead` `TableBody` `TableRow` `TableHeader`
`TableCell` (aliases `Thead` `Tbody` `Th` `Td`)

**Navigation & disclosure** — `Breadcrumb` (+ `BreadcrumbItem` `BreadcrumbLink`
`BreadcrumbSeparator`) `Pagination` (+ the pure `paginationRange` helper)
`Tabs` `TabList` `Tab` `TabPanel` `Accordion` `AccordionItem` `Collapsible`
`Stepper` `Carousel`

**Overlays & feedback** — `Dialog` `Drawer` (`Sheet`) `Popover` `Tooltip` `Menu`
(`DropdownMenu`) `MenuItem` `Toast` `Toaster`

**Everyday & real-world** — `Toggle` `ToggleGroup` `SegmentedControl`
`MultiSelect` `Listbox` `PasswordInput` `ColorPicker` `Calendar` `DatePicker`
`TimeAgo` (`RelativeTime`) `CountdownTimer` `AvatarGroup` `InputGroup`
`CopyButton` `StatusDot` `VisuallyHidden` `SkipLink`

**Data-heavy & app chrome** — `DataTable` (sortable, pageable) `Tree`
(`TreeView`) `VirtualList` `InfiniteScroll` `CommandPalette` (`Command`)
`ContextMenu` `NavigationMenu` `HoverCard` `AlertDialog` (`ConfirmDialog`)
`SplitPane` (`Resizable`) `Editable` `Lightbox` (`Gallery`) `FileList`
`Wizard` `Toolbar` `Navbar` `AppShell` `Timeline`

`Drawer` is anchored to its edge, `Dialog` locks body scroll and closes on a
global Escape, and `AlertDialog` wires Cancel/Confirm to close for you. The
whole catalogue composed into one themed admin screen lives in
[`examples/dashboard.jsx`](examples/dashboard.jsx) (AppShell, Stat cards, a
searchable DataTable, Dialog, CommandPalette) and is driven by
`test/ui.advanced.test.jsx`.

Seven complete sample pages written **once** against the unified layer —
login, dashboard, tables, website, settings, shop, chat — live in
[`examples/pages/`](examples/pages): no page imports a signal library, so any
effect-capable preset runs them unchanged. `test/pages.test.jsx` drives every
page's flows through the DOM on all eight of those presets (and first paint on
the subscribe-only three), so "write once, run on any signals" is enforced,
not asserted.

State components follow the Radix controlled/uncontrolled pattern: pass
`model` (or `value`/`checked`/`open`/`page`) to control them, `defaultValue` /
`defaultOpen` / `defaultPage` to seed them, and `onChange` to listen. `model`
accepts any writable cell our presets produce (`.value`, `.set()`, `.next()`,
`.setState()`) or a plain setter function; pass the cell as `value`/`checked`
instead and it becomes the model automatically:

```jsx
import { Tabs, Pagination, OTPInput, Switch, Dialog, Rating } from "uele/ui";
import { signal } from "@preact/signals-core";

const tab = signal("a");
const page = signal(1);
const code = signal("");
const wifi = signal(true);
const rating = signal(0);

<>
	<Tabs
		model={tab}
		items={[
			{ value: "a", label: "Alpha", content: <p>panel A</p> },
			{ value: "b", label: "Beta", content: <p>panel B</p> },
		]}
	/>
	<Pagination page={page} total={95} pageSize={10} />
	<OTPInput length={6} model={code} onComplete={(c) => console.log(c)} />
	<Switch model={wifi} label="Wi-Fi" />
	<Rating model={rating} />
	<Dialog trigger="Delete" title="Are you sure?" model={openDialog}>
		<p>This cannot be undone.</p>
	</Dialog>
</>;
```

(`openDialog` above is a boolean cell like `wifi`.) Compositional forms exist
where Radix has them — `Tab`/`TabPanel` sharing a `selected` cell, `Radio`
inside `RadioGroup`, `MenuItem` inside `Menu`, your own `Toast` stack or the
batteries-included `Toaster` over a toasts cell. Everything is driven end to
end by `test/ui.primitives.test.jsx`, `test/ui.test.js` and `test/ui.test.jsx`
— including a run on alien-signals to prove nothing is preset-specific.

## Hooks (`uele/hooks`)

Sixty-plus useful hooks, written once against `uele/reactive`, so they run on
every preset (the DOM/timer ones need no effect runner at all):

```js
import {
	useToggle, useCounter, useLocalStorage, usePagination, useOTP, useForm,
} from "uele/hooks";

const [on, toggle] = useToggle(false);
const { count, inc } = useCounter(0, { min: 0, max: 10 });
const [name, setName] = useLocalStorage("name", "Ada");
const pager = usePagination({ total: 95, pageSize: 10 });
const otp = useOTP(6, { onComplete: (code) => submit(code) });
```

**State** — `useSignal` `useComputed` `useEffect` `useToggle` (`useBoolean`)
`useDisclosure` `useCounter` `useControllable` `usePrevious` `useList`
(`useArray`) `useHistory` (undo/redo) `useAsync` `useId`
**Timers & debounce** — `useDebounce` `useDebounceFn` `useInterval`
`useTimeout` `useCountdown`
**Browser & DOM** — `useLocalStorage` `useSessionStorage` `useMediaQuery`
`useOnline` `useWindowSize` `useEventListener` `useKeyPress` `useHotkey`
`useClickOutside` `useHover` `useFocus` `useClipboard`
`useIntersectionObserver` `useResizeObserver`
**Composite logic** — `usePagination` (+ pure `paginationRange`) `useOTP`
(`usePinInput`) `useForm` (per-field cells, validation, submit)

**Realtime & clocks** — `useWebSocket` `useEventSource` (SSE)
`useBroadcastChannel` (cross-tab) `useFetch` (abortable, on `useAsync`)
`useNow` (`useClock`) `useStopwatch` `useThrottle` `useThrottleFn`

**Browser APIs** — `useGeolocation` `useDocumentVisibility` `useWindowFocus`
`useScrollPosition` `useScrollLock` `useFocusTrap` `useFullscreen`
`useBreakpoint` `useColorScheme` (`useDarkMode`, pairs with `uele/themes`)
`useQueryParam` `useCookie` `useIdle` `useLongPress` `useSwipe`
`useAnimationFrame` `useInView` `useTitle` `useLatest` `useIsMounted`

Transports and observers degrade gracefully when the browser API is absent
(SSR, jsdom, old browsers): status cells stay `closed`/false and sends are
no-ops. Covered by `test/hooks.test.js` and `test/hooks.realtime.test.js` —
the realtime transports are tested against stubbed globals, never a network.

Hooks return cells you can render directly (`{count}`), teardown functions, or
small objects of both; observers and storage degrade gracefully when the
browser API is absent. Covered by `test/hooks.test.js`.

## Themes (`uele/themes`)

Radix-Themes-style design tokens for the primitives above: every `uele/ui`
component reads `--uele-*` CSS variables, so one reactive write re-skins the
whole tree — no re-render, no class juggling:

```jsx
import { ThemeProvider, createTheme, themes, stylesheet } from "uele/themes";
import { signal } from "@preact/signals-core";

const theme = signal(themes.light);
document.body.append(
	<ThemeProvider theme={theme}>
		<App />
	</ThemeProvider>,
);
theme.value = themes.dark; // everything restyles, live

const brand = createTheme({ appearance: "dark", accent: "rose", radius: "small" });
const css = stylesheet(brand); // ":root { --uele-accent: #e11d48; … }" for SSR
```

`createTheme({ appearance, accent, radius, density, colors })` builds a theme
from seven shipped presets (`light`, `dark`, `midnight`, `forest`, `sunset`,
`ocean`, `highContrast`) and eleven accent scales (`blue`, `emerald`, `rose`,
`amber`, `violet`, `cyan`, `pink`, `orange`, `teal`, `slate`, `neutral`) — or
pass a raw CSS color. `density: "compact"` tightens control heights, and the
spacing/type scales ride along as `--uele-space-*` / `--uele-font-size-*`
variables. Outside a component tree, `applyTheme(el, theme)` stamps the
variables onto any element directly, `prefersColorScheme()` reads the OS
setting, and `useColorScheme` from `uele/hooks` keeps a scheme cell in sync
with it (persisted, toggleable). `cssVars(theme)` gives the
`--uele-*` map, `ThemeStyle` renders it as a reactive `<style>` element, and
`useTheme()` is the state hook (`toggle()` flips light/dark). The same module
ships the class helpers Radix apps pair with themes — `cx(...)` for joining
maybe-reactive class values and a `cva`-style `variants()` / `styled()`:

```js
import { variants, styled } from "uele/themes";

const badge = variants({
	base: "badge",
	variants: { tone: { brand: "badge-brand", danger: "badge-danger" } },
	defaultVariants: { tone: "brand" },
});
badge({ tone: "danger" }); // "badge badge-danger" — values may be cells too

const BrandButton = styled("button", { base: "btn", variants: { tone: { brand: "btn-brand" } } });
```

Covered by `test/themes.test.jsx`.

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
preact, vue, usignal, alien-signals, s-js, mobx, solid and signals — and, for the parts that need no effect runner,
on rxjs, nanostores and `@tanstack/store`:

```jsx
import {
	signal,
	computed,
	read,
	write,
	effect,
	batch,
	untracked,
	canEffect,
	canCompute,
} from "uele/reactive";

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
	<Title>My app</Title>
	{/* document.title: a string, a cell or a thunk */}
	<ErrorBoundary fallback={(e) => <p>Failed: {e.message}</p>}>
		{risky()}
	</ErrorBoundary>
	<Suspense fallback={<Spinner />}>{lazyView()}</Suspense>
	<Await for={fetchUser(id)} fallback={<Spinner />}>
		{(user) => <b>{user.name}</b>}
	</Await>
	<Portal mount={document.body}>
		<Toast />
	</Portal>
</>;
```

`Await` takes a promise, a thunk or a cell (a cell re-resolves whenever it changes, and a late response
never overwrites a newer one). `Suspense` shows its fallback until the async children resolve.
`ErrorBoundary` catches a synchronous throw _and_ a rejected promise, keeps rendering the fallback and
calls `onError`. `Portal` moves its children into another container and leaves a comment marker where it
was. Every one of them is signal-agnostic: the reactive parts are function children, so uele re-runs and
disposes them — and they work on all twelve presets, not just the ones with an effect runner.

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

## How it works

Three ideas, and everything else follows from them.

- **A dynamic child is a marked region.** A cell, a thunk, a promise, an observable or an async iterable
  becomes a pair of marker nodes around its current content. Updating it replaces what sits between the
  markers — there is no vdom and no component tree to reconcile. `useLive` gives you that region by hand.
- **A function child is an effect.** `add` sees a function and runs it inside `api.effect`, so it re-runs
  whenever the cells it read change, and its previous content is replaced and released at that moment. That
  is why `{count}` and `{() => count()}` both stay live, and why a component is just a function called with
  `(props, ...children)`. With the default `api.effect` a thunk runs **once** — install a preset (or set
  `api.effect`) and it re-runs for as long as the region is in the document.
- **Lists are keyed, and a key is an identity.** `map`/`For` keep a `Map` of key → node: a node survives
  while its key is present, and the region's engine (`api.diff`) only inserts, moves and removes real nodes.

Nothing is scheduled: an update is synchronous with the write that caused it (a library that batches its own
writes — `usignal` does — paints on the next tick). Use your preset's `batch()` to coalesce a burst of writes.

## Authoring guides

uele has no plugin registry and no build step: the extension points are plain values you assign — the `api`
object (reactivity and diffing), the `props` Map (custom attributes) and `h` itself. So a plugin, a signal
adapter and a diff engine are all the same thing: **a function that installs something, and optionally returns
its own undo**. The twelve signal presets and eight diff presets that ship are written exactly that way — copy
[adapters/preact.js](adapters/preact.js) or [diffs/swapdom.js](diffs/swapdom.js) as a starting point, and read
[docs/ADAPTERS.md](docs/ADAPTERS.md) for the pitfalls we hit writing them.

### Write a plugin

```js
import { r, props } from "uele";

// a plugin is a function: install, then return the undo
export const tooltip = () => {
	// custom props get the RAW value - wrap it in r() and any cell works
	props.set("tooltip", (node, value) =>
		r(value, (text) => (node.title = text == null ? "" : text)),
	);
	return () => props.delete("tooltip");
};

// plugins compose: a kit is a plugin that installs plugins
export const useKit = () => {
	const undo = [tooltip(), autofocus()];
	return () => undo.forEach((off) => off());
};
```

```jsx
// usage — `label` may be a cell, a thunk or a plain string
<button tooltip={label}>Hover me</button>
```

Rules of thumb: a `props` handler runs for **elements only** (a component gets its props untouched), it is
called as `(node, value, name, attrs)` while the element is being built, and it must not assume the node is in
the document yet — `ref` (or the `unmount` prop in [Cleanup Support](#cleanup-support)) is the hook for that.
Use a name that cannot collide with a future HTML attribute.

### Write a signal adapter

```js
import { api } from "uele";
import { scoped, wire } from "uele/adapters/util"; // the helpers every shipped preset uses

export const useMySignals = (target = api) => {
	const s = scoped(myEffect); // wraps the library's effect runner for uele
	return wire(target, {
		// the four hooks uele itself needs
		is: (v) => v instanceof Cell, //   "is this one of our cells?"
		get: (v) => v.peek(), //           read it (and subscribe, from inside an effect)
		effect: s.effect, //               run fn now, re-run when the cells it read change
		cleanup: s.cleanup, //             register a teardown for the current run
		// the authoring hooks - uele/reactive builds on these, so uele/ui, uele/flow and
		// uele/router keep working on your preset too
		signal: (v) => new Cell(v),
		derived: (fn) => myComputed(fn),
		set: (cell, v) => cell.set(v),
		batch: (fn) => myBatch(fn),
		untracked: (fn) => myUntracked(fn),
	});
};
```

```js
import { api as liteApi } from "uele/lite";

useMySignals(); // configure the main instance (the default target)
useMySignals(liteApi); // or the lite one
```

Call it **once, before you render**: `api` is one shared object. `wire` assigns _every_ hook, clearing the ones
your library has no answer for, so switching presets can never leave a stale hook behind. Only `is`, `get`,
`effect` and `cleanup` are required — skip `signal`/`derived`/`set`/`batch`/`untracked` for a subscribe-only
library and `uele/reactive` will report the missing features through `canEffect()`/`canCompute()` instead of
failing.

### Write a diff engine

```js
import { api } from "uele";

export const useMyDiff = (target = api) => {
	target.udom = undefined; // unset = the swapdom signature below
	target.diff = (parent, oldNodes, newNodes, end) => {
		const keep = new Set(newNodes);
		oldNodes.forEach((node) => {
			if (!keep.has(node) && node.parentNode === parent)
				parent.removeChild(node);
		});
		let anchor = end || null; // walk backwards: each node before the one placed last
		for (let i = newNodes.length - 1; i >= 0; i--) {
			const node = newNodes[i];
			if (node.parentNode !== parent || node.nextSibling !== anchor)
				parent.insertBefore(node, anchor);
			anchor = node;
		}
	};
	return target;
};
```

The contract, in four lines:

1. `oldNodes` are the nodes currently in the region, and they are children of `parent`.
2. When you return, `parent` holds exactly `newNodes`, once each, in order, **before** the `end` marker.
3. Remove every old node you do not reuse; leave every other child of `parent` (including the markers) alone.
4. Mutate `newNodes` **in place** when you keep an old node instead of a new one — uele keeps that array as
   the region's current content. The return value is ignored.

`end` is the region's end marker — always a node, and always a child of `parent` — so `insertBefore(node, end)`
is how you append to the region. Engines that morph elements in place (`morphdom`, `nanomorph`) need rule 4
the most; `diffs/util.js` ships `morphAdapter(fn)` for exactly that. Prefer the older udomdiff signature? Set
`api.udom` to the key/get callback and uele calls `api.diff(parent, oldNodes, newNodes, api.udom, end)` — that
is all [diffs/udomdiff.js](diffs/udomdiff.js) does.

### Test it

The conformance suites are parameterised lists, so a new preset is one entry away from the whole matrix: add
your adapter to `ADAPTERS` in [test/helpers/signal-adapters.js](test/helpers/signal-adapters.js) — the signal
conformance suite then runs it against both entry points — or your engine to `ENGINES` in
[test/helpers/diff-engines.js](test/helpers/diff-engines.js), which also feeds the 42 250 list-state
transitions in `test/diff.transitions.test.js`. The three snippets above are run as printed by
`test/authoring.test.jsx`, and [docs/ADAPTERS.md](docs/ADAPTERS.md) ends with the checklist every shipped
preset has to pass.

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
| `uele/diffs/spect` | `useSpect` | forward cursor reconciliation |
| `uele/diffs/snabbdom` | `useSnabbdom` | double-ended keyed reconciliation |
| `uele/diffs/heckel` | `useHeckel` | unique-token symbol table with move-aware DOM application |
| `uele/diffs/list-difference` | `useListDifference` | indexed list matching with insertion, removal and moves |
| `uele/diffs/stage0` | `useStage0` | longest increasing subsequence; leaves an ordered subset in place |

These are independent node-identity implementations, not framework wrappers or exact copies
of the benchmark code. They preserve live-region markers and static siblings and require no
additional package. Shared nodes are matched by object identity, not by their string representation.

```js
import { useStage0 } from 'uele/diffs/stage0';
useStage0(); // main entry point
// useStage0(liteApi); // or pass the API object from uele/lite
```

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

## Cleanup Support

`sub`/`r` return an unsubscribe function and `usub` registers subscriptions with a `FinalizationRegistry`,
so a subscription is released once the _source_ (signal/observable) is garbage collected.

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
npm test               # vitest, 1844 tests: src, lite, jsx runtimes, presets, ui, hooks, themes, flow, router, every example app and an axe-core a11y suite
npm run test:coverage  # 100% statements/branches/functions/lines are enforced
npm run test:bundles   # re-runs the suites against the built ESM and CJS output
npm run test:browser   # playwright + axe: boots the built bundles in real chromium (needs libnspr4/libnss3)
npm run test:types     # type-checks the public api and jsx usage
npm run test:pack      # packs, installs in a clean project, checks exports/files/types
npm run size           # fails when a bundle exceeds its byte budget
```

Every published entry point ships its own `.d.ts` — `uele`, `uele/lite`, `uele/ui`, `uele/hooks`, `uele/themes`, `uele/flow`, `uele/router`,
`uele/reactive`, `uele/adapters/*` and `uele/diffs/*` — so `tsc` is happy without a `@types` package. The
package is `sideEffects: false` (bundlers tree-shake it) and needs **Node 18+**. Every signal and diff library
behind a preset is an **optional peer dependency**: `npm i uele` installs two packages, and you add only the
library you actually use.

The runtime has no dependencies except [`usub`](https://github.com/kethan/usub) and stays inside these budgets
(raw / gzip):

| bundle                         | budget             | notes                               |
| ------------------------------ | ------------------ | ----------------------------------- |
| `dist/index.min.js`            | ~3.7 kB / ~1.9 kB  | full library, iife                  |
| `lite/dist/index.min.js`       | ~2.5 kB / ~1.3 kB  | `h`, `add`, `useLive`, `props`, `r` |
| `jsx-runtime/dist/index.es.js` | ~0.4 kB / ~0.3 kB  | re-exports the shared `h`           |

`lite` uses `usub/tiny`, so it supports functions/signals, promises and async iterables, but not `subscribe`
based observables, and it ships no control flow components (`If`, `For`, `Switch`, `Dynamic`, `lazy`, `map`).

The suite is deliberately conformance heavy: the whole runtime is driven against **twelve signal libraries**
(`ulive`, `@preact/signals-core`, `@vue/reactivity`, `usignal`, `alien-signals`, `s-js`, `mobx`, `rxjs`,
`nanostores`, `@tanstack/store`, `solid-js`, `@webreflection/signals`) through the `api` adapter, and `map`/`For`/`useLive`/`add` are
exercised against **ten diff engines** (`swapdom`, `udomdiff`, `domdiff`, `morphdom`, `nanomorph`,
`fast-array-diff`, `@thi.ng/diff`, `list-diff2`, a rebuild engine and the built-in marker walk) - including
42 250 exhaustive list-state transitions (`test/diff.transitions.test.js`). `test/dom.cleanup.test.js` pins
what is detached after every kind of update, and `test/memory.test.js` measures reachability with a
`FinalizationRegistry` oracle under `--expose-gc`. `npm run test:bundles` re-runs the behavioural suites
against the built ESM **and** CJS output, and `npm run test:pack` installs the tarball in a clean project and
exercises both `import` and `require` consumers. `npm run test:browser` goes one step further: Playwright
drives the built bundles in a real Chromium (binary pinned via `@sparticuz/chromium`, so local and CI runs
match) and requires the rendered components to be axe-clean under wcag2a/wcag2aa.

### Errors

Children that are promises, observables or async iterables never throw into the render: a rejected promise or a
stream error is ignored and the previous content (or the placeholder) stays. Subscribe manually with
`r(source, next, error)` when you need to handle errors - it also gives you an unsubscribe function.

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT
