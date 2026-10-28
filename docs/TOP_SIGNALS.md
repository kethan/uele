# Completing the requested top-11 signal library set

This addition is limited to the libraries in the supplied
[js-reactivity-benchmark](https://github.com/volynetstyle/js-reactivity-benchmark)
list. Benchmark rankings change; these integrations do not claim a performance order.

| Requested library | uele preset | Status |
| --- | --- | --- |
| alien-signals | `uele/adapters/alien-signals` → `useAlienSignals()` | Existing |
| reflex | `uele/adapters/reflex` → `useReflex()` | Added (`@volynets/reflex`) |
| @reactively | `uele/adapters/reactively` → `useReactively()` | Added (`@reactively/core`) |
| @vue/reactivity 3.6 RC | `uele/adapters/vue` → `useVue()` | Existing adapter; tested with RC |
| anod | `uele/adapters/anod` → `useAnod()` | Added |
| Preact Signals | `uele/adapters/preact` → `usePreactSignals()` | Existing |
| lite-signal | `uele/adapters/lite-signal` → `useLiteSignal()` | Added (`@zakkster/lite-signal`) |
| rescript-signals | `uele/adapters/rescript-signals` → `useRescriptSignals()` | Added |
| s-js | `uele/adapters/sjs` → `useSjs()` | Existing |
| @maverick-js/signals | `uele/adapters/maverick` → `useMaverick()` | Added |
| Oby | `uele/adapters/oby` → `useOby()` | Added (`oby`) |

## Usage

Install **only the peer for the adapter you choose**, then install the preset once
before creating cells or rendering. Importing an adapter alone does not install it.
ReScript Signals additionally requires `@rescript/runtime` (its generated JS imports
that package without declaring it as a dependency).

```sh
npm install @maverick-js/signals
```

```js
import { useMaverick } from 'uele/adapters/maverick';
import { signal, computed, read, write } from 'uele/reactive';

useMaverick();
const count = signal(0);
const doubled = computed(() => read(count) * 2);
write(count, 2);
console.log(read(doubled)); // 4
```

All seven presets also accept the lite renderer's **api object**:

```js
import { api } from 'uele/lite';
import { useOby } from 'uele/adapters/oby';
useOby(api);
const count = api.signal(0);
api.set(count, 1);
```

`uele/reactive` targets the main renderer. For lite authoring use the hooks on lite's
configured `api`, not the main facade.

## Interoperability and scheduling

Prefer creating cells via `uele/reactive` (or the configured target's hooks), and use
`read`/`write` instead of assuming `.value` or calling native setters. Reflex, Maverick,
Anod, lite-signal and ReScript Signals use callable adapter wrappers, preventing
`usub` from mistaking native callable `.set` cells for callback-style observables.
Anod's wrappers bridge its explicit dependency-tracking contexts. Do not mix nodes
from different installations/registries. Install once, not inside each component.

- **Reflex:** creates an eager runtime during installation for synchronous updates.
  This configures Reflex's active global runtime; don't reinstall during an active app.
- **Reactively:** `write` and the facade's `batch` call `stabilize` at the outer commit.
  Direct writes to native `Reactive` objects require native `stabilize()`.
- **Maverick / Oby:** facade writes and batches flush native effect queues with `tick()`.
  Native writes outside this facade retain their library's scheduling behavior.
  Oby's adapter uses synchronous commit batches, not its asynchronous `$.batch` API.
- **Anod:** batches preserve read-your-writes for source wrappers. Derived values
  retain Anod's native committed-value semantics while inside a batch.
- **Reactively / ReScript Signals:** no `untracked` hook is installed; the facade's
  fallback simply runs the callback and must not be relied on to suppress tracking.
- Batch callbacks are synchronous; do not expect a transaction across `await`.

Every preset returns its target and clears stale reactivity hooks. All offer effects,
computed values, writes and batching. Removed uele regions dispose their rendering
subscriptions; application-owned cells and graphs remain application-owned.

For an explicitly owned lite-signal registry, supply it as the second argument and
destroy it when the **whole app** is torn down (after removing its regions):

```js
import { api } from 'uele';
import { createRegistry } from '@zakkster/lite-signal';
import { useLiteSignal } from 'uele/adapters/lite-signal';
const registry = createRegistry({ prealloc: 'lazy', onCapacityExceeded: 'grow' });
useLiteSignal(api, registry);
// ... mount and later unmount the app ...
registry.destroy();
```

The ESM preset sources consume optional peer packages. The CommonJS twins inline
ESM-only libraries so Node 18/20 can require them (including Anod, which has no
`require` export). Those twins use the engine versions resolved at build time.
Reflex has native CJS exports and stays external in its CJS preset.

## Vue 3.6 RC

No duplicate Vue preset and no forced upgrade from stable Vue are needed:

```sh
npm install @vue/reactivity@3.6.0-rc.12
npm run test:vue-rc
```

The development suite uses an npm alias for the benchmark's RC version while keeping
stable `@vue/reactivity` installed. `test:vue-rc` aliases the existing Vue preset to
that RC and runs preset, main/lite conformance and shared-facade tests. The alias is
a dev dependency only; applications import the usual `@vue/reactivity` package.
