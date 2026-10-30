# Configuration and naming

## Configuration responsibilities

- `uele/signals/<library>` connects a signal library to the renderer.
- `uele/diffs/<engine>` selects a DOM reconciliation strategy.
- `uele/props` provides optional DOM prop handlers (`appProps`).
- `uele/reactive` is the main renderer's portable authoring facade, not another
  signal engine: `signal`, `computed`, `effect`, `read`, `write`, etc.

All installers are ordinary functions. Calling one installs it immediately. There
are no configuration factories, descriptors, registries or implicit peer imports.

```js
import { configure } from 'uele/setup';
import { preactSignals } from 'uele/signals/preact';
import { stage0 } from 'uele/diffs/stage0';
import { appProps } from 'uele/props';

configure({ signals: preactSignals, diff: stage0, props: [appProps] });
```

`configure(options, renderer)` defaults to the main renderer and returns its target.
It calls signals with `renderer.api`, then diff with `renderer.api`, then each prop
pack with `renderer`. Omitted categories remain untouched. A signal installer still
replaces its complete signal-hook surface, clearing unsupported hooks as before.
Prop packs are an ordered array; the last registration for a name wins.

Configuration is synchronous, ordered, and not transactional: an installer exception
propagates without rolling back previous installers. It is intended for startup,
not runtime library switching. Existing cells/subscriptions are not migrated.

## Lite uses the same setup API

```js
import * as lite from 'uele/lite';
configure({ signals: preactSignals, diff: stage0, props: [appProps] }, lite);
```

Full and lite use separate core instances and signal integration API objects, with one shared
renderer implementation. Changing one entry's hooks does not change the other. `uele/reactive` follows the main API, not a configured lite target.
Use native signal APIs or lite's installed API hooks when authoring for lite.

## Direct calls are still available

```js
preactSignals(); // main api
stage0();        // main api
appProps();      // main renderer
```

For explicit targets, signals/diffs accept `lite.api`, while props accept `lite`.
Use the optional coordinator if you prefer one renderer target for all categories.

## Canonical names and private implementation

Signal implementations live in `signals/`, each with one public installer:
`preactSignals`, `vue`, `alienSignals`, `tanstackStore`, etc. Diff installers follow
the same convention (`stage0`, `swapdom`, `builtinDiff`); the optional prop pack is
`appProps`. The old adapter paths and `use…` installer aliases are removed.

Package exports enumerate the supported signal subpaths. Neither
`uele/signals/internal` nor `uele/signals/util` is importable. There is no umbrella
signals entry point, so unrelated optional peers are never auto-imported.

`signals/internal.js` is integration-author plumbing, not application reactivity:

- `install(target, hooks)` resets the managed signal integration-hook surface on `target.engine`
  (or a plain signal integration target), and installs authoring hooks on the renderer. The
  renderer's generic is/get/sub hooks and unrelated diff configuration are preserved.
- `HOOKS` defines those managed slots.
- `scoped(run)` adapts the integration's effect/disposal protocol for the renderer.
  It does not provide component ownership or automatic cleanup for application hooks.

`uele/reactive` consumes the installed main API; it does not import the helpers.
Keeping these layers separate avoids loading integration plumbing into applications
that only use the authoring facade. `uele/setup` remains optional and outside core.

## Reactive authoring stays stable

```js
import { signal, computed, read, write } from 'uele/reactive';
const count = signal(0);
const doubled = computed(() => read(count) * 2);
write(count, read(count) + 1);
```

Cells retain their native representation; use `read`/`write` for portable code.
Subscribe-only presets do not support effects/computed: check `canEffect()` and
`canCompute()`. Existing batch/untracked fallbacks are unchanged. Bound reactive
facades and isolated renderer factories are intentionally not part of this API.

## Diff hook

Every engine uses `api.diff(parent, oldNodes, newNodes, end)`. The `api.udom`
signature switch has been removed; udomdiff-specific arguments live in its adapter.
Full defaults to upstream `swapdom/deflate`; core/tiny and lite keep basic marker
replacement. `builtinDiff()` explicitly selects the basic fallback on any entry.
Each update snapshots current bounded DOM, so independent nested-region changes
are visible to the differ. In-place morphers need not write survivors into
newNodes for the renderer's next update.

## Measured size and validation

The renderer layout is now `src/core.js` -> tiny/core, full composition in
`src/index.js`, lite composition in `lite/index.js`, and shared `utils/index.js`.
Full keeps `map`, `f`, and `lazy`. Import If/For/Show/Match/Switch/Dynamic from
`uele/flow`; Portal and the other existing flow components stay there.

