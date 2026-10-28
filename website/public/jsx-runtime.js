/**
 * Automatic JSX runtime for direct ESM usage (import maps, CDN fiddles).
 *
 * Babel's automatic runtime imports `{ jsx, jsxs, Fragment }` from
 * "uele/jsx-runtime". The package's real runtime (jsx-runtime/index.ts) is a
 * thin wrapper over `h`, reproduced here against the locally bundled uele.
 *
 * Note: the in-browser playground inlines this same wrapper as RUNTIME_FOOTER
 * in src/lib/playground.js — keep the two in sync when changing it.
 */
import { h } from "./uele.js";

// children arrive inside props; key is dropped (uele keys lists via For/map)
const jsx = (tag, props = {}) => {
  const { children, key, ...attrs } = props || {};
  return h(
    tag,
    attrs,
    ...(children == null ? [] : Array.isArray(children) ? children : [children])
  );
};

export { jsx, jsx as jsxs, jsx as jsxDev, jsx as jsxDEV, h as Fragment, h as createElement, h };
export * from "./uele.js";
