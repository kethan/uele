# Renderer tiers and source layout

The breaking renderer-hook migration is implemented. `lazy` remains a full-entry
helper; control-flow components now live in `uele/flow`.

| Entry | Contents |
| --- | --- |
| `uele/tiny` / `uele/core` | Minimal core: h, r, api, add, props, useLive |
| `uele/lite` | Core + usub/tiny + SVG/MathML policy |
| `uele` | Core + usub + SVG/MathML + map, f, lazy + swapdom/deflate |

```text
src/core.js          renderer implementation
src/index.js         full composition
src/map.js           optional list primitive, bound to a core
src/full-helpers.js   f and lazy
src/install.js       supported signal integration/namespace configuration
lite/index.js        lite composition
tiny/index.js        minimal core
utils/index.js       predicates, node conversion, noop, shared cleanup
utils/namespaces.js  optional SVG/MathML policy
flow/control.js      control-flow implementation, no root import
flow/index.js        default controls and existing flow components
```

`core/index.js` is a compatibility re-export of `src/core.js`; it contains no
second renderer. Utility implementation is in `utils/index.js`, not duplicated
in each tier. There is no test-injected ownership export, copied helper facade,
or replacement of core rendering methods.

There are exactly three renderer variants. `uele/core` and `uele/tiny` are aliases
for the same variant. `uele/flow` is a component module, not another renderer.

## Imports after migration

```js
import { h, api, map, lazy } from 'uele';
import { If, For, Switch, Dynamic } from 'uele/flow';
```

Standalone `is`, `get`, and `sub` exports have been removed. Use the current
`api.is`, `api.get`, and `api.sub` instead. On configured full/lite entries,
signal-library engine hooks are under `api.engine`:

```js
api.engine.is = value => value?.peek;
api.engine.get = value => value.value;
api.engine.effect = effect;
```

Prefer the published signal presets and `configure()` for normal applications.
They configure the signal integration engine and install the authoring hooks consumed by
`uele/reactive`. The authoring facade follows the main entry; configuring lite
still does not rebind that global facade.

## Core/tiny rendering

```js
import { h, api } from 'uele/tiny';
document.body.append(h('p', null, () => ['Hello ', h('b', null, 'world')]));
```

`api.is` defaults to false; `api.get` evaluates a function once or returns a plain
value unchanged. `api.sub` and `api.ns` are absent. Bare core does not import
usub, signals, namespace policy, or flow. Install a signal integration through its supported
hooks when reactivity is needed, for example:

```js
import { Signal, effect } from '@preact/signals-core';
api.is = value => value instanceof Signal || typeof value === 'function';
api.get = value => value instanceof Signal ? value.value
  : typeof value === 'function' ? value() : value;
api.sub = (source, next) => effect(() => next(api.get(source)));
```

Full/lite presets target their configured API/engine. A bare tiny core is not an
already-configured usub instance; configure its three renderer hooks explicitly.

## Instance isolation and build behavior

Full and lite load the same `src/core.js` implementation with distinct native
ESM module IDs (`?full` / `?lite`). Thus their mutable API objects and prop maps
are independent, while the bare tiny/core instance stays unconfigured. These are
normal module instances, not runtime eval, source patching, or test-only APIs.
Rollup's small resolver preserves the native ESM module-ID semantics in CJS/IIFE
builds. There is no wrapper renderer or duplicated renderer source.

Core and list helpers import the same private cleanup utilities in each composed
module graph. Helpers register disposers; renderer-owned replacement runs them
for discarded nodes/subtrees. Reused nodes keep their subscriptions. Do not mix
owned subtrees between independently bundled renderer instances. Native remove()
and innerHTML operations still bypass renderer-owned cleanup.

The dependency direction is flow -> full -> core -> utils. Full does not import
or re-export flow. Diff adapters all receive `(parent, oldNodes, newNodes, end)`;
engine-specific callbacks belong in the adapter, not in core. `api.udom` was removed. `createControlFlow({ get, map })` provides explicit composition
with another renderer; its get callback should read the target's current API.

## Default reconciliation

Only full configures upstream `swapdom/deflate` by default. Its compact algorithm
accepts the node arrays supplied by core; no upstream source is copied. The
explicit swapdom preset still selects upstream's inflate variant. Core/tiny
and lite retain basic marker replacement. `builtinDiff()`
clears the selected entry's diff hook to restore that basic fallback.

Every replacement snapshots the actual DOM between markers. This accounts for
independent nested updates and hand-inserted nodes, and gives diff engines current
nodes rather than stale initial arrays. In-place morphers no longer need to write
survivors into newNodes for future renderer updates.

The experimental renderers and their build/test bridges have been retired. The
migration/coverage map is in [benchmarks/production-cutover.md](../benchmarks/production-cutover.md).

## HTML compatibility details

Full installs the optional attrs.children property handler. Those children follow
positional children. It runs during property iteration, so an earlier ref handler
can run before attrs.children are appended; it does not mutate the caller's attrs.
This differs from the old full renderer's children pre-pass. Lite retains its old
lack of attrs.children handling; bare core also needs an explicit property plugin
if that convention is desired. Normal positional children work in every tier.

## Runnable app proofs

Complete tree-shaken applications measure 966 B gzip (Hello World), 1,248 B
(signal counter including ulive), and 1,473 B (signal todo with cached rows).
These use tiny/core entries, not the root full composition. See
[the reproducible proof](../examples/size-proof/README.md) and
[flow stress coverage](../docs/FLOW-TESTING.md).

## Sizes and validation

| Measurement | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Core/tiny, bundled ESM all exports | 1,870 | 975 |
| Full built IIFE | 3,666 | 1,881 |
| Lite built IIFE | 2,581 | 1,359 |

These are whole-entry measurements, not additive component sizes. Core excludes
optional signal integration/namespace/children plugins. Original size limits were not raised.

Validation after migration:

- Default suite: 2,552 tests, 100% statements/branches/functions/lines.
- Production core suite: 2,552 tests, 100% in all four coverage metrics.
- Built ESM conformance: 1,776 tests; built CJS conformance: 1,441 tests.
- Thirteen Chromium/browser tests, including actual built core ownership.
- Installed tarball ESM/CJS imports, tiny/core identity, export locations and types.

```sh
npm run build
npm run test:coverage
npm run test:core
npm run test:bundles
npm run test:types
npm run size
npm run size:core
npm run test:pack
npm run test:browser
```
