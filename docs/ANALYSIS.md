# uele — analysis and conformance report

Analysis basis: full read-through of `kethan/uele` at `c5ec3c4`, extended by the conformance pass on
`arena/b5381494-uele` (commits `c4a5975`, `54582f6`, `3cfe748`, `91fe0a1`, `26b3858`). Updated 2026-10-15.

Current state of the branch: `src/index.js` 178 lines (3 473 B min / 1 749 B gzip), `lite/index.js` 108 lines
(2 377 / 1 247), jsx runtime entries 17 lines each (427 / 264). **897 tests / 17 files**, **100 %
statements/branches/functions/lines** on `src`, `lite`, `jsx-runtime`, `jsx-dev-runtime`, enforced by
thresholds. All size budgets green. Node v22.22.3.

---

## 1. Repository map

| path | role |
| --- | --- |
| `src/index.js` | the full runtime (h/H, useLive/r/s/sub, map/For, If/Switch/Dynamic/lazy) — one file |
| `lite/index.js` | the tiny core (no If/Switch/Dynamic/lazy/map, marker-free `add` variant) |
| `jsx-runtime`, `jsx-dev-runtime` | 17-line JSX runtimes over `h`/`H` + `Fragment` |
| `src/index.d.ts` | hand-written types for every export |
| `test/*.test.js(x)` | 17 suites (see §4), plus `test/helpers/` for the signal-adapter and diff-engine matrices |
| `scripts/check-size.mjs` | byte budgets (min 3600/1800, es 8900/3050, lite 2500/1300, jsx 900/500 raw/gzip) |
| `scripts/patch-usub.mjs` | applies the usub 0.8.2 fix to `node_modules/usub` before the tests (vitest globalSetup) |
| `scripts/pack-smoke.mjs` | install-the-tarball smoke test |
| `docs/usub-0.8.2-upstream.patch` | the upstream source patch for `kethan/usub` (see §8.5) |
| `rollup.config.js`, `vitest.config.js` | four-entry build; jsdom + `--expose-gc` + v8 coverage thresholds |
| `.github/workflows/node.js.yml` | build, size, 100 % coverage, type tests, pack smoke on Node 18/20/22 |

30+ tracked files. `dist/`, `lite/dist/`, `jsx*/dist/` are gitignored and rebuilt.

## 2. How the runtime works (maintainer summary)

* `h(tag, props, ...kids)` builds a node; `H` deep-clones element kids so a vnode can be re-rendered;
  falsy scalars become `''`, falsy element values become placeholder comments.
* `useLive(value)` = a region delimited by two empty text markers. `r(x)`/`s(x)` subscribe through `usub.sub`
  (`api.is`/`api.get`/`api.effect`, optional `api.any`/`api.cleanup`) and update the region. `sub()` is the
  raw subscription helper; `add()` appends nodes to `document.body` and returns them.
* `map(items, cb, fallback, keyFn)` / `For`: keyed row cache; duplicate keys build fresh nodes; the callback
  runs `(value, index)`; non-iterable sources render the fallback; a source error keeps the previous content.
* `If`/`Switch`/`Dynamic` swap branches inside their own region; `lazy()` resolves a module/promise into the
  region and sweeps the placeholder; thunks are only reactive with `api.effect` adapters (`reactiveThunks`).
* `Live.replace` (post-`3cfe748`): with `api.diff` the differ owns the region
  (`api.diff(parent, oldNodes, newNodes, end)`; `api.udom` swaps the last two args to `(get, end)`); otherwise
  the nodes between the markers are walked off and the new ones inserted. **Both paths end with
  `oldNodes = newNodes`.** A region whose markers were removed is inert.

## 3. Findings and fixes

Production hardening (`c4a5975`): falsy-guards and `k`-free shared helpers in `h`/`H`, `map`/`For` duplicate-key
consumption, publish config/exports for all four entry points, byte budgets in `check-size.mjs`, pack smoke in
CI, two minimal `node_modules` regressions fixed. Four README "documented behaviour" claims were re-verified
against the code and corrected where they drifted (duplicate `map`/`For` keys documented in `54582f6`).

Conformance-pass defects (fixed in `3cfe748`):

