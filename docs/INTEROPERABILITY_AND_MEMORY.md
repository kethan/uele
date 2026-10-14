# Signal/diff interoperability and memory validation

## Scope and commands

This follow-up tests **six real signal libraries** and **six real diff engines**.
They are dev dependencies only. Adapters are executable in
`test/interop/adapters.js`; do not substitute the adapters with raw effect functions
without checking the ownership/lifecycle differences described below.

```sh
npm run test:interop  # 504 cross-product + 36 diff-plan + 73 cleanup tests
npm run test:memory   # 62 Node/JSDOM tests, --expose-gc is mandatory
npm run test:browser  # 13 Chromium tests, including memory/DOM/listener soak
npm run test:all      # includes these, coverage, package/types and size gates
```

Full runtime suite: **971 tests** (including the original and earlier added tests).
The exhaustive diff tests each contain thousands of asserted transitions rather
than inflating the test count with one test per transition.

## Libraries and adapters

| Signal library | Tested version | Adapter details |
|---|---|---|
| ulive | 1.0.7 | `signal`, `.value`, `effect` |
| @preact/signals-core | 1.14.4 | `Signal` recognition; native `subscribe` when available; effects for functions |
| @vue/reactivity | 3.5.44 | `shallowRef`, `isRef`, `effect` and `stop(runner)` |
| solid-js | 1.9.17 | Explicit **client build**, `createSignal`, independent `createRoot` + `createComputed` |
| alien-signals | 3.2.1 | Callable signals; effects created with temporarily detached active subscriber |
| usignal/sync | 0.10.0, pinned | Independent `Effect` roots, `refresh()` initialization, explicit reverse-edge detachment |

Solid's Node default is an SSR build, not a valid reactive-client test. Solid and
Alien need independent DOM-binding ownership, not automatic disposal when the
currently executing parent computation reruns.

**usignal-specific caveat:** version 0.10.0's raw `stop()` clears the effect's forward
references but leaves it in source reverse-edge sets. Reading an effect's return
value during root creation can also subscribe the parent to that effect. The tested
adapter avoids that read and removes previous/current reverse edges. This uses
version-specific `Effect.r` / `source.c` implementation details; the dependency is
pinned and must be revalidated before upgrading. These results are not a claim that
an unmodified `api.effect = usignal.effect` has identical lifetime behavior.

| Diff engine | Tested version | Integration |
|---|---|---|
| swapdom | 1.2.1 | Direct DOM-array engine with trailing anchor |
| domdiff | 2.2.2 | `{before, compare}` options adapter; normalize CJS default export |
| udomdiff | 1.1.2 | `api.udom` node accessor and fifth-argument trailing anchor |
| fast-array-diff | 1.1.0 | Apply actual `getPatch` insertions/deletions to DOM |
| list-diff2 | 0.1.4 | Apply actual keyed move plan with per-call node IDs |
| @thi.ng/diff | 5.1.129 | Apply `diffArray` linear edit log with **identity** equality |

The last three are sequence/list diff engines with tested DOM adapters, **not**
claimed to be drop-in DOM APIs. All edit decisions come from the named engines;
none are mocks or renamed copies of the runtime's native reconciler.

## Functional coverage

The cross product has **72 configurations**: six libraries × six engines × two
runtimes. Each runs text/attribute/style/class/property bindings, multi-dependency
function computations, independent subscribers, cancellation, 300 bounded region
replacements and async settlement. The full runtime additionally runs keyed `For`,
reactive row survival, three-level fragment-list churn and repeated row eviction
with custom event-listener cleanup. **504 matrix tests** in total.

Every engine/runtime pair tests **all 4,225 transitions between the 65 ordered
subsets of four node identities**: **50,700 asserted transitions**. Nodes include an
input, text, comment and SVG element. Assertions verify exact identities, order and
both surrounding sentinels. Additional cases cover frozen caller arrays and native
select-option identity/selection.

Cleanup checks cover 500 fresh reactive subtree replacements per library/runtime,
prebuilt node reuse, custom cleanup that removes children, throwing cleanup,
listener deregistration, failed renders, and rollback of subscriptions belonging to
earlier new rows when a later keyed row fails.

## Bugs found and fixed

1. **Disposed DOM retained by subscription finalizer holdings.** Initial weak-reference
   tests retained all 120 sampled DOM objects for several libraries despite stopped
   callbacks. The `usub` FinalizationRegistry held effect-disposer closures. Callback
   count tests alone had missed this. UELe now uses a small explicit subscriber
   implementation sharing `usub`'s `api/get/is`, with no registrations in that registry.
   Cancellation clears source/callback/disposer references and is idempotent.
