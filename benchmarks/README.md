# Renderer measurements

## Current

- [Three renderer tiers and remeasured applications](three-tiers.md)
- [Runnable app sources, strict size limits and reproduction](../examples/size-proof/README.md)
- [Map, For and every flow component: stress-test coverage](../docs/FLOW-TESTING.md)
- [Renderer source layout](../core/README.md)

Run `npm run build && npm run size:apps` for complete application sizes, or
`npm run size && npm run size:core` for the library size gates. Generated app
bundles remain ignored; small JSON reports retain tool versions and bundle hashes.

## Historical experiments

These record earlier layouts and should not be read as current exports or sizes:

- [Initial rewrite comparison](renderer-results.md)
- [Diff-hook normalization](diff-normalization.md)
- [Post-normalization measurements](renderer-after-diff-normalization.md)
- [Default swapdom and prototype retirement](production-cutover.md)
- [Swapdom-era renderer comparison](renderer-full-swapdom.md)

The non-invasive `scripts/measure-renderer.mjs` harness is still available for
implementation experiments. Its guarded transforms build isolated variants;
they never edit production source. Runtime numbers are exploratory connected-DOM
microbenchmarks, not comparative application-performance claims.
