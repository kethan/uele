# Renderer experiment results

> Historical measurements. The current three-tier layout and remeasured apps
> are documented in [three-tiers.md](three-tiers.md).


Run `UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs` (omit the environment variable when system libraries are installed).

All exports, bundled ESM for every tier. Terser module/mangle, safe compression, three passes unless specified. Gzip level 9, Brotli quality 11. These uniform ESM measurements are not the production IIFE size-gate measurements.

Each isolated, minified bundle passed Chromium checks for nested children, properties, events, classes/styles, namespaces (configured tiers), synchronous source updates, static r flags, subscription teardown, and sibling-mutating cleanup. This focused check is not a replacement for the full conformance suite.

Runtime: connected Chromium DOM, 300 warm-up operations, seven rounds of 1,200 operations; median microseconds/operation. Create replaces a nested element tree with attributes; replace uses renderer-owned live replacement of a twelve-child tree. No forced layout, so these measure scripting/DOM work, not painting. Sequential microbenchmarks are noisy; do not interpret small differences as wins. Ranges are in the JSON results.

| Variant | Tier | Minified B | Gzip B | Brotli B | Create µs | Replace µs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| baseline | core | 1851 | 967 | 878 | 9.00 | 38.83 |
| baseline | full | 3359 | 1745 | 1617 | 8.42 | 39.83 |
| baseline | lite | 2542 | 1355 | 1240 | 7.75 | 39.58 |
| passes-1 | core | 1851 | 967 | 878 | 7.58 | 36.17 |
| passes-1 | full | 3359 | 1745 | 1617 | 8.50 | 38.42 |
| passes-1 | lite | 2542 | 1355 | 1240 | 7.75 | 38.75 |
| passes-5 | core | 1851 | 967 | 878 | 7.50 | 34.00 |
| passes-5 | full | 3359 | 1745 | 1617 | 7.67 | 38.75 |
| passes-5 | lite | 2542 | 1355 | 1240 | 7.67 | 40.25 |
| startsWith | core | 1856 | 971 | 881 | 7.25 | 35.50 |
| startsWith | full | 3364 | 1751 | 1625 | 7.83 | 38.00 |
| startsWith | lite | 2547 | 1360 | 1247 | 7.58 | 37.67 |
| attrs-for-of | core | 1849 | 969 | 882 | 7.17 | 34.67 |
| attrs-for-of | full | 3357 | 1749 | 1620 | 7.67 | 38.58 |
| attrs-for-of | lite | 2540 | 1355 | 1242 | 7.67 | 38.75 |
| recursive-add | core | 1919 | 983 | 890 | 6.67 | 29.83 |
| recursive-add | full | 3427 | 1762 | 1624 | 7.08 | 32.92 |
| recursive-add | lite | 2610 | 1371 | 1255 | 7.08 | 34.92 |
| api-r | core | 1825 | 957 | 866 | 7.83 | 35.58 |
| api-r | full | 3405 | 1768 | 1635 | 8.08 | 39.67 |
| api-r | lite | 2588 | 1375 | 1255 | 7.58 | 38.67 |

The api-r variant retains function evaluation and static false flags, keeps the exported forwarding r, and installs reactive dispatch in full/lite. Bare core now needs an additional hook for reactive properties; adopting this would change the configuration contract. Recursive add preserves scalar toNode results (not iterable spreading). Unsafe live-childNodes teardown and weakened marker checks are intentionally excluded.

Production source is unchanged by this harness. Variant transforms fail loudly if their expected source patterns change.
