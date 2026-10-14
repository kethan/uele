# UELe repository audit and test strategy

Audit date: 2026-10-14. Original revision: `c5ec3c4`.

## Follow-up: signal/diff matrix and memory validation

The newer [interoperability and memory report](INTEROPERABILITY_AND_MEMORY.md)
supersedes the counts, lifecycle details, byte budgets and memory-validation limits
below. It adds six signal libraries, six diff engines, forced-GC checks, a Chromium
memory soak and fixes for demonstrated retained DOM. The sections below preserve
the initial hardening baseline for comparison.

## Initial hardening results

`npm run test:all` passes locally on Node 22.22.3 / Linux x64:

- **340 runtime tests**, including shared full/lite contracts, real-time applications,
  deep keyed lists, lifecycle tests, and automatic JSX.
- **100% statements, branches, functions and lines** for executable runtime source.
  Thresholds are enforced **per file**, not just as an aggregate.
- **20 package checks**: install the actual npm tarball; load every ESM/CommonJS
  entry; evaluate IIFE/UMD bundles; compile strict TypeScript consumers in both
  automatic JSX modes; assert invalid API usage is rejected.
- **6 real Chromium checks**, including user typing/clicking, focus/selection,
  shared JSX configuration, nested list reorders, native validity/CSS/SVG, and
  5,000-row mount/reverse/removal with subscription teardown.
- **4 minified/gzip size gates**; no runtime dependency was added.
- `npm audit`: **0 known vulnerabilities** at audit time, including dev dependencies.
- Randomized runtime test ordering also passed (seed `20261014`, 336 tests before
  the final four JSX control-flow regressions were added).

The development JSX entry is a pure re-export, with **zero instrumentable
statements**. V8 displays it as 0%; it does not lower the aggregate and its exports
are exercised by source, package, and TypeScript tests. No executable runtime
branches are excluded from coverage. Generated bundles, declarations, build scripts,
third-party code and tests are outside the runtime coverage denominator; package,
compiler, browser and size checks validate those separately.

**100% coverage is not proof of all possible behavior, nor a guarantee of zero
bugs.** Chromium was executed locally; Firefox, WebKit, mobile devices, and long
production soak/heap tests were not. The CI matrix is configured for Node 22/24;
only Node 22 was executed in this workspace.

## Repository map

| Area | Role | Validation |
|---|---|---|
| `src/index.js` | Full DOM runtime, usub adapter exports, control flow, keyed lists | All runtime suites; Chromium; package checks |
| `lite/index.js` | Small DOM runtime using `usub/tiny` | Shared runtime and lifecycle suites; Chromium; package checks |
| `jsx-runtime/index.ts` | Automatic JSX adapter, classic aliases, fragments | JSX contracts; compiled consumer; shared-adapter browser check |
| `jsx-dev-runtime/index.ts` | Re-exports the same adapter | Development JSX contracts and package/compiler checks |
| `*/index.d.ts` | Public declarations | Strict installed-consumer compile, including negative type assertions |
| `rollup.config.js` | Four formats per entry, declaration copies, clean builds | Actual packaged files and all output formats |
| `package.json` / lockfile | Distribution surface, tools, scripts, dependencies | Tarball integrity, installs, audit, clean install |
| `test/` | Unit, integration, stress, package, types, browser tests | `npm run test:all` |
| `.github/workflows/node.js.yml` | Node 22/24 CI and coverage artifacts | Configured full release gate; hosted run still required |
| `README.md` | User-facing contracts/examples | Executable counter, form, control-flow, list and async scenarios |

## Baseline findings

The original 131 tests passed and Rollup built successfully. Coverage across the
full runtime, lite runtime, and both JSX entry points was only **44.23% statements
and lines** under the original Vitest/V8 toolchain. The full runtime alone had
70.12% statement/line coverage; lite and JSX had none. Different coverage-provider
versions count statements differently, so the baseline is not a like-for-like
performance metric.

Missing coverage included `f`, most conditional/dynamic/lazy helpers, external diff
hooks, lite behavior, automatic JSX calling conventions, published package
consumption, declaration compilation, and deeply nested fragment/list ownership.
Some tests had weak error assertions or asynchronous work escaping the test.
The updated DOM suites isolate mutable adapters/props, dispose effects at teardown,
and await the formerly unawaited custom-prop assertion.

