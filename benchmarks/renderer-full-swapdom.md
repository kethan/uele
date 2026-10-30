# Renderer experiment results

> Historical measurements. The current three-tier layout and remeasured apps
> are documented in [three-tiers.md](three-tiers.md).


Run `UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs` (omit the environment variable when system libraries are installed).

All exports, bundled ESM for every tier. Terser module/mangle, safe compression, three passes unless specified. Gzip level 9, Brotli quality 11. These uniform ESM measurements are not the production IIFE size-gate measurements.

Each isolated, minified bundle passed Chromium checks for nested children, properties, events, classes/styles, namespaces (configured tiers), synchronous source updates, static r flags, subscription teardown, and sibling-mutating cleanup. This focused check is not a replacement for the full conformance suite.

Runtime: connected Chromium DOM, 300 warm-up operations, seven rounds of 1,200 operations; median microseconds/operation. Create replaces a nested element tree with attributes; replace uses renderer-owned live replacement of a twelve-child tree. No forced layout, so these measure scripting/DOM work, not painting. Sequential microbenchmarks are noisy; do not interpret small differences as wins. Ranges are in the JSON results.

| Variant | Tier | Minified B | Gzip B | Brotli B | Create µs | Replace µs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| baseline | core | 1870 | 975 | 879 | 9.00 | 37.67 |
| baseline | full | 3662 | 1891 | 1747 | 8.58 | 42.67 |
| baseline | lite | 2561 | 1362 | 1241 | 8.17 | 40.42 |
| passes-1 | core | 1870 | 975 | 879 | 7.50 | 35.08 |
| passes-1 | full | 3662 | 1891 | 1747 | 8.17 | 40.67 |
| passes-1 | lite | 2561 | 1362 | 1241 | 7.83 | 39.67 |
| passes-5 | core | 1870 | 975 | 879 | 7.58 | 36.00 |
| passes-5 | full | 3662 | 1891 | 1747 | 7.75 | 42.83 |
| passes-5 | lite | 2561 | 1362 | 1241 | 8.08 | 39.42 |
| startsWith | core | 1875 | 978 | 887 | 7.83 | 35.25 |
| startsWith | full | 3667 | 1896 | 1755 | 7.75 | 40.67 |
| startsWith | lite | 2566 | 1368 | 1249 | 8.00 | 38.92 |
| attrs-for-of | core | 1868 | 977 | 883 | 7.92 | 35.08 |
| attrs-for-of | full | 3660 | 1892 | 1747 | 9.83 | 40.17 |
| attrs-for-of | lite | 2559 | 1363 | 1242 | 8.00 | 39.58 |
| recursive-add | core | 1938 | 990 | 895 | 6.83 | 33.08 |
| recursive-add | full | 3730 | 1905 | 1768 | 8.25 | 38.75 |
| recursive-add | lite | 2629 | 1379 | 1263 | 7.00 | 35.67 |
| api-r | core | 1844 | 964 | 874 | 7.83 | 38.58 |
| api-r | full | 3708 | 1913 | 1770 | 10.67 | 49.00 |
| api-r | lite | 2607 | 1383 | 1260 | 7.67 | 42.50 |

The api-r variant retains function evaluation and static false flags, keeps the exported forwarding r, and installs reactive dispatch in full/lite. Bare core now needs an additional hook for reactive properties; adopting this would change the configuration contract. Recursive add preserves scalar toNode results (not iterable spreading). Unsafe live-childNodes teardown and weakened marker checks are intentionally excluded.

Production source is unchanged by this harness. Variant transforms fail loudly if their expected source patterns change.
