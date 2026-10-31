/**
 * Routing for `uele`, built on `uele/reactive` — so it works with any
 * signal preset. Two ways to use it:
 *
 *     // 1. the built-in matcher (no dependency)
 *     import { createRouter, useRouter, Link } from "uele/router";
 *     const app = createRouter();
 *     app.get('/', () => <h1>Home</h1>);
 *     app.get('/user/:id', ({ params }) => <h1>{params.id}</h1>);
 *
 *     // 2. uflite/nano (or anything exposing `fetch(Request)`)
 *     import { flite } from 'uflite/nano';
 *     const app = flite();
 *     app.get('/', () => h('h1', null, 'Home'));
 *
 * Both then render the same way: `useRouter(app, initial)` returns a live
 * `{ view, props, navigate, dispose }` object — `view` is a cell you render, and `props` contains the handlers
 * that turn
 * every `<a href="/…">` inside the element into a client-side navigation.
 */
import { h } from 'uele';
import { onTeardown } from '../props/internal.js';
import { signal, write } from 'uele/reactive';

/* ----------------------------------------------------------- path matching */

const compile = (path) => {
	const keys = [];
	const pattern = path
		.replace(/\/$/, '')
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/:([A-Za-z0-9_]+)/g, (_, key) => (keys.push(key), '([^/]+)'))
		.replace(/\*/g, '(.*)');
	return { keys, regex: new RegExp(`^${pattern || ''}/?$`) };
};

const parseQuery = (search) => {
	const query = {};
	for (const [key, value] of new URLSearchParams(search)) {
		if (key in query) query[key] = [].concat(query[key], value);
		else query[key] = value;
	}
	return query;
};

/**
 * A minimal router with the same shape as `uflite/nano`: `get(path, handler)`
 * and `fetch(request)`. Handlers receive `{ params, query, path, url, request }`
 * and may return anything renderable (nodes, strings, a promise of either).
 */
export const createRouter = () => {
	const routes = [];
	const addRoute = (path, handler) => {
		const { keys, regex } = compile(path);
		routes.push({ keys, regex, handler, path });
		return app;
	};
	const match = (pathname) => {
		for (const route of routes) {
			const found = route.regex.exec(pathname.replace(/\/$/, '') || '/');
			if (!found) continue;
			const params = {};
			route.keys.forEach((key, i) => (params[key] = decodeURIComponent(found[i + 1])));
			return { route, params };
		}
		return null;
	};
	const app = {
		routes,
		get: addRoute,
		/** resolves a request to whatever the matched handler returned */
		fetch: async (request) => {
			const url = new URL(request.url);
			const found = match(url.pathname);
			if (!found) return undefined;
			const context = {
				params: found.params,
				query: parseQuery(url.search),
				path: url.pathname,
				url,
				request
			};
			return found.route.handler(context);
		}
	};
	return app;
};

/* -------------------------------------------------------------- the hook */

/**
 * `const { view, props, navigate, dispose } = useRouter(app, initial)`
 *
 * - `view` is a cell holding the current route's rendered content (`initial`
 *   until the first navigation resolves, and `notFound` when nothing matches
 *   or a handler throws).
 * - `props` is spread on the element that contains your `<a href="/…">`
 *   links; external and `target`-ed links are left alone.
 *
 * The returned navigate() resolves this view. Module-level navigate() updates
 * history and notifies every router. Dispose standalone hooks when their owner ends;
 * Router components do this automatically when discarded by the renderer.
 */
export const useRouter = (app, initial = '', notFound = null) => {
	const view = signal(initial);
	let current = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

	let disposed = false, latest = 0;
	const navigate = (path) => {
		if (disposed) return Promise.resolve();
		const token = ++latest;
		current = path;
		let response;
		try {
			const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
			response = app.fetch(new Request(url));
		} catch (error) { response = Promise.reject(error); }
		return Promise.resolve(response)
			.then((result) => { if (token === latest) write(view, result === undefined ? notFound : result); })
			.catch(() => { if (token === latest) write(view, notFound); });
	};

	const sync = () => navigate(window.location.pathname + window.location.search);
	if (typeof window !== 'undefined') {
		window.addEventListener('popstate', sync);
		sync(); // resolve the route we are already on
	}

	/** spread on the element that holds your links: `<main {...props}>` */
	const props = {
		onclick: (event) => {
			if (disposed) return;
			const anchor = event.target?.closest?.('a');
			if (!anchor) return;
			const href = anchor.getAttribute('href');
			if (!href || /^[a-z]+:\/\//i.test(href) || anchor.target === '_blank' || event.metaKey || event.ctrlKey) return;
			event.preventDefault();
			if (href !== current) window.history.pushState(null, '', href);
			navigate(href);
		}
	};
	const dispose = () => {
		if (disposed) return;
		disposed = true; latest++;
		if (typeof window !== 'undefined') window.removeEventListener('popstate', sync);
	};
	return { view, props, navigate, dispose };
};

/** push a new url and notify every mounted router */
export const navigate = (path) => {
	if (typeof window === 'undefined') return;
	window.history.pushState(null, '', path);
	window.dispatchEvent(new PopStateEvent('popstate'));
};

/** `<Link to="/about">About</Link>` — a plain anchor, intercepted by router.props */
export const Link = ({ to, children, ...props } = {}) => h('a', { ...props, href: to }, children);

/**
 * `<Router app={app} initial={…} notFound={…} />` — renders the live view
 * in place, with link interception on the wrapper.
 */
export const Router = ({ app, initial = '', notFound = null, children, ...props } = {}) => {
	const router = useRouter(app, initial, notFound);
	return h('div', { ...props, ...router.props }, router.view, onTeardown(router.dispose));
};