## Fixes made

### Rendering and adapters

- Preserve shorthand `0`, empty strings and `false` instead of dropping them.
- Treat null as a non-object so null style/class values do not crash.
- Use local namespace state; nested rendering can no longer corrupt the parent's
  property-versus-attribute strategy. Lite now follows the same strategy.
- Read **current** boundary contents rather than cached node arrays, so nested
  updates and custom diff integrations do not restore stale content or leave orphans.
- Ignore missing, separated, or reversed boundaries safely.
- Use a compact insertion loop instead of deleting and rebuilding the entire range;
  unchanged input nodes preserve focus/selection on sibling insertion.
- Make synchronous lazy-loader errors use the same fallback path as rejected loaders.

### `For` / `map`

- Normalize nullish lists to empty lists; preserve falsy renderer results.
- Normalize each row once, bounded by markers. Reorders do not re-subscribe reactive
  render functions or consume a DocumentFragment twice.
- Materialize the row's **current DOM span**, preserving arbitrary nested live content.
- Cache only currently present keys, not the entire history of the list.
- Dispose current row subscriptions when their keys leave the list; also dispose
  a live fallback when transitioning to rows.
- Reject duplicate keys before mutating the displayed list, rather than losing rows.
- Remove an unused, private diff implementation and commented-out experiments;
  do not suppress their coverage or expose them just to get a coverage percentage.

### JSX, publishing and types

- Extract `props.children`, normalize its array shape and ignore compiler metadata.
  Multiple `Switch` children are now passed as distinct children, not one truthy array.
- Use the **same full runtime** for JSX, including its configured reactive adapter;
  built JSX entries depend on `uele` rather than embedding a second private runtime.
- Publish JSX entry files; expose the lite subpath; point declarations at real files.
- Emit CommonJS as `.cjs`; place the fallback export condition after `require`.
- Align declarations with runtime exports, add missing APIs and JSX namespaces,
  fix lazy/map/ref-related signatures, and remove the non-existent `Suspense` export.
- Clean output folders on build to avoid shipping stale artifacts.
- Replace the copy plugin with native filesystem calls and update vulnerable build/test tools.

## Deep-list and stress matrix

`test/for-stress.test.js` runs **13 cases in each of two modes**: native insertion and
an actual external DOM reconciler wired through `api.diff`.

- Fragment rows containing nested lists; inner changes followed by outer reversal.
- Reactive render functions subscribed once across 50 reorders.
- Repeated empty-list emissions with a reactive fallback.
- Conditional fragments expanded before reordering.
- Promises resolving both before and after a reorder.
- Multi-child DocumentFragment rows.
- Removed keys recreated with fresh data on re-addition.
- Initial/update duplicate-key errors and recovery without corrupting the old DOM.
- Duplicate values made distinct by an index key.
- Numeric, string, NaN, symbol and object-identity keys.
- Two lists sharing a source without stealing each other's nodes.
- **40 levels** of fragment-list nesting, deepest-level removal/recreation followed
  by ancestor updates.
- A **4 × 4 × 3 branching tree**, churned and reversed at multiple levels for 30 rounds.

Additional suites test two seeded **250-update** list-churn scenarios, **1,000-item**
reversals, **1,000 removed row subscriptions**, and **5,000 rows in Chromium**.
Assertions check node identity, output/order, renderer/subscriber counts and cleanup;
wall-clock measurements are diagnostics, not flaky CI timing thresholds.

## Realistic usage and async sources

- Independent counters and hundreds of real click dispatches.
- Validated input → submit/preventDefault → keyed todo toggle/delete → fallback.
- Timed dashboard ticks, batching, conditional status and timer cancellation.
- Async request loading/success/failure/retry transitions.
- Promise mounting, cancellation, rejection, lazy async components and stale results.
- Observable functions/object disposers, `Symbol.observable`, completion and errors.
- Async iterator successive replacement, cancellation and iterator closing.
- Reactive attributes/styles/classes, ref/custom props, unknown attributes,
  falsy values, escaped text, invalid names and native conversion errors.

## Size budget

