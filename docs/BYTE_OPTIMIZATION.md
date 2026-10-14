# Byte reduction without dropping runtime contracts

Measured against the fully tested scoped-ownership/subscriber implementation,
**not** against the earlier implementation with known retention bugs.
Measurements use Node 22.22.3, the locked dependencies, and `gzipSync` defaults.

## What changed

1. **Minify ESM and CommonJS too.** These are the default package entry points;
   previously only the CDN IIFE/UMD builds were minified. Named exports, import/
   require paths, mutable adapter properties and browser globals stay unchanged.
   Readable implementation files remain in `src/` and `lite/` in the repository.
2. **Separate full-only protocols.** `src/protocols.js` contains observable/observ
   selection and async iteration. Lite no longer ships those inactive branches.
   Both runtimes still use **one shared subscriber and ownership implementation**;
   no second cleanup backend was introduced.
3. **Remove small DOM-code duplication.** Share style/class object iteration,
   factor the namespace URI prefix, remove the redundant `For` key default (the
   shared `map` default still supplies identity), and use `new Map()`.
4. **Measure safe compression settings.** Three passes with limited inlining and
   disabled sequence merging gave smaller gzip runtime bundles. JSX keeps its
   smaller default compression profile. No property mangling, unsafe transforms,
   boolean-to-number substitutions or browser-global renaming.
5. **Protect the results.** Size gates now cover all 16 shipped JavaScript files.
   Full/lite IIFE ceilings were reduced, not relaxed. The existing runtime tests
   also run unchanged against the built ESM and CommonJS modules in `test:all`.

## Sizes

All sizes are bytes. Each JSX row applies separately to both JSX entry points.

| Build | Before raw | After raw | Before gzip | After gzip | Gzip reduction |
|---|---:|---:|---:|---:|---:|
| Full ESM | 12,427 | 5,030 | 3,926 | 2,411 | 38.6% |
| Full CommonJS | 12,693 | 5,110 | 3,985 | 2,404 | 39.7% |
| Full IIFE | 5,023 | 5,017 | 2,389 | 2,390 | +1 byte |
| Full UMD | 5,214 | 5,208 | 2,469 | 2,471 | +2 bytes |
| Lite ESM | 9,305 | 3,407 | 3,045 | 1,703 | 44.1% |
| Lite CommonJS | 9,454 | 3,454 | 3,091 | 1,712 | 44.6% |
| Lite IIFE | 3,754 | 3,415 | 1,847 | 1,698 | 8.1% |
| Lite UMD | 3,945 | 3,606 | 1,923 | 1,776 | 7.6% |
| JSX ESM | 404 | 227 | 255 | 170 | 33.3% |
| JSX CommonJS | 720 | 451 | 326 | 230 | 29.4% |
| JSX IIFE | 418 | 418 | 223 | 223 | unchanged |
| JSX UMD | 634 | 634 | 320 | 320 | unchanged |

The large ESM/CommonJS improvement is **distribution minification**, not a claim
that an application already minifying/tree-shaking its dependencies gets another
39–45% reduction. Full IIFE was already compact and is effectively unchanged;
Lite benefits from excluding full-only handlers. Compression algorithms also
trade off differently: default Node Brotli measured full IIFE at 2,203 → 2,211
bytes (+8), while Lite IIFE fell from 1,694 → 1,563 bytes.

Current IIFE gates are full **5,100 raw / 2,450 gzip**, Lite **3,500 / 1,750**,
and each JSX adapter **450 / 250**. Every format's exact ceiling is in
`scripts/check-size.mjs`.

## Lifetime guard discovered during optimization

Passing an async source directly into the extracted iterator handler initially
kept an extra reference alive during a pending `next()`, even after cancellation.
A focused WeakRef probe failed for that version and passed against the saved
pre-optimization subscriber. The handler now reads through the subscription's
clearable source slot instead of retaining a copy. Protocol discovery also stays
synchronous: a throwing iterator getter must propagate to the caller and run
cleanup, while a later acquisition error uses the error callback. Two additional
runtime regressions protect that distinction.

A permanent forced-GC regression keeps the pending iterator alive externally,
requires its independent cancelled source wrapper to collect, then settles the
iterator and checks that no late value is emitted and `return()` runs once.
The extra bytes needed to preserve this behavior were kept.

## Validation

Final `npm run test:all` completed successfully:

- **971** source runtime tests (all previous 969 plus two protocol regressions); **100%** executable-source
  statements, branches, functions and lines, including the extracted helpers.
- The **same 971 tests** against ESM and again against CommonJS: **1,942** additional
  passing executions, with no assertions removed or weakened.
- **20** installed-package/TypeScript tests, including IIFE/UMD public globals.
- **62** forced-GC tests (the previous 61 plus the pending-iterator regression).
- **13** Chromium tests, including the 36 signal/diff-pair soak and 108,000 row
  creations. Maximum retained DOM delta **0**; maximum post-GC heap delta
  **39,668 bytes** in this run. Heap measurements vary between runs.
- All **16** minified/gzip file budgets pass.

Standalone commands: `npm run test:bundles`, `npm run test:memory`, and
`npm run test:size`. `test:bundles` builds before testing. Source coverage remains
its own mandatory gate; minified-code execution is not counted as source coverage.

## Deliberate boundaries

No cleanup guard, exception handling, protocol, keyed-row ownership rule or
existing test was removed for size. Explicit `dispose(root)` and reusable prebuilt
DOM semantics are unchanged. This pass does **not** restore `usub.sub`'s source-GC
finalization safety net; the earlier local-subscriber trade-off remains. Repairing
and restoring that backend should be a separate change validated against the same
retention probes. Bounded GC/browser tests are regression evidence, not proof that
all applications are leak-free.