2. **Detached children from function renders.** Creating a fresh reactive subtree
   on each emission used to leave the previous subtree's effects alive. Scoped
   ownership now disposes bindings *created during that render*, without destroying
   independently created/prebuilt DOM reused by a conditional.
3. **Keyed rows need separate scopes.** Surviving rows must outlive a source-list
   recomputation. Each row has independent ownership; eviction, root disposal and
   partial-render rollback release it, including bindings no longer in the visible DOM.
4. **Cleanup exceptions/mutations skipped work.** DOM disposal snapshots descendants
   before custom cleanup can detach them, attempts all captured stops, then reports
   errors with `AggregateError`. One bad cleanup no longer blocks its siblings.
5. **Termination races.** Synchronous completion before `subscribe()` returns its
   handle, cancellation during emission, late notifications and throwing disposers
   have explicit tests. Errors terminate and clean up once. Normal async completion
   releases the source but does **not** prematurely kill the reactive DOM just rendered;
   that scope lasts until disposal.

Compatibility note: `sub` is no longer a direct re-export of `usub.sub`. Observable
errors are terminal, and cleanup is idempotent on error/completion/cancellation.
`api.any` continues receiving raw nested values, preserving that adapter contract.

## Memory methodology and evidence

### Node / JSDOM: 62 forced-GC tests

- Six libraries × full/lite: dispose 60 two-node roots, retain each source strongly,
  and require **all 120 WeakRefs to clear**.
- Six libraries × six engines: evict 121 rows, keep the list root and sources alive,
  require all removed row WeakRefs to clear, then verify the list still updates.
- Six libraries: replace 150 render-owned subtrees, keep the current one mounted,
  and require all old WeakRefs to clear before unmounting.
- Six libraries: retain cancelled subscription handles while requiring the former
  DOM and signal objects themselves to collect.
- A cancelled async source wrapper must collect while its independent iterator
  remains pending; late settlement must not emit and must close the iterator once.
- A **negative control** deliberately omits disposal. All 10 DOM references must
  remain; after explicit disposal all must clear. Thus the test demonstrates it can
  detect the retention path rather than simply reporting a low heap measurement.

These tests use actual adapters, not the matrix's effect-count ledger. Creation is
isolated in helper function frames; references are weak; each GC is separated by
an event-loop turn to respect WeakRef KeepDuringJob semantics. No FinalizationRegistry
callback timing is used as an assertion. Twenty GC attempts is a bounded test budget,
not a JavaScript specification guarantee.

### Real Chromium

Each signal library gets an independent WeakRef collection test with 100 disposed
nodes and a source kept alive. A second test exercises **all 36 signal/diff pairs**:
three warm-up and twelve measured mount/reverse/remove/unmount cycles per pair,
200 rows per cycle (**108,000 row creations including warm-up**).

After explicit CDP garbage collection, it compares `Memory.getDOMCounters` and
`Performance.getMetrics` while the sources remain alive. Gates:

- No additional event listeners.
- At most 10 additional DOM nodes (allowance for browser bookkeeping).
- Less than 2 MiB retained JS-heap growth after warm-up (a broad regression gate,
  not an exact memory-accounting claim).

Observed final byte-optimization run: **maximum DOM delta 0**, maximum retained heap
increase **39,668 bytes** across the 36 configurations. Exact heap values vary with
JIT/cache state; weak-reference and subscription-ownership assertions are stricter
than the heap threshold.

## Size and operational trade-offs

The scope/subscriber fixes add a few hundred gzip bytes over the earlier runtime
with retention bugs. The subsequent [byte-optimization pass](BYTE_OPTIMIZATION.md)
retains those safeguards and tightens the IIFE gates to:

- Full: **5,100 minified / 2,450 gzip bytes**.
- Lite: **3,500 minified / 1,750 gzip bytes**.
- Each JSX adapter: unchanged **450 / 250 bytes**.

All 16 shipped JavaScript files now have size gates, including the newly minified
ESM/CommonJS entries. `npm run test:bundles` repeats the same 971 runtime tests
against each of those module formats; `test:all` includes this check.

No signal/diff test library or browser fixture is added to production bundles or the
published tarball. `test:all` includes the GC and browser checks, so CI cannot silently
skip them. The Chromium soak adds roughly a minute locally.

## What these results do not prove

This is evidence of no retention in the **tested ownership paths**, not a universal
proof of no leaks in every application, dependency version or browser. Production
code must still call `dispose(root)` when permanently unmounting manual roots, clean
up externally created listeners/timers, and avoid retaining discarded nodes in its
own arrays/closures. Prebuilt nodes temporarily hidden by a conditional are
intentionally reusable, not automatically destroyed. Firefox/WebKit, mobile devices,
unbounded async producers and multi-hour heap soaks remain outside this run.