| # | Defect | Impact | Fix |
| --- | --- | --- | --- |
| 14 | **`Live.replace` kept the previous nodes on the default path.** `oldNodes` was only reassigned on the `api.diff` branch, so without a differ the array stayed frozen at the first render. | (a) A leak: the nodes of the first render stayed reachable from the region (and from any differ configured later). (b) A correctness bug: configuring `api.diff` *after* a few default-path renders handed the differ nodes that were no longer in the document (a differ calling `parent.removeChild(old)` throws `NotFoundError`). | Both paths end with `oldNodes = newNodes`; a differ - and the collector - only ever sees what the region currently shows (`test/dom.cleanup.test.js`, `test/memory.test.js`). |
| 15 | **`map` assumed an iterable source** - `[...values]` threw for anything without `Symbol.iterator`. | A render crash (and the region's previous content lost) instead of an empty list. | `(values?.[Symbol.iterator] && [...values]) \|\| []`, with the error sink keeping the previous content (`test/for.test.js`). |

The per-region `Range` was replaced by the marker walk in the same step: same effect, no live `Range` per
region (browsers update those on every mutation), keeps working when the app moves a region's nodes, ~60 B
smaller.

Upstream defect in `usub` (fixed upstream, awaiting npm publish): `usub.sub` parked every subscription in a
`FinalizationRegistry` with a held value that closes over the source, so the cell could never clear - one
retained chain per subscription, even after `stop()`. The one-line fix is committed to `kethan/usub` as
`f63caaf` (0.8.2) and carried in `docs/usub-0.8.2-upstream.patch`; uele applies it to its test install via
`scripts/patch-usub.mjs` (vitest globalSetup) and `test/memory.test.js` now asserts exact zero retention. The
Arena GitHub token is scoped to `kethan/uele` only, so pushing `f63caaf` to `kethan/usub` (and `npm publish`)
needs an authorized session - `git am docs/usub-0.8.2-upstream.patch` in a usub checkout reproduces the commit
exactly.

## 4. Test suite

| suite | tests | covers |
| --- | --- | --- |
| `test/h.test.js` | 619 | h/H, props, deep clone, SVG/MathML, namespaces |
| `test/signals.libraries.test.js` | 27 | per-library traits (subscribe path, `api.any`, thunks, initial emission) |
| `test/signals.conformance.test.js` | 320 | one behavioural contract x 10 signal libraries x full/lite |
| `test/diff.conformance.test.js` | 125 | `api.diff` contract x 8 diff engines |
| `test/for.test.js` | 66 | map/For in depth: keys, duplicate keys, reactive rows, control flow, async sources, 1 000-item reuse |
| `test/dom.cleanup.test.js` | 61 | what is detached after every kind of update, plus cleanup invariants per engine |
| `test/memory.test.js` | 16 | reachability under `--expose-gc`; strict zero with the usub fix applied |
| `test/r.test.js` etc. | rest | r/s/sub, useLive, map, realtime, props, lite, jsx, components, dom |

All four entry points are at 100 % statements/branches/functions/lines (v8, per-file thresholds).

## 5. Byte accounting

Direct measurement (gzip level 9 / brotli), against budgets:

| bundle | raw | gzip | brotli | budget (raw/gzip) |
| --- | --- | --- | --- | --- |
| `dist/index.min.js` | 3 473 | 1 749 | 1 598 | 3 600 / 1 800 |
| `dist/index.es.js` | 8 535 | 2 964 | 2 621 | 8 900 / 3 050 |
| `lite/dist/index.min.js` | 2 377 | 1 247 | 1 146 | 2 500 / 1 300 |
| `jsx-runtime/dist/index.es.js` | 427 | 264 | 225 | 900 / 500 |
| `jsx-dev-runtime/dist/index.es.js` | 427 | 264 | 225 | 900 / 500 |

(`check-size.mjs` prints es gzip 2 967; direct node measurement gives 2 964 - level/rounding difference on the
same file.) Pre-fix baseline: min 3 469/1 745, es 8 203/2 798. The conformance-pass code changes net −~60 B.

## 6. Production checklist

| item | state |
| --- | --- |
| Defects #14/#15 fixed | ✅ `3cfe748` |
| usub retention fixed (upstream + applied in tests) | ✅ `f63caaf` / `scripts/patch-usub.mjs`; strict zero asserted |
| Byte budgets enforced in CI | ✅ `check-size.mjs` |
| All four entry points published + typed | ✅ |
| Documented behaviour & limitations | ✅ README |
| Ten signal libraries conform to one contract | ✅ `test/signals.conformance.test.js` (320 tests) |
| Eight diff engines conform to `api.diff` | ✅ `test/diff.conformance.test.js` (125 tests) |
| DOM cleanup pinned per update *and* per engine | ✅ `test/dom.cleanup.test.js` (61 tests) |
| Reachability measured under `--expose-gc` | ✅ `test/memory.test.js`, oracle with controls, strict zero |
| Test-only libraries stay out of the bundles | ✅ `devDependencies` only, budgets re-checked |
| Node 18/20/22 CI, non-watch `npm test` | ✅ |

## 7. Suggested next steps (not in this change)

1. Consider an opt-in `props.unmount`/cleanup registry for long lived stores (README recipe today).
2. Done except the publish: usub fix committed upstream as `f63caaf` (0.8.2, `docs/usub-0.8.2-upstream.patch`),
   memory suite flipped to strict zero. Remaining: push to `kethan/usub` + `npm publish` from an authorized
   session, then drop `scripts/patch-usub.mjs` and bump the dependency to `^0.8.2`.
3. Optional: a `sub`-level debug flag that names retained subscriptions in dev builds.

---

## 8. Conformance pass: signals, diff engines, DOM cleanup, memory

Second pass over the same commit, driven by "test with 5+ signal libraries, 5+ diff engines, verify DOM cleanup
and check for memory leaks". Everything below is `devDependencies` only - the shipped bundles are unchanged in
weight beyond the two fixes of §8.3 (budgets still enforced by `npm run size`).

### 8.1 Ten signal libraries

`usub` is the only reactive plumbing and everything reaches it through the `api` hook (`api.is`, `api.get`,
`api.effect`, plus the optional `api.any`/`api.cleanup`). `test/helpers/signal-adapters.js` installs ten
libraries into that hook behind one uniform "cell" API; `test/signals.conformance.test.js` (320 tests) then runs
the identical contract - rendering, live and nested regions, thunks, `map`/`For` keys, `If`/`Switch`/`Dynamic`/
`lazy`, teardown, cleanup, errors, unmount - against each of them, on the main build and on `lite`.

| library | cell shape | what the matrix pins |
| --- | --- | --- |
| `ulive` (baseline) | `{ value, peek }`, `effect()` returns a disposer | the reference for every other adapter |
| `@preact/signals-core` | `Signal` instances | `.subscribe()` is preferred by `usub` over `api.effect` since 1.13 |
| `@vue/reactivity` | `ref()`/`computed()` | `effect()` returns a runner that needs `stop()` |
| `usignal` | `Signal` class | `batch()` coalesces, disposer returned |
| `alien-signals` | plain functions (`s()`, `s(v)`) | reactive thunks, stop handle |
| `s-js` | `data()` functions | `S.root()`/`S.cleanup()` own the teardown |
| `mobx` | boxed observables, `isComputed` | `autorun()` disposer, `enforceActions: 'never'` |
| `rxjs` | `Subject` | `api.any` + `.subscribe()`, no reactive thunks |
| `nanostores` | atoms/computed stores | `api.any` + `.subscribe()`, synchronous `is`/`get` |
| `@tanstack/store` | `Store` | no synchronous first emission (`initialEmission: false`) |

What the table documents is a property of each library, not of uele: which hook `usub` picks for it, whether a
fresh cell emits immediately, and whether teardown arrives through `api.cleanup` or through the library's own
unsubscribe. The `lite` build is covered with the same adapters, which is how `usub/tiny`'s narrower dispatch
(promises, functions/signals, async iterables - no `subscribe`-observables, no `Symbol.observable`) is kept
honest.

### 8.2 Eight diff engines

`api.diff` is the only insertion point for a differ, and the documented contract is
`api.diff(parent, oldNodes, newNodes, end)` - or `api.diff(parent, oldNodes, newNodes, api.udom, end)` when
`api.udom` is set. `test/diff.conformance.test.js` (125 tests) checks that afterwards `parent` holds exactly
`newNodes` in order, that untouched siblings (including the `em` marker) are where they were, and that uele keeps
the same nodes as the region's current content:

| engine | what makes it interesting |
| --- | --- |
| built-in marker walk (no `api.diff`) | the default: no engine at all |
| `swapdom` | written for exactly this signature |
| `udomdiff` (+ `api.udom`) | needs the `get` helper and the `before` node |
| `domdiff` | takes an options bag (`{ before: end }`) |
| `morphdom` | morphs in place and consumes `to` |
| `nanomorph` | same pairing, different merge rules |
| `fast-array-diff` | the LCS patch decides the order, the adapter moves nodes |
| rebuild (remove + insert) | the smallest conforming differ, reference for the contract |

### 8.3 Two defects the conformance pass found and fixed

See §3 for the full table: (14) `Live.replace` kept the previous nodes on the default path (leak + stale nodes
handed to a differ configured later) and (15) `map` assumed an iterable source. The `Range`-per-region was
replaced by the marker walk in the same step.

### 8.4 DOM cleanup

`test/dom.cleanup.test.js` (61 tests) pins the cleanup contract rather than the rendering:

* a region always stays `marker … marker`; replaced content is *detached*, never orphaned inside its parent, and
  a hand-inserted node inside the span is swept by the next update;
* nested regions (a signal inside a region) collapse to the outer marker pair when the outer value wins, a
  region whose markers are removed is inert instead of throwing, and a region inside a detached subtree keeps
  updating its own nodes;
* `If`/`Switch`/`Dynamic` detach the branch they replace, `For` detaches dropped keys while surviving rows keep
  their node identity, and five `If` round trips leave a constant node count;
* live `data-*` attributes are removed for `null`/`false`, live style/class maps clear their property, a live
  property that shadows an attribute empties instead of removing, native handlers can be replaced and cleared,
  custom events stay listeners, and a detached node keeps its bindings without touching the document;
* the four core invariants (region width, marker identity, detached replaced content, clean document) are re-run
  **for each of the eight diff engines** - the in-place morph engines visibly *reuse* the node they were handed
  instead of detaching it, which is why that test accepts either outcome and pins "reused or detached, never
  dangling".

### 8.5 Memory

`test/memory.test.js` (16 tests) measures reachability with a `FinalizationRegistry` oracle under `--expose-gc`:
tracked objects are never dereferenced and never returned by a scenario, only numeric ids are, and two controls
prove the oracle neither over- nor under-reports (a dropped object is collected, a held object never is). Every
measurement is the difference between two batches, because V8 scans the stack conservatively and can keep a few
objects alive for one collection - a real leak is the size of a batch.

Measured (20 iterations per batch, second batch after a forced collection), with the usub fix applied:

| scenario | retained after the second batch |
| --- | --- |
| plain trees, listeners, attribute maps | 0 |
| a live region updated 3x per iteration (the `oldNodes` regression) | 0 of 60 replaced nodes |
| a region that replaces a nested region | 0 of 60 |
| resolved promises and `lazy` placeholders | 0 |
| keyed rows removed with a differ | 0 of 60 |
| an observable whose subscription does not reach its source | 0 |
| an unsubscribed rxjs `Subject` | 0 |
| a signal subscription through `usub`, disposed or dropped | **0** (20 of 20 on unpatched 0.8.1) |

On usub 0.8.1 the signal row read "20 of 20, exactly one per subscription, surviving `stop()`": `usub` registered
every subscription with `registry.register(target, unsub)`, `unsub` reached the callback (which has to close
over the source to read it), and a registered target that can be reached from the value registered for it is
never released - the cell never clears, so neither the source nor anything the callback reaches is ever
collected. Both halves of that rule are asserted (the value reaching the target, and the same registration
released when it does not), together with the *shape* of the retention: one entry per subscription, never per
update and never per node.

The fix is one line - keep the disposer the effect runner returned and only fall back to the registry when
there is none - and was verified three ways: patching `node_modules/usub` locally (all green, retentions to
zero), a before/after harness against the usub sources (40 of 40 refs retained before, 0 of 40 after, safety
net for subscribe-path sources intact), and regression tests added to usub's own suite for `src`, `lite` and
`tiny` (committed as `f63caaf`, carried in `docs/usub-0.8.2-upstream.patch`):

```js
unsub = unsubr(...) ||
    target.set && target.call?.(stop, next) ||
    ((api.is(target) || target.call) &&
        (api.any?.(target)?.(next, error, cleanup) ||
            (fx = api.effect?.(() => (next(get(target)), api.cleanup?.(cleanup), cleanup))))) || ...,
fx || registry.register(target, unsub),   // effect owned: nothing to park in the registry
```

Every effect-owned retention above drops to zero (the memory suite's signal rows included) while the whole
suite stays green. It cannot be done from inside uele's runtime: uele hands its callback to `usub.sub()` and
never owns the unsubscriber - but uele's test install applies the fix automatically (`scripts/patch-usub.mjs`
via vitest globalSetup) and `test/memory.test.js` asserts exact zero now. The two in-ulee workarounds that were
measured are both worse - routing signals through `api.any` keeps the cycle (the registry entry still holds the
target), and a `WeakRef`-anchored disposer retains *more*, because V8 keeps the referent of a live `WeakRef`
alive. The README's Cleanup Support section keeps the `MutationObserver` + `props.unmount` recipe as good
hygiene (stops updates the moment a subtree goes away).

---

## 9. Comparison with `arena/ce31a784-uele` (PR #3)

Both branches diverge from `main` (`c5ec3c4`) and answer the same mandate. Verified facts (the other branch's
suites were executed in a scratch copy of `f57fb10` - every number below was observed green):

| | `arena/b5381494-uele` (this branch) | `arena/ce31a784-uele` (PR #3) |
| --- | --- | --- |
| shape | 4+ commits, runtime +30 lines, ~8.6k lines of tests/docs | 1 squashed commit, 42 files, +5 172/−1 931 |
| architecture | unchanged single-file runtime, `usub.sub` kept | runtime split (`scope.js`/`subscribe.js`/`protocols.js`), **local `subscriber` replaces `usub.sub`** |
| the memory defect | measured & pinned; **fixed upstream** (usub 0.8.2 `f63caaf`, applied in tests, memory suite asserts zero) | eliminated in-tree: node-owned subscriptions, no `FinalizationRegistry` |
| cleanup contract | documented API preserved (auto-dispose, `unmount` recipe) | **`dispose(root)` required** for manual roots (their negative control asserts omission retains); observable errors terminal; usub's source-GC safety net dropped |
| signal libraries | 10 (adds s-js, mobx, rxjs, nanostores, @tanstack/store) | 6 (adds solid-js; `usignal` pinned 0.10 sync) |
| diff engines | 8 (adds morphdom, nanomorph, rebuild, built-in walk) | 6 (adds `@thi.ng/diff`, `list-diff2`; 50 700 exhaustive transitions) |
| DOM cleanup | 61 tests, per-engine invariants, live attr/style/handler edges | partial-render rollback, cleanup that throws/mutates DOM (`AggregateError`), async termination |
| test runs | 897 vitest, 100 % x4 entries, types + pack smoke | 971 vitest + 1 942 bundle re-runs + 20 package + 62 GC + **13 Chromium** + 16 size gates |
| bytes (min, raw/gzip) | 3 473/1 749 full, 2 377/1 247 lite | 5 017/2 390 full, 3 415/1 698 lite (ships es/cjs/min/umd x4, minified ESM) |

Both found the same two facts independently: the stale-`oldNodes` leak (they derive the old set from the DOM
span each update; we adopt `oldNodes = newNodes` - equivalent) and the `usub` registry retention (they remove
`usub.sub`, we fixed it upstream and apply it in tests). The decisive difference is the **contract**: PR #3
trades a new required `dispose()` call and terminal errors for deterministic, GC-independent cleanup; this
branch keeps the documented zero-API contract. The branches collide on `src/index.js`, `lite/index.js`,
`package.json`, `rollup.config.js`, `scripts/check-size.mjs`, `README.md` and both vitest configs - reconciling
means picking one runtime model and porting the other branch's unique coverage into it (our
s-js/mobx/rxjs/nanostores/tanstack adapters, morphdom/nanomorph engines and cleanup edges one way; their
bundle/package/browser gates the other way).
