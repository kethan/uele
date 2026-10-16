/**
 * Last line of defence for the jsx transform.
 *
 * Depending on the vite version, a `.jsx` file is compiled to one of three things:
 *
 *   automatic + uele  - `import { jsx } from "uele/jsx-runtime"` (what the
 *                       `/** @jsxImportSource uele *\/` pragma asks for)
 *   automatic + react - `import { jsxDEV } from "react/jsx-dev-runtime"`, which the
 *                       `react/*` aliases in the vitest configs send to uele
 *   classic           - `React.createElement(...)` *with no import at all* (vite 7
 *                       defaults to this and ignores every jsx option we can set)
 *
 * The third case cannot be fixed by an alias, so give it a `React` that is uele.
 * Nothing in this repo imports react; this global only exists so the transform has
 * something to call when it refuses to import anything.
 */
import { h } from 'uele';

/**
 * `React.createElement`, in the two details that matter: `key` is not a prop the
 * dom ever sees (react pulls it out; the classic transform leaves it inside props),
 * and the dev-only `__self` / `__source` markers are dropped the same way.
 */
const createElement = (tag, props, ...children) => {
	const attrs = { ...props };
	delete attrs.key;
	delete attrs.__self;
	delete attrs.__source;
	return h(tag, attrs, ...children);
};

globalThis.React = { createElement, Fragment: h };

export { h };
