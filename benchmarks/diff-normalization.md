# Diff-hook normalization and core plumbing audit

> Historical measurements. The current three-tier layout and remeasured apps
> are documented in [three-tiers.md](three-tiers.md).


## Adopted change

Every renderer calls exactly `api.diff(parent, oldNodes, newNodes, end)`.
The udomdiff adapter supplies its identity/get callback internally and forwards
`end` as the engine's fifth argument. `api.udom` is removed from public types,
core dispatch, diff installers, conformance fixtures and current documentation.
Other installers no longer clear a flag they do not own. The experimental
renderer fixtures also use the uniform hook so their optional parity matrix
continues to run against current tests. Historical experiment tables remain
historical measurements, not updated production-size claims.

The adapter adds a forwarding call only when selected. This shifts its
engine-specific plumbing out of every renderer; it does not claim that every
application including udomdiff gets the entire default-entry saving.

## Production size gates (same artifacts/settings before and after)

| Entry | Before min/gzip B | After min/gzip B | Gzip saved |
| --- | ---: | ---: | ---: |
| Core bundled ESM | 1869 / 977 | 1851 / 967 | 10 B |
| Backend-free core + map/f/lazy ESM | 2296 / 1191 | 2278 / 1180 | 11 B |
| Full IIFE | 3387 / 1748 | 3369 / 1737 | 11 B |
| Lite IIFE | 2580 / 1364 | 2562 / 1353 | 11 B |

For a uniform bundled ESM minified/gzip-9/Brotli-11 comparison:

| Entry | Before | After |
| --- | ---: | ---: |
| Core | 1869 / 977 / 888 | 1851 / 967 / 878 |
| Full | 3377 / 1756 / 1622 | 3359 / 1745 / 1617 |
| Lite | 2560 / 1365 / 1248 | 2542 / 1355 / 1240 |

Full current experiment results (including focused Chromium checks for all 21
bundles) are in `renderer-after-diff-normalization.json` and `.md`. Reproduce with:

```sh
UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs benchmarks/renderer-after-diff-normalization
```

## Other plumbing reviewed — retained deliberately

| Item | Why it is not another obsolete signature flag |
| --- | --- |
| `api.ns` | Optional namespace policy permits SVG/MathML without importing that policy in bare core. |
| `api.diff` | Single optional, normalized replacement hook; the backend-free default needs no diff dependency. |
| `api.engine` | Backend configuration target used by presets/authoring; keeps native signal classification distinct from broad renderer sources. It is installed outside core. |
| `api.is/get/sub` | Source classification, dynamic reads, and subscription lifecycle; these are the agreed renderer contract. |
| Exported `r` and callback live/static flag | Public mixed-value helper, not an engine-specific signature switch. Moving it to api.r worsened full/lite size in the earlier measurements. |
| Error/cleanup forwarding and noop error callbacks | Subscription/error handling and teardown behavior; not dead parameters. |
| Property-handler Map and ref/style/class dispatch | Existing HTML/custom-property behavior. Removing these would remove features rather than redundant plumbing. |
| Owned-node cleanup and marker checks | Preserve disposers, retained nodes, detached-region behavior and sibling-mutating cleanup. |

No additional comparable engine-specific switch was found in the production
renderer. No speculative API removal or weakened behavior was adopted.

## Validation

- Default suite: 2,578 tests, 100% in all four coverage metrics.
- Production core suite: 2,533 tests, 100% in all four metrics.
- Built ESM: 1,757 tests; CJS: 1,422 tests.
- Optional prototype parity matrix: 2,533 tests; standalone fixture: 10 tests.
- Installed package ESM/CJS/TypeScript, source types, docs tests and seven browser tests pass.
- Existing size limits and coverage thresholds unchanged.
