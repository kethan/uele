export const title = "API Reference";

export const markdown = `
A compact reference for everything exported from the core \`uele\` entry point.
The subpath packages (\`uele/ui\`, \`uele/hooks\`, \`uele/router\`,
\`uele/adapters/*\`) have their own type definitions in the repository.

## Creating elements

| Export | Signature | Description |
| --- | --- | --- |
| \`h\` | \`h(tag, props?, ...children)\` | Element factory; returns a real DOM node. Also the \`Fragment\`. |
| \`f\` | \`f(h)\` | Proxy of tag factories: \`const { div, p } = f(h)\`. |
| \`add\` | \`add(...children)\` | Flatten children into a \`Node[]\`, turning reactive values into live regions. |
| \`lazy\` | \`lazy(loader, fallback?)\` | Loads a component module lazily; renders the fallback meanwhile. |

## State and reactivity

| Export | Signature | Description |
| --- | --- | --- |
| \`useLive\` | \`useLive(initial)\` | Returns \`[region, setRegion]\`; the setter accepts a value or an updater function. |
| \`get\` | \`get(value)\` | Unwraps a cell, thunk or observable to its current value. |
| \`is\` | \`is(value)\` | \`true\` for cells, functions, promises, observables and async iterables. |
| \`sub\` | \`sub(source, next, error?)\` | Subscribe directly; returns an unsubscribe function. |
| \`r\` | \`r(value, next, error?)\` | Subscribe to reactive values, call once for plain values. |
| \`api\` | \`{ effect, is, get, signal, ... }\` | Configuration surface for plugging in any reactive library. |
| \`props\` | \`props.set(name, fn)\` | Registry for custom element props, e.g. tooltips, validation. |

## Control flow

| Export | Props | Description |
| --- | --- | --- |
| \`If\` / \`Show\` / \`Match\` | \`when\`, \`fallback?\`, \`children\` | Renders children when truthy, fallback otherwise. |
| \`Switch\` | \`fallback?\`, \`children\` | Renders the first truthy \`Match\` child. |
| \`For\` | \`each\`, \`key?\`, \`fallback?\`, render child | Keyed list rendering with node reuse. |
| \`map\` | \`map(items, cb, fallback?, key?)\` | The keyed list engine behind \`For\`, for hyperscript. |
| \`Dynamic\` | \`component\`, \`...props\` | Renders a component chosen at runtime, forwarding props. |

## Child types

\`\`\`js
type Child =
  | null | undefined | boolean | number | string | bigint | symbol
  | Node                    // appended as-is
  | (() => Child)           // thunk / effect — runs once without an effect runner
  | Promise<Child>          // renders when resolved
  | AsyncIterable<Child>    // renders each produced value
  | Observable<Child>       // renders each emitted value
  | Array<Child>;           // flattened, any depth
\`\`\`

## Attribute rules

| Input | Behaviour |
| --- | --- |
| \`null\`, \`undefined\`, \`false\` | Attribute removed |
| \`true\` | Attribute set to \`""\` |
| number | Stringified |
| \`className\` | Mapped to \`class\` |
| \`class\` object | Each key toggled by the truthiness of its value |
| \`style\` object | camelCase, kebab-case or \`--custom\` keys; \`null\` clears |
| \`on*\` handlers | Property when native, \`addEventListener\` otherwise |
| \`ref\` | Called as \`ref(element, props)\` once the element exists |
| unknown attribute | Written with \`setAttribute\` (works for \`data-*\`, \`aria-*\`) |

## Configuring a reactive preset

The \`api\` object is how uele learns about another signal library. Adapters
wrap this in a single call — for example \`usePreactSignals()\` from
\`uele/adapters/preact\`. The three core hooks are:

\`\`\`js
import { api } from "uele";

api.effect = (fn) => effect(fn);   // run fn now and whenever its cells change
api.is = (v) => !!v?.peek;          // recognise a cell of this library
api.get = (v) => v.value;           // read a cell's current value
\`\`\`

Once configured, cells of that library render directly as children, props,
class values and style values — and the same component code runs unchanged on
every preset (ulive, Solid, Preact, Vue, MobX, s-js, alien-signals, RxJS,
nanostores, TanStack store and more).
`;
