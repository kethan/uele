# UStor integration review

The initial source review used https://github.com/kethan/ustor at revision
`bd6898bdb0137e8606a2b0e61d53b9bc4cd888ae`. The current bridge follows the
published **ustor 0.3.0** API (`computed` / `getComputed`), installed as a
development-only dependency. See the
[README guide](../README.md#object-and-array-state-with-ustor) and
[executable examples](../examples/ustor/README.md).

## Fit

UStor is a complementary optional object/array state layer, not a replacement
for uele's renderer, signal engine, `usub` subscriptions or hook ownership.
It makes nested writes and computed getters convenient while using an existing
signal engine. Both libraries should be configured against the same engine.

The main integration hooks already line up:

| uele API | UStor API |
| --- | --- |
| `signal` | `signal` |
| `get` | `get` |
| `set` | `set` |
| `is` | `is` |
| `computed` | `computed` |
| `get` | `getComputed` (verify for each engine's memo representation) |

Example application-level bridge, for Preact:

```js
import { api, h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { store, api as storeApi } from 'ustor';

preactSignals();
const { signal, get, set, is, computed } = api;
Object.assign(storeApi, { signal, get, set, is, computed, getComputed: get });

const state = store({
  count: 0,
  get double() { return this.count * 2; }
});
const button = h('button', { onclick: () => state.count++ }, () => state.double);
```

An ordinary property read such as `h('span', state.count)` is a snapshot.
Use a tracked thunk (`() => state.count`) or a native `$count` cell for a live
binding. Store objects and array proxies are not themselves signal cells.

## Evidence and limits

`test/ustor.test.js` runs the published package with Preact and Vue, covering the
counter/cart example modules, property thunks, native `$count` cells, computed
getters, nested writes, array push/reverse/splice/replacement, DOM row identity,
independent app state, and explicit DOM teardown. It also executes the README's
counter snippet. This does not certify every signal engine, run upstream's full
suite, prove GC behavior or replace production-browser testing.

The deeper keyed-reversal test exposed a real Vue integration detail: ordinary
Vue `ref` double-wraps UStor's array proxy and can recreate keyed rows during
intermediate mutations. The documented Vue bridge supplies `shallowRef` on the
UStor side; the renderer's normal Vue integration remains unchanged. The test
asserts node identity, not just equivalent final text.

No UStor runtime dependency, source vendoring or public store API was added.

Important rollout considerations:

- Keep UStor optional; core uele users should not pay for object-store behavior.
- UStor's API/cache are module-shared. Configure once before creating stores and
  do not switch signal implementations while existing stores are live.
- Object schemas are sealed. Replace a containing object to change its shape.
- Mutate returned array proxies, not the original raw arrays.
- Fresh per-request input objects are important: the WeakMap cache returns the
  same store when the same raw input is reused.
- Subscribe-only integrations do not provide automatic tracking for arbitrary
  property/getter/array thunks. Native `$property` bindings and whole-value
  replacements are different from deep mutation tracking.
- Vue/MobX shallow containers and engine-specific owner/root requirements deserve
  dedicated compatibility tests; passing a basic smoke check is not sufficient.
- UStor does not expose a general per-store disposal API. UI subscriptions and
  engine-owned computed values/scopes still need their actual ownership/cleanup paths.
- Tests use the published 0.3.0 package, not a copied implementation. Revalidate
  compatibility when upgrading either library.

Recommendation: start with direct UStor usage and an explicit application bridge
for an effect-capable engine such as Preact. Only add an optional public bridge
if repeated application usage justifies it; do not make it a core dependency or
introduce another reactivity engine.

Historical validation before the UStor 0.3.0 upgrade:
**2,466 tests / 59 files passed with 100% configured coverage**. ESM/CJS bundle
suites, strict declaration checks, packed-consumer smoke tests and all existing
size budgets passed. Main minified/ESM and lite minified core artifacts match
their pre-change SHA-256 hashes. Browser automation was not rerun.

UStor 0.3.0 upgrade verification: all 14 published-package integration tests and
140 documentation tests pass, including execution of the README example, Preact
and Vue computed getters, keyed updates and teardown. Normal and strict
(`skipLibCheck: false`) declaration checks pass. The bridge now uses `computed`
and `getComputed`, with explicit assertions that it does not introduce `memo` or
`getMemo` aliases. Core hashes remain unchanged. The full-suite figures above
are historical; the full suite was not rerun for this dependency-only upgrade.
