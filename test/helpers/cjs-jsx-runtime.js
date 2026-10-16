// CJS bundle runs: the jsx factories bound to the shared shim instance. (The
// built jsx-runtime files call `require('uele')`, which vitest loads in a second
// module cache - a harness artifact; real Node unifies it and scripts/pack-smoke
// asserts identity on the installed package. The ESM bundle run exercises the
// built runtime files themselves.)
import { h, api } from './cjs-ele.js';
export { api, h };
export const Fragment = h;
export const createElement = h;

export const jsx = (tag, props = {}) => {
	const { children, key, ...attrs } = props || {};
	return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};
export const jsxs = jsx;
export const jsxDev = jsx;
export const jsxDEV = jsx;
