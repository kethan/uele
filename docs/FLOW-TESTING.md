# Map, For and flow conformance

Run the focused source suite with `npm run test:flow`. Run the same production
scenarios against built ESM/CJS with `npm run test:bundles`, and real Chromium
with `npm run test:browser`. The default coverage gate remains 100% in all four
metrics; no assertions, thresholds, memory checks or size limits were relaxed.

## Existing depth retained

- `test/map.test.js`: plain/reactive sources, fallback, iterable shapes, keys,
  duplicates, node reuse, diff signature, and large-list updates.
- `test/for.test.js`: signals/thunks/promises/observables/async iterables, errors
  and recovery, NaN/object/duplicate keys, nested lists, marker boundaries, props,
  every installed diff engine, 1,000 rows × 200 keyed edits and 2,000 update cycles.
- `test/components.test.js`: If/Show/Match/Switch/Dynamic behavior, aliases,
  function children, fallbacks and errors.
- `test/flow.test.jsx`: Await, Suspense, ErrorBoundary, Portal and Title, including
  async races, rejections, fallback behavior and live signal updates.
- Ownership, DOM cleanup, memory and diff suites check renderer-owned release,
  node reuse, retained state, stale-node handling and bounded reconciliation.

## Additional stress coverage

`test/flow.stress.test.js` runs against source and both built formats:

- Map and For, each under full's default compact swapdom and the basic fallback:
  **750 seeded list edits each (3,000 total)**. Every edit checks exact ordering,
  retained-key DOM identity, outside-region siblings, resource counts and exact
  disposal. Repeated unmount stops the list source exactly once.
- **500** combined If/Show/Match/Switch/Dynamic transitions. Every branch's
  resource is disposed exactly once and live resource counts match the model.
- Await and Suspense each receive **60** competing promises, settled in reverse
  order with mixed resolution/rejection, plus a late completion after teardown.
- **100** independent ErrorBoundary failures (sync and async), checking containment,
  onError calls, fallback order and unaffected siblings.
- **100** Portal/Title mount-update-unmount cycles, checking signal updates,
  complete remote DOM removal, title restoration and exactly-once disposal.

`test/browser/flow-stress.pw.mjs` exercises **every flow component** together in
real Chromium: 200 keyed map/For edits, node identity, conditional aliases,
Switch/Dynamic, Portal/Title updates, 30-way async races, error containment and
renderer-owned teardown. The existing browser suite also checks real input,
focus/selection preservation, accessibility and router/Title cleanup.

These are deterministic correctness/stress tests, not a claim that every possible
program is correct or a comparative performance benchmark.
