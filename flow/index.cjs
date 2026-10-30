'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');

// Shared internal helpers.
const isFunction = x => typeof x === "function";

// Explicit composition also permits using these controls with another renderer.
const createControlFlow = ({ get, map }) => {
// jsx hands one child over as-is; `If({ children: [fn] })` hands over an array
const first = (c) => (Array.isArray(c) ? c[0] : c);

const If =
    ({ when, children, fallback = "" }) =>
        () => !!get(when) ?
            isFunction(first(children)) ?
                first(children)(get(when)) :
                children :
            fallback;

const Switch = ({ children, fallback = "" }) => () => {
    for (let child of children) {
        let result = isFunction(child) ? child() : child;
        if (result) return result;
    }
    return fallback;
};

const Dynamic = ({ component, children, ...props }) =>
    () =>
        isFunction(component) ?
            component({ ...props, children })
            : component;

const For = ({ each, children, fallback, key = v => v }) => {
    const render = first(children); // `<For each={x}>{row}</For>` or `[row]`
    if (!isFunction(render)) throw new TypeError('For: children must be a render function');
    return map(each, render, fallback, key);
};


return { If, Show: If, Match: If, For, Switch, Dynamic };
};

// A private, inert marker uses the existing prop-disposer protocol. No effect
// runner, public lifecycle API, MutationObserver, or core-size change is needed.
const key = '__uele_cleanup';
const handler = (_node, dispose) => dispose;
const onTeardown = (cleanup) => {
    uele.props.set(key, handler);
    return uele.h('template', { [key]: cleanup });
};

/**
 * Flow components for `uele` — async boundaries, error containment, portals
 * and document title. Written against `uele/reactive`, so they run on whatever
 * signal library the app installed.
 *
 *     import { Suspense, ErrorBoundary, Await, Portal, Title } from "uele/flow";
 *
 *     <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
 *       <Suspense fallback={<p>Loading…</p>}>{async () => (await load()).name}</Suspense>
 *     </ErrorBoundary>
 *
 * Reactive thunks rerun on effect-capable presets; subscribe-only presets run
 * them once. Direct cell bindings still subscribe on either kind. Resource
 * cleanup is owned by renderer markers, independent of engine cleanup hooks.
 */
const { If, Show, Match, For, Switch, Dynamic } = createControlFlow({
    get: value => uele.api.get(value), map: (...args) => uele.map(...args)
});

const ghost = () => uele.h('div', { style: { display: 'contents' } });
/** jsx hands a component its children as the varargs array: a single child arrives as `[child]` */
const one = (children) => (Array.isArray(children) ? children[0] : children);
const call = (children, value) => (typeof one(children) === 'function' ? one(children)(value) : one(children));
/**
 * A function child is a thunk uele re-runs and disposes — but only a preset with
 * an effect runner can track one. On a subscribe-only library (rxjs, nanostores,
 * `@tanstack/store`) run it once instead, so these components still work there.
 */
const thunk = (fn) => (reactive.canEffect() ? fn : (fn(), null));

/**
 * Renders `children` once `for` resolves. `for` accepts a promise, a thunk
 * returning one (re-run when the cells it reads change), or a cell holding
 * either. Rejections render `catch` (or nothing). A late response never
 * overwrites a newer one.
 */
const Await = ({ for: source, children, fallback = '', catch: onError } = {}) => {
	const view = reactive.signal(fallback);
	let latest = 0;
	// a function child is a thunk owned by uele: re-run on change, disposed with the node
	const load = () => {
		const token = ++latest;
		let value;
		try {
			value = typeof source === 'function' ? source() : reactive.isCell(source) ? reactive.read(source) : source;
		} catch (error) {
			reactive.write(view, onError ? onError(error) : '');
			return null;
		}
		if (value && typeof value.then === 'function')
			value.then(
				(resolved) => token === latest && reactive.write(view, call(children, resolved)),
				(error) => token === latest && reactive.write(view, onError ? onError(error) : '')
			);
		else reactive.write(view, call(children, value));
		return null;
	};
	// the view is attached first: `load` runs while it is added, and a write is
	// only applied once the live region's markers have a parent
	const host = uele.h('div', { style: { display: 'contents' } }, view);
	host.append(...uele.add(thunk(load)), onTeardown(() => { latest++; }));
	return host;
};

/**
 * `<Suspense fallback={…}>{async () => …}</Suspense>` — shows `fallback` until
 * the async children resolve. `catch` renders when they reject.
 */
const Suspense = ({ fallback = '', children, catch: onError } = {}) =>
	Await({ for: () => call(children), fallback, children: (value) => value, catch: onError });

/**
 * Catches anything thrown while rendering `children` — synchronously or from a
 * rejected promise — and renders `fallback` instead; a function fallback
 * receives the error. `onError` is called in both cases.
 */
const ErrorBoundary = ({ children, fallback = '', onError } = {}) => {
	const render = (error) => (typeof fallback === 'function' ? fallback(error) : fallback);
	const host = ghost();
	let node;
	try {
		node = call(children); // a synchronous throw is caught right here
	} catch (error) {
		onError?.(error);
		host.append(...uele.add(render(error)));
		return host;
	}
	// an async child rejects later: Await catches it and renders the same fallback
	host.append(
		...uele.add(node && typeof node.then === 'function'
			? Await({ for: node, children: (value) => value, catch: (error) => (onError?.(error), render(error)) })
			: node)
	);
	return host;
};

/**
 * Renders `children` into another part of the document (`document.body` by
 * default) and leaves an inert placeholder where it was used. Signal bindings
 * keep working: they live on the nodes, which are simply moved.
 */
const Portal = ({ mount = document.body, children } = {}) => {
	const host = typeof mount === 'string' ? document.querySelector(mount) : mount;
	const [nodes, replace] = uele.useLive(children);
	(host || document.body).append(...nodes);
	return onTeardown(() => {
		replace([]);
		nodes[0].remove();
		nodes[nodes.length - 1].remove();
	});
};

/**
 * Keeps `document.title` in sync with a string, a cell or a thunk. The
 * previous title is restored when the renderer discards this component.
 */
const Title = ({ children } = {}) => {
	const previous = document.title;
	let applied;
	const apply = () => {
		const child = one(children);
		const value = typeof child === 'function' ? child() : reactive.isCell(child) ? reactive.read(child) : child;
		applied = value == null ? '' : String(value);
		document.title = applied;
		return null;
	};
	return uele.h('div', { style: { display: 'contents' } }, thunk(apply),
		onTeardown(() => { if (document.title === applied) document.title = previous; }));
};

exports.Await = Await;
exports.Dynamic = Dynamic;
exports.ErrorBoundary = ErrorBoundary;
exports.For = For;
exports.If = If;
exports.Match = Match;
exports.Portal = Portal;
exports.Show = Show;
exports.Suspense = Suspense;
exports.Switch = Switch;
exports.Title = Title;
exports.createControlFlow = createControlFlow;
