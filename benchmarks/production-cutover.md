# Production cutover: default reconciliation and prototype retirement

> Historical measurements. The current three-tier layout and remeasured apps
> are documented in [three-tiers.md](three-tiers.md).


Full now configures the published `swapdom/deflate` algorithm directly. It does
not import the root-bound preset, copy upstream source, or replace any renderer
method. The existing swapdom preset still selects upstream's inflate variant.
Core/tiny, lite, and backend-free core/full keep the basic replacement fallback.
Any preset can override the diff hook; builtinDiff clears it to basic replacement.

The initial inflate build exceeded the existing full ESM gzip budget (3,642 B
versus 3,600 B). Compact deflate is appropriate because core passes arrays, not
live NodeLists. All final gates pass without changing their limits.

## Correctness-driven structural adjustment

A parent's stored initial node array becomes stale when a nested region updates
independently. Passing it to a keyed differ caused NotFoundError and missed
hand-inserted content. Core now snapshots the current marker-bounded DOM before
cleanup/reconciliation and uses that snapshot for both fallback and custom diffs.
This also fixes repeated in-place morphs without requiring newNodes write-back.
The conformance test that previously demonstrated the stale-array failure now
asserts successful repeated morphs, removal, and preservation of outside siblings.

## Final sizes

Production IIFE full: **3,666 minified / 1,881 gzip B**. This is +297/+144 B versus
the pre-swapdom 3,369/1,737 entry, including the shared correctness adjustment.
Lite: **2,581 / 1,359 B** (+19/+6). Bare bundled ESM core: **1,870 / 975 B** (+19/+8).
Backend-free core/full: **2,297 / 1,187 B**. All original budgets remain unchanged.

Uniform all-export bundled ESM minified/gzip-9/Brotli-11:

| Tier | Minified | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Core | 1870 | 975 | 879 |
| Full | 3662 | 1891 | 1747 |
| Lite | 2561 | 1362 | 1241 |

Raw browser/size experiment data is in `renderer-full-swapdom.json`; methodology
and results are in `renderer-full-swapdom.md`. Earlier benchmark reports remain
historical snapshots, not current size claims.

## Prototype retirement and assertion map

The prototype directory, five prototype test files, three bridge helpers, and
two prototype-only Vitest configs have been removed. No executable code imports
the deleted directory. Useful conclusions remain in the current core guide,
benchmark results, and this record—not in a second renderer implementation.

- Backend-hooks experiment: all 13 assertions already existed verbatim against
  production in `test/core.test.js`; removed only the duplicate prototype suite.
- Full helper experiment: source and built ESM/CJS identity, dynamic API reads,
  list reuse, and owned cleanup already live in `test/core-full.test.js`.
- Standalone HTML experiment: production core/DOM/property tests cover one-time
  functions, strict predicates, fragments, shorthand, events, refs, CSS/class
  handling, property disposers and manual updates. Core/full coverage stays 100%.
- Runtime/compact experiments: `test/source-lifecycle.test.js` now directly checks
  production mixed signals/thunks/promises/observables, late promise resolve and
  reject cancellation, object disposers/idempotent stop, synchronous initial-emission
  buffering and the actual backend exception behavior.
- Obsolete registry-order and api.r routing assertions belonged to abandoned
  experimental APIs, not the adopted is/get/sub contract. Production's single
  child-classification assertion remains in `test/core.test.js`.
- The old experimental runtime caught synchronous subscribe throws and guarded
  raw callback invocations after stop. Production usub never provided those exact
  guarantees: subscribe throws propagate synchronously, and observable sources
  must honor unsubscribe. Tests explicitly preserve this production contract;
  no new normalization layer or silent dependency change was introduced.

## Validation

- Default and production-core suites: **2,543 tests / 68 files each**, 100% in
  statements/branches/functions/lines. The count decreases because 45 prototype
  tests were removed and ten production tests added.
- Default compact swapdom: all **4,225** four-node bounded permutation transitions.
- Built ESM: **1,767 tests**; CJS: **1,432 tests**, including the new source/default tests.
- Installed tarball ESM/CJS/types and source types pass; pack checks full's default
  diff and bare core/lite isolation.
- **Eight** Chromium browser tests pass, including stable focused-input selection,
  reused node order, region boundaries, and default-diff tier isolation.
- All 21 current minified experimental bundles pass focused Chromium checks.