Sizes below are the built IIFE files, in bytes, with default Node gzip compression.
The full/lite bundles include their `usub` implementation. JSX is an **adapter** and
requires the full runtime; its size must not be presented as a standalone library size.

| Entry | Minified | Gzip | CI ceiling (min / gzip) |
|---|---:|---:|---:|
| Full | 4,017 | 2,011 | 4,300 / 2,200 |
| Lite | 2,727 | 1,405 | 2,900 / 1,550 |
| JSX | 418 | 223 | 450 / 250 |
| Development JSX | 418 | 223 | 450 / 250 |

Baseline full IIFE was 3,327 / 1,668 bytes. The explicit increase pays for current
nested-range handling, bounded keyed caches and subscription disposal. JSX became
much smaller by reusing the full runtime. Browser binaries and test tools are
**dev-only**, excluded from the published tarball and all runtime bundles.

## Production contracts and remaining boundaries

1. **Lifecycle is explicit.** Call `dispose(root)` before permanently removing a
   manually mounted subtree. For/map dispose evicted rows and their current
   descendants. `Node.remove()`, `If` hiding, and arbitrary `useLive` replacement
   are not universal unmount signals: nodes may be reused, so they must not silently
   destroy reusable subscriptions. Explicitly dispose discarded nodes when you own
   their lifetime. `dispose` does not remove DOM, undo arbitrary event handlers, or
   discover externally detached nodes. Custom props can return their own cleanup.
   Do not depend on nondeterministic `FinalizationRegistry` callbacks for correctness.
2. **Stable keys identify stable row instances.** Indices are creation-time values;
   changing an object under an existing key does not rerun its renderer. Use reactive
   fields for in-place updates, or change the key. Removed/re-added keys are fresh
   instances. Supply unique keys and dense arrays; this is not a virtualized list.
3. **Mount live regions before updating them.** Pre-mount setter state advances but
   DOM changes are not buffered. Do not manually reorder/remove boundary markers.
4. **Lite is intentionally narrower.** It supports functions/configured signals and
   promises, not the full runtime's observable or async-iterator integrations.
   `api` configuration is global to a runtime instance; configure it before mounting.
5. **DOM and namespaces.** This is a browser DOM library, not SSR/hydration. Namespace
   selection remains a tag-name heuristic, not a context-aware SVG/MathML parser;
   ambiguous names/custom elements and cross-realm Nodes need additional design/testing.
6. **Rendering is not sanitization.** Text children are escaped by DOM APIs. Explicit
   `innerHTML`, URL attributes, inline events, and custom props remain caller-controlled
   security-sensitive operations. Never put untrusted HTML directly in these properties.
7. **Error/lifetime ownership.** Renderer, ref, key, diff and custom-prop errors propagate.
   Application-created resources and partial work before a throwing renderer remain
   the application's responsibility. External diff hooks must preserve boundary nodes.
8. **Compatibility validation is bounded.** No Firefox/WebKit/mobile matrix or
   multi-hour heap soak was executed. The browser fixture is isolated trusted code,
   using a no-sandbox headless binary—not a production browser service. Garbage
   collection, real network/server failures, accessibility and application-level
   security require separate production validation.

These boundaries mean this change is a substantial, measured production-hardening
pass—not an assertion that every conceivable issue has been eliminated.

## Commands

Development tools require Node **22.17+** (22.x) or **24+**. The packaged runtime
itself was not given a new Node-engine requirement.

```sh
npm ci
npm test                 # deterministic runtime suite, no watch
npm run test:watch       # interactive development
npm run test:coverage    # 100% per-file gate; coverage/index.html
npm run test:package     # clean build + installed tarball + strict type consumers
npm run test:browser     # clean build + actual Chromium (Linux x64 default)
npm run test:size        # clean build + minified/gzip budgets
npm run test:all         # all of the above without redundant browser/size builds
npm audit
```

`CHROMIUM_PATH=/path/to/chromium npm run test:browser` can use a local browser.
The Linux CI fixture uses the npm-distributed Chromium binary and its bundled
libraries, avoiding runtime browser downloads. Package tests pack the already
installed `usub` dependency locally and install both tarballs offline. Runtime/async
application tests do not call external APIs.
