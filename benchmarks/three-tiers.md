# Current renderer tiers and size checks

There are exactly three renderer variants:

| Variant | Import | Contents |
| --- | --- | --- |
| Core/tiny | `uele/core` or `uele/tiny` | Minimal DOM renderer: h, r, api, add, props, useLive |
| Lite | `uele/lite` | Core + usub/tiny + SVG/MathML |
| Full | `uele` | Core + usub + SVG/MathML + map, f, lazy + compact swapdom |

Core and tiny are two names for the **same** entry and API object. Flow components
are a separate module (`uele/flow`), not another renderer variant. The extra
core-plus-helpers entry has been removed from source, declarations, build outputs
and public exports. Import/require and TypeScript rejection checks enforce this.

## Remeasured complete applications

All four examples now use **only `uele/tiny`**:

| Example | Minified B | Gzip B | Brotli B | Target |
| --- | ---: | ---: | ---: | ---: |
| Hello World | 1855 | **966** | 868 | <1000 B |
| Stateful counter | 2033 | **1051** | 945 | <1400 B |
| Signal counter | 2457 | **1248** | 1131 | <1400 B |
| Signal todo | 2906 | **1473** | 1321 | <1800 B |

The todo uses ulive signals and a cached row node per todo object. It does not
import full's map/For helpers. Add, toggle, delete, empty-list recovery, safe text
rendering and retained-row DOM identity are all browser-tested. Map and For remain
in full/flow and retain their separate source, ESM, CJS and browser stress tests.

Every application measurement includes all app, renderer, signal-library and
integration JavaScript. HTML/transport headers are excluded. Both default gzip
and level 9 pass the limits; Brotli is quality 11. This is a measurement of the
current working-tree build, not an already-published npm release.

Sources, hashes, commands and methodology: [application proof](../examples/size-proof/README.md).

## Library measurements (not application payloads)

| Entry/artifact | Minified B | Gzip B |
| --- | ---: | ---: |
| Core/tiny, all-export bundled ESM | 1870 | 975 |
| Lite, built IIFE | 2581 | 1359 |
| Full, built IIFE | 3666 | 1881 |

Do not compare unlike formats as if they were the same artifact. All original
size limits remain unchanged. The full entry is not claimed to fit the tiny-app
limits above.

## Current validation after the production audit

- Default suite and production-core suite: **2,560 tests each**, 100% statements,
  branches, functions and lines.
- Built ESM: **1,781 tests**; built CJS: **1,446 tests**.
- **14 Chromium tests**, including the exact measured apps and all flow components.
- Installed-package ESM/CJS/types, source types, docs and size gates pass.
- Full's map/For ownership assertions now exercise actual full composition and
  independently built ESM/CJS files; they no longer need the deleted entry.

The [production-readiness review](../docs/PRODUCTION-READINESS.md) records the final clean-install checks, State example and remaining build-tool advisory.

Earlier reports in this folder are historical snapshots and may describe old
experimental entries. They are not the current API or size claims.
