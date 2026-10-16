# Examples

## todos — one app, eleven signal libraries

[`todos/`](todos) holds the same complete todos app written for every signal preset: add, toggle with
strike-through, delete, filter (all/active/completed), clear completed, and a live "N left" counter.

Every file is **JSX** and exports the same two things:

```jsx
import { TodoApp, mountTodos } from './todos/preact.jsx';

mountTodos(document.body);          // append a running app
const app = TodoApp();              // or build one and place it yourself
```

| file | signal library | preset |
| --- | --- | --- |
| [`todos/ulive.jsx`](todos/ulive.jsx) | `ulive` | `useUlive()` |
| [`todos/preact.jsx`](todos/preact.jsx) | `@preact/signals-core` | `usePreactSignals()` |
| [`todos/vue.jsx`](todos/vue.jsx) | `@vue/reactivity` | `useVue()` |
| [`todos/usignal.jsx`](todos/usignal.jsx) | `usignal` | `useUsignal()` |
| [`todos/alien-signals.jsx`](todos/alien-signals.jsx) | `alien-signals` | `useAlienSignals()` |
| [`todos/s-js.jsx`](todos/s-js.jsx) | `s-js` | `useSjs()` |
| [`todos/mobx.jsx`](todos/mobx.jsx) | `mobx` | `useMobx()` |
| [`todos/solid.jsx`](todos/solid.jsx) | `solid-js` | `useSolid()` |
| [`todos/rxjs.jsx`](todos/rxjs.jsx) | `rxjs` | `useRxjs()` |
| [`todos/nanostores.jsx`](todos/nanostores.jsx) | `nanostores` | `useNanostores()` |
| [`todos/tanstack.jsx`](todos/tanstack.jsx) | `@tanstack/store` | `useTanstackStore()` |

Read any two side by side: only the imports, the cell creation and the actions differ — the JSX is
identical, because `uele/ui`, `For` and the renderer only ever talk to the `api` hooks the preset
installed.

## pages — sample pages on the unified signal layer

[`pages/`](pages) holds seven complete, self-contained sample pages. Every page is written **once**
against the unified layer — imports are only `uele/reactive`, `uele/hooks`, `uele/ui` and `uele/themes`;
**no page imports a signal library**. Install **any** effect-capable preset before mounting and the
same page code runs unchanged:

```js
import { useUlive } from 'uele/reactive';
// any preset works: useVue(), useSolid(), useMobx(), ... (see the todos table above)

useUlive(); // install BEFORE importing/mounting the page
const { mountDashboard } = await import('./pages/dashboard.jsx');
mountDashboard(document.querySelector('#app'));
```

| page | file | highlights |
| --- | --- | --- |
| Login | [`pages/login.jsx`](pages/login.jsx) | validation, wrong-password error, demo account → welcome state |
| Dashboard | [`pages/dashboard.jsx`](pages/dashboard.jsx) | period tabs, stats, goal progress, activity timeline, recent orders |
| Tables | [`pages/tables.jsx`](pages/tables.jsx) | search + status filter + sort + pagination over 10 people |
| Website | [`pages/website.jsx`](pages/website.jsx) | navbar, hero, monthly/yearly pricing toggle, FAQ accordion |
| Settings | [`pages/settings.jsx`](pages/settings.jsx) | tabs, notification switches, live theme picker, danger-zone dialog |
| Shop | [`pages/shop.jsx`](pages/shop.jsx) | product grid, cart drawer with steppers, totals, checkout |
| Chat | [`pages/chat.jsx`](pages/chat.jsx) | presence list, message thread, composer, optional auto-reply |

## dashboard — the component catalogue composed

[`dashboard.jsx`](dashboard.jsx) is one themed admin screen built from the extended
catalogue: `ThemeProvider` + `AppShell`/`Navbar`, `Stat` cards, a `SearchInput` filtering a
sortable `DataTable`, a settings `Dialog` and a `CommandPalette` — on `@preact/signals-core`,
with `useNow` from `uele/hooks` ticking the clock. It exports `DashboardApp` / `mountDashboard`
like the todos apps and is mounted, filtered and clicked through by `test/ui.advanced.test.jsx`.

## JSX setup

uele ships an [automatic JSX runtime](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html),
so there is no `h` import in your files. Point your bundler at it once:

```js
// vite.config.js
export default {
  esbuild: { jsx: "automatic", jsxImportSource: "uele" }
};
```

```jsonc
// tsconfig.json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "uele" } }
```

```js
// esbuild / rollup plugin-esbuild / babel
{ jsx: "automatic", jsxImportSource: "uele" }
```

Files must use the `.jsx` (or `.tsx`) extension — that is what tells the transform to parse JSX.

Two rules the examples follow, because uele's `h` needs them:

1. **One root per snippet.** A component returns a single node; several siblings go inside a fragment
   (`<>…</>`) or a layout primitive from `uele/ui`.
2. **A component's `children` arrive as an array** (`[child]` for a single child). `For`, `If` and
   `uele/flow` normalise that themselves; your own components can too:
   `const one = (children) => (Array.isArray(children) ? children[0] : children)`.

## Running the examples

They are plain modules — any bundler or dev server works:

```sh
npm i uele @preact/signals-core      # the preset's library is a peer dependency
npx vite                              # then import ./examples/todos/preact.jsx
```

The suite runs all eleven through the same scenarios (`test/examples.test.js`), so the examples cannot
rot: add, toggle, delete, filter, clear-completed and independent instances are asserted for each one.
