# usub 0.11.0 verification

Verified on 2026-10-28 against GitHub revision
`990ec1fef884368c9ecfc7eec0e8b285d7475d2f` and the published npm 0.11.0 tarball.
The package appeared on npm during this investigation. All twelve checked runtime
artifacts (ESM, CJS, minified IIFE and UMD for default/lite/tiny) match the locally
built revision after newline normalization; minified outputs match as well.

## Retention fixes

- Default's observable disposer now uses an isolated module-level `off` helper.
- Shared cleanup state is popped on completion/disposal.
- Promise cancellation uses isolated state in default, lite and tiny.
- NOINLINE annotations protect the helper scopes during minification.

Independent reproductions found:

| Check | ESM | Minified UMD |
| --- | --- | --- |
| Default observable: explicit unsubscribe, live source | 0/20 retained | 0/20 retained |
| Default observable: dropped handle, live source | 0/20 retained | 0/20 retained |
| Default/lite/tiny resolved promises: explicit cancellation, live source | 0/20 each | 0/20 each |
| Default/lite/tiny resolved promises: dropped handle, live source | 0/20 each | 0/20 each |

## Test results

Against a locally packed build of the revision above:

- Upstream usub `npm test`: **97 tests passed**, including bundle and re-minification
  retention regression tests. This is the actual reported test count, not a claim
  that the test runner reported 1,000+ tests.
- uele `npm run test:coverage`: **2,353 tests passed**, all configured coverage
  metrics **100%**; no assertions or thresholds changed.
- uele ESM and CJS bundle suites passed (CJS: **1,393 tests**).
- Vue RC compatibility: **754 tests passed**.
- Build and TypeScript checks passed.

After installing the published npm 0.11.0 package temporarily, uele's **16 memory
tests also passed**. Real-browser and packaged-consumer checks were not run for this
verification.

## Size blocker

The size gate does not completely pass:

| Bundle | Raw bytes / limit | Gzip bytes / limit |
| --- | ---: | ---: |
| Main minified | 3862 / 3950 | 1966 / 2000 |
| Main ESM | 9934 / 10100 | 3582 / 3600 |
| Lite minified | **2607 / 2600** | 1367 / 1400 |

The lite raw-size limit is exceeded by **7 bytes**. This is not a functional test
failure, but must be addressed before calling an upgrade fully green. No budgets
were raised and no core-source edits were made.

## Dependency state

Testing used temporary installs without modifying package.json or the lockfile.
After verification, npm ci restored the declared **0.10.0** dependency. A permanent
0.11.0 upgrade has not been made as part of this check. The earlier 0.10.0
investigation/patch remains historical documentation, not an applied workaround.


## Size blocker resolved

The permanent dependency is now `usub@^0.11.0`, locked to 0.11.0. Two equivalent
lite-only simplifications resolve the earlier 7-byte raw-size overage:

- `new Map([])` → `new Map()` (an empty map in either case).
- Remove `isFalsey(x)` from `isNode`: `!isObject(x)` already accepts booleans,
  null and undefined, preserving the existing dispatch behavior.

With the published dependency and unchanged minifier settings, lite is **2595 raw /
1362 gzip bytes**, saving **12 raw / 5 gzip bytes** from the unoptimized 0.11.0 build.
The existing **2600 / 1400** limits are unchanged. The main renderer is unchanged.
A trial extra minification pass produced no savings and was reverted.

`test/lite-size.test.js` adds 18 equivalence/extension checks. The actual minified
uele UMD observable-retention reproduction still reports 0/20 retained in all three
scenarios. The dependency upgrade uses the published package, not the historical
experimental patch. This section supersedes the earlier temporary-install state.

Final validation after the lite simplifications and permanent npm upgrade:

- Coverage run: **2,371 tests passed** across 56 files; statements, branches,
  functions and lines remain **100%** under the unchanged configuration.
- ESM/CJS bundle suites passed; packaged-consumer smoke tests passed.
- Build, type checks and all existing size limits passed.
- Browser tests were not rerun for this size optimization.