This is a breaking API migration: standalone is/get/sub exports are removed in
favor of renderer `api.is/get/sub`. Configure library-specific hooks through
`api.engine` or the signal presets. Bare tiny/core needs explicit renderer-hook
configuration and includes no usub signal integration or namespace policy.

Current full minified build is 3,666 raw / 1,881 gzip bytes; lite is 2,581 / 1,359.
Bare core bundled ESM measures 1,870 / 975, without optional signal integration or namespace
policy. These are whole-entry measurements, not sums of compressed components.
See [the detailed tier/migration guide](../core/README.md).
Existing size gates and 100% coverage thresholds are unchanged.

## Hooks and ownership

`uele/hooks` now has one canonical name per composable and no reactive-primitive
wrappers/re-exports. Multi-value returns are named objects. Resource-owning hooks
expose terminal, idempotent disposal; async results are invalidated after disposal.
See [HOOKS.md](HOOKS.md) for exact contracts and examples. Standalone hooks have explicit ownership; rendered components can attach that
ownership to a DOM node as shown below. No isolated runtime is introduced.

## Computed naming

The integration hook is `api.computed(fn)`, matching `computed(fn)` from
`uele/reactive`. The old `api.derived` spelling is removed, not aliased.
All signal integrations and their capability checks use `computed` consistently.
UStor 0.3.0 uses the same `computed` name; map its `getComputed` reader to
uele’s `get`. See the
[README example](../README.md#object-and-array-state-with-ustor).


## Component ownership is automatic at the renderer boundary

Built-in UI, flow and router components attach their resource cleanup to a private,
inert `<template>` marker through the existing custom-prop disposer contract. No
signal-engine cleanup hook, observer, new core export or renderer byte increase is
required. Discarding a subtree through a uele region cleans up its subscriptions,
timers, document listeners and observers. Portal teardown also clears its external
region; Await and router results cannot commit after disposal. Title restores the
previous title only if no newer writer has replaced its value.

This does **not** detect arbitrary DOM mutations: native `node.remove()`,
`innerHTML = ''`, or abandoning detached components bypass the renderer. Mount
content in `useLive()` (and call its setter with `[]` to unmount), or another uele
region, when it owns resources. Components and the reactive facade are main-renderer
bound; configuring lite does not retarget them or create a separate runtime.

Application hooks cannot infer their lifetime simply because they were called inside
a component function. Use the existing optional action protocol to attach one:

```jsx
import { appProps } from 'uele/props';
import { useInterval } from 'uele/hooks';
appProps(); // once at startup

const Clock = () => {
  const timer = useInterval(() => console.log('tick'), 1000);
  return <span use={() => timer.dispose}>Running</span>;
};
```

The action returns the disposer, not `timer.dispose()`'s result. The renderer invokes
it when this element is discarded. Outside a rendered owner, call `dispose()` yourself
when the application/service lifetime ends. State-only hooks (including `useTheme`)
need no synthetic disposer. Prop handlers still return cleanup functions unchanged.

## Canonical optional-module API

- `useRouter(app)` returns `{ view, props, navigate, dispose }`, not a tuple or a
  props factory. `view` is a `Cell<unknown>`; spread `props` on the link container.
  Returned `navigate` resolves that view. Module-level `navigate` changes browser
  history and notifies routers. `<Router>` owns its hook automatically.
- UI keeps the implementation names: `OTPInput`, `Separator`, `TableHead`,
  `TableBody`, `TableHeader`, `TableCell`, `Drawer`, `AlertDialog`, `Menu`,
  `StatusDot`, `TimeAgo`, `Tree`, `CommandPalette`, `SplitPane`, `Lightbox`, `Wizard`.
  Duplicate synonym exports are removed, not deprecated.
- Themes keep `createTheme`, `cssVars`, and `variants`; `defineTheme`, `themeVars`,
  `cva` and `defineVariants` are removed. `useTheme().theme` is a `Cell<UeleTheme>`;
  `setTheme` accepts a theme name/options/theme or an updater receiving `UeleTheme`.

### Lifecycle verification

The completed ownership/naming pass passes 2,507 tests across 61 files with 100%
configured statements, branches, functions and lines. Bundle suites pass 1,757
ESM tests and 1,422 CJS tests, including native-require DOM teardown checks.
Published-package smoke tests and strict declaration checks pass. Main minified,
main ESM and lite minified hashes still match the pre-lifecycle baseline; size
budgets and memory/coverage assertions were not loosened.

### Minimal callback State example

See [the State todo](../examples/README.md#todos--your-dead-simple-state-no-signal-package) for the supplied getter/setter/subscriber function and its example-only `.subscribe()` bridge. Full uele owns those subscriptions; no new public state API or renderer variant is introduced. Private helpers such as `uele/diffs/util` are not public entry points.
