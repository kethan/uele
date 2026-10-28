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
import { h, add, useLive } from 'uele';
import { onTeardown } from '../props/internal.js';
import { signal, read, write, isCell, canEffect } from 'uele/reactive';

const ghost = () => h('div', { style: { display: 'contents' } });
/** jsx hands a component its children as the varargs array: a single child arrives as `[child]` */
const one = (children) => (Array.isArray(children) ? children[0] : children);
const call = (children, value) => (typeof one(children) === 'function' ? one(children)(value) : one(children));
/**
 * A function child is a thunk uele re-runs and disposes — but only a preset with
 * an effect runner can track one. On a subscribe-only library (rxjs, nanostores,
 * `@tanstack/store`) run it once instead, so these components still work there.
 */
const thunk = (fn) => (canEffect() ? fn : (fn(), null));

/**
 * Renders `children` once `for` resolves. `for` accepts a promise, a thunk
 * returning one (re-run when the cells it reads change), or a cell holding
 * either. Rejections render `catch` (or nothing). A late response never
 * overwrites a newer one.
 */
export const Await = ({ for: source, children, fallback = '', catch: onError } = {}) => {
	const view = signal(fallback);
	let latest = 0;
	// a function child is a thunk owned by uele: re-run on change, disposed with the node
	const load = () => {
		const token = ++latest;
		let value;
		try {
			value = typeof source === 'function' ? source() : isCell(source) ? read(source) : source;
		} catch (error) {
			write(view, onError ? onError(error) : '');
			return null;
		}
		if (value && typeof value.then === 'function')
			value.then(
				(resolved) => token === latest && write(view, call(children, resolved)),
				(error) => token === latest && write(view, onError ? onError(error) : '')
			);
		else write(view, call(children, value));
		return null;
	};
	// the view is attached first: `load` runs while it is added, and a write is
	// only applied once the live region's markers have a parent
	const host = h('div', { style: { display: 'contents' } }, view);
	host.append(...add(thunk(load)), onTeardown(() => { latest++; }));
	return host;
};

/**
 * `<Suspense fallback={…}>{async () => …}</Suspense>` — shows `fallback` until
 * the async children resolve. `catch` renders when they reject.
 */
export const Suspense = ({ fallback = '', children, catch: onError } = {}) =>
	Await({ for: () => call(children), fallback, children: (value) => value, catch: onError });

/**
 * Catches anything thrown while rendering `children` — synchronously or from a
 * rejected promise — and renders `fallback` instead; a function fallback
 * receives the error. `onError` is called in both cases.
 */
export const ErrorBoundary = ({ children, fallback = '', onError } = {}) => {
	const render = (error) => (typeof fallback === 'function' ? fallback(error) : fallback);
	const host = ghost();
	let node;
	try {
		node = call(children); // a synchronous throw is caught right here
	} catch (error) {
		onError?.(error);
		host.append(...add(render(error)));
		return host;
	}
	// an async child rejects later: Await catches it and renders the same fallback
	host.append(
		...add(node && typeof node.then === 'function'
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
export const Portal = ({ mount = document.body, children } = {}) => {
	const host = typeof mount === 'string' ? document.querySelector(mount) : mount;
	const [nodes, replace] = useLive(children);
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
export const Title = ({ children } = {}) => {
	const previous = document.title;
	let applied;
	const apply = () => {
		const child = one(children);
		const value = typeof child === 'function' ? child() : isCell(child) ? read(child) : child;
		applied = value == null ? '' : String(value);
		document.title = applied;
		return null;
	};
	return h('div', { style: { display: 'contents' } }, thunk(apply),
		onTeardown(() => { if (document.title === applied) document.title = previous; }));
};
