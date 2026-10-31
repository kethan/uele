# UStor + uele examples

For the simplest counter, start with the
[basic README example](../../README.md#object-and-array-state-with-ustor).
This guide adds keyed arrays, explicit teardown, and engine-specific setup.

## Counter and cart with explicit teardown

Install `uele`, `ustor@^0.3.0`, and `@preact/signals-core` in your application.
These examples use ordinary JavaScript modules with a bundler; no JSX is required.
From this repository, run `npm ci`, `npm run build`, then
`npx vite examples/ustor` to open the small browser demo (`index.html`).
UStor is a development dependency for uele's tests, not a required runtime dependency.

```js
import { preactSignals } from 'uele/signals/preact';
import { connectStore } from './setup.js';
import { createCounter } from './counter.js';
import { createCart } from './cart.js';

preactSignals();
connectStore(); // application-level bridge: api.computed → ustor's api.computed

const counter = createCounter(1);
const cart = createCart([
  { id: 'book', name: 'Book', price: 12, quantity: 1 }
]);
document.body.append(counter.view, cart.view);

cart.state.items.push({ id: 'pen', name: 'Pen', price: 2, quantity: 3 });
cart.state.items[0].quantity = 2;

// At actual application teardown, stop DOM subscriptions before removing roots:
counter.dispose();
cart.dispose();
counter.view.remove();
cart.view.remove();
```

`setup.js` is an example helper, not a new public uele entry point. It captures
hooks from the configured main API. Both libraries call the computed constructor
`computed`; UStor’s `getComputed` is mapped to uele’s `get`.

Use `() => state.count` or `state.$count` for live rendering. Passing `state.count`
directly is a snapshot. Object schemas are sealed; replace a containing object to
change its shape. Both libraries have shared configuration, so configure once
before creating stores and do not switch engines while existing stores are live.
Use fresh input objects per request/app. Region disposal stops UI subscriptions;
it does not invent a store-wide disposer or dispose engine-specific owner scopes.

`test/ustor.test.js` runs the counter/cart examples against the published ustor
package with Preact and Vue, including keyed-list updates and UI teardown.

## How unmounting works

There is no `region()` helper to learn. The counter and cart create their DOM
normally, then use the public `useLive` API directly:

```js
import { h, useLive } from 'uele';

const content = h('p', null, 'Hello');
const [nodes, replace] = useLive(content);
const view = h('div', nodes);
const dispose = () => replace(null);

document.body.append(view);
// Later, when the app is actually being unmounted:
dispose();
view.remove();
```

The basic [README counter](../../README.md#object-and-array-state-with-ustor)
can append its DOM directly. Explicit disposal is useful for views that are
mounted/unmounted repeatedly; it is not required to create a store or make
nested properties reactive. Native `view.remove()` alone does not stop owned
subscriptions. Neither `useLive` nor this demo invents a store-wide disposer.

## Vue: use a shallow container for UStor values

Vue's deep `ref` can wrap UStor's array proxy again and expose intermediate array
mutations to rendering. Give UStor a `shallowRef` factory; keep the renderer's
normal Vue integration unchanged:

```js
import { api } from 'uele';
import { vue } from 'uele/signals/vue';
import { shallowRef } from '@vue/reactivity';
import { connectStore } from './setup.js';

vue();
connectStore({ ...api, signal: shallowRef });
// Now createCounter()/createCart() use Vue cells without double-wrapping arrays.
```

Configure Preact OR Vue per application/module instance, not both while stores
are live. Tests verify DOM row identity across cart reversal, not just final text.
