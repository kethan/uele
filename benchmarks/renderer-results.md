# Renderer experiment results

> Historical measurements. The current three-tier layout and remeasured apps
> are documented in [three-tiers.md](three-tiers.md).


Run `UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs` (omit the environment variable when system libraries are installed).

All exports, bundled ESM for every tier. Terser module/mangle, safe compression, three passes unless specified. Gzip level 9, Brotli quality 11. These uniform ESM measurements are not the production IIFE size-gate measurements.

Each isolated, minified bundle passed Chromium checks for nested children, properties, events, classes/styles, namespaces (configured tiers), synchronous source updates, static r flags, subscription teardown, and sibling-mutating cleanup. This focused check is not a replacement for the full conformance suite.

Runtime: connected Chromium DOM, 300 warm-up operations, seven rounds of 1,200 operations; median microseconds/operation. Create replaces a nested element tree with attributes; replace uses renderer-owned live replacement of a twelve-child tree. No forced layout, so these measure scripting/DOM work, not painting. Sequential microbenchmarks are noisy; do not interpret small differences as wins. Ranges are in the JSON results.

| Variant | Tier | Minified B | Gzip B | Brotli B | Create µs | Replace µs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| baseline | core | 1869 | 977 | 888 | 8.67 | 37.75 |
| baseline | full | 3377 | 1756 | 1622 | 8.83 | 40.33 |
| baseline | lite | 2560 | 1365 | 1248 | 8.58 | 41.92 |
| passes-1 | core | 1869 | 977 | 888 | 8.58 | 39.08 |
| passes-1 | full | 3377 | 1756 | 1622 | 8.00 | 40.83 |
| passes-1 | lite | 2560 | 1365 | 1248 | 8.17 | 38.83 |
| passes-5 | core | 1869 | 977 | 888 | 7.83 | 35.58 |
| passes-5 | full | 3377 | 1756 | 1622 | 8.00 | 38.92 |
| passes-5 | lite | 2560 | 1365 | 1248 | 7.83 | 40.25 |
| startsWith | core | 1874 | 981 | 891 | 7.67 | 38.92 |
| startsWith | full | 3382 | 1762 | 1632 | 7.83 | 40.25 |
| startsWith | lite | 2565 | 1370 | 1254 | 8.00 | 39.75 |
| attrs-for-of | core | 1867 | 979 | 894 | 7.33 | 36.08 |
| attrs-for-of | full | 3375 | 1760 | 1626 | 8.17 | 40.92 |
| attrs-for-of | lite | 2558 | 1365 | 1255 | 7.92 | 40.50 |
| recursive-add | core | 1937 | 993 | 905 | 7.08 | 31.25 |
| recursive-add | full | 3445 | 1774 | 1638 | 7.83 | 35.33 |
| recursive-add | lite | 2628 | 1381 | 1262 | 7.42 | 36.50 |
| api-r | core | 1843 | 966 | 875 | 8.50 | 38.83 |
| api-r | full | 3423 | 1779 | 1644 | 8.92 | 43.33 |
| api-r | lite | 2606 | 1384 | 1271 | 8.17 | 43.08 |

The api-r variant retains function evaluation and static false flags, keeps the exported forwarding r, and installs reactive dispatch in full/lite. Bare core now needs an additional hook for reactive properties; adopting this would change the configuration contract. Recursive add preserves scalar toNode results (not iterable spreading). Unsafe live-childNodes teardown and weakened marker checks are intentionally excluded.

Production source is unchanged by this harness. Variant transforms fail loudly if their expected source patterns change.
