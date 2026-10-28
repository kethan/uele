export const title = "Introduction";

export const markdown = `
uele (**u**niversal **ele**ment) is a tiny reactive library for building user
interfaces with plain JavaScript and JSX. It gives you the component model you
already know — elements, props, components and lists — without a virtual DOM,
a compiler or a large runtime.

The whole philosophy fits in a few lines:

- **Elements are real DOM nodes.** \`h("div", props, children)\` returns an
  actual \`HTMLElement\`, and JSX compiles straight to it. There is no
  intermediate tree to reconcile.
- **Anything reactive can be dropped into JSX.** Signals, functions, promises,
  observables and async iterables are all valid children — uele subscribes,
  renders the current value and updates only the affected DOM region.
- **Control flow is components, not syntax.** \`<If>\`, \`<For>\`,
  \`<Switch>\` and \`<Dynamic>\` return live thunks, so conditionals and lists
  stay reactive without re-rendering the whole tree.
- **Bring your own reactivity.** uele core ships with \`useLive\` for local
  state, and the \`api\` object lets you plug in ulive, Solid, Preact signals,
  Vue, MobX, RxJS and more with one function call.

## Your first component

Here is a complete, interactive counter. It uses only what ships in the core
bundle — change the code on the left and the preview on the right updates as
you type.

\`\`\`jsx
import { h, useLive } from "uele";

const [count, setCount] = useLive(0);

document.body.append(
  <main>
    <h2>Counter</h2>
    <button onClick={() => setCount((c) => c - 1)}>−</button>
    <strong style={{ margin: "0 12px", fontSize: "22px" }}>{count}</strong>
    <button className="primary" onClick={() => setCount((c) => c + 1)}>+</button>
  </main>
);
\`\`\`

## What just happened?

1. \`useLive(0)\` creates a **live region**: a pair of marker nodes with the
   current value rendered between them, plus a setter.
2. \`{count}\` places that region in the JSX. It looks like a value, but it is
   really a tiny self-updating piece of the DOM.
3. \`setCount((c) => c + 1)\` swaps only the text inside the markers — the
   surrounding buttons are never touched.

> **Note:** uele is deliberately small. The full core library is a few
> kilobytes, and the playground on this site loads the exact same source code
> that lives in this repository, bundled locally with no CDN.

## When should you use uele?

uele is a good fit when you want the React-style programming model —
components, props, one-way data flow, JSX — but with a runtime you can read in
one sitting, instant mounting, and the freedom to choose (or skip) a signal
library. It runs in browsers, in embedded web views and anywhere the DOM
exists.

Continue to **Installation** to add uele to a project, or jump straight to
**Hello World** for more runnable code.
`;
