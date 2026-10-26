// Single source of truth for the modules a playground iframe can import.
// Paths are fetched from the site origin and inlined as data: URL modules,
// so this map also documents every package the examples rely on.
export const VENDOR_MODULES = {
  // core gets the automatic JSX-runtime footer appended (see playground.js)
  "uele": "/uele.js",
  "uele/jsx-runtime": "/uele.js",
  // uele subpaths (bare imports inside are resolved via this same map)
  "uele/reactive": "/vendor/reactive.js",
  "uele/hooks": "/vendor/hooks.js",
  "uele/adapters/preact": "/vendor/adapter-preact.js",
  "uele/adapters/ulive": "/vendor/adapter-ulive.js",
  "uele/diffs/rebuild": "/vendor/diff-rebuild.js",
  "uele/diffs/udomdiff": "/vendor/diff-udomdiff.js",
  // npm packages, bundled whole with no bare imports
  "@preact/signals-core": "/vendor/signals-core.js",
  ulive: "/vendor/ulive.js",
  udomdiff: "/vendor/udomdiff.js",
};

// specifiers served by the same core data URL (JSX runtime re-exports h/jsx)
export const CORE_SPECS = new Set(["uele", "uele/jsx-runtime"]);
