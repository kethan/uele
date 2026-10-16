'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');

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
 * `[view, linkProps]` pair — `view` is a cell you render, `linkProps()` returns the props
 * that turn
 * every `<a href="/…">` inside the element into a client-side navigation.
 */

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
const createRouter = () => {
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
 * `const [view, linkProps] = useRouter(app, initial)`
 *
 * - `view` is a cell holding the current route's rendered content (`initial`
 *   until the first navigation resolves, and `notFound` when nothing matches
 *   or a handler throws).
 * - `linkProps` is spread on the element that contains your `<a href="/…">`
 *   links; external and `target`-ed links are left alone.
 *
 * Navigation happens on `popstate` (back/forward) and through `navigate()`.
 */
const useRouter = (app, initial = '', notFound = null) => {
	const view = reactive.signal(initial);
	let current = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

	const navigate = (path) => {
		current = path;
		const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
		return Promise.resolve(app.fetch(new Request(url)))
			.then((result) => reactive.write(view, result === undefined ? notFound : result))
			.catch(() => reactive.write(view, notFound));
	};

	if (typeof window !== 'undefined') {
		const sync = () => navigate(window.location.pathname + window.location.search);
		window.addEventListener('popstate', sync);
		sync(); // resolve the route we are already on
	}

	/** spread on the element that holds your links: `<main {...linkProps()}>` */
	const linkProps = () => ({
		onclick: (event) => {
			const anchor = event.target?.closest?.('a');
			if (!anchor) return;
			const href = anchor.getAttribute('href');
			if (!href || /^[a-z]+:\/\//i.test(href) || anchor.target === '_blank' || event.metaKey || event.ctrlKey) return;
			event.preventDefault();
			if (href !== current) window.history.pushState(null, '', href);
			navigate(href);
		}
	});

	return [view, linkProps, navigate];
};

/** push a new url and notify every mounted router */
const navigate = (path) => {
	if (typeof window === 'undefined') return;
	window.history.pushState(null, '', path);
	window.dispatchEvent(new PopStateEvent('popstate'));
};

/** `<Link to="/about">About</Link>` — a plain anchor, intercepted by linkProps */
const Link = ({ to, children, ...props } = {}) => uele.h('a', { ...props, href: to }, children);

/**
 * `<Router app={app} fallback={…} notFound={…} />` — renders the live view
 * in place, with link interception on the wrapper.
 */
const Router = ({ app, initial = '', notFound = null, ...props } = {}) => {
	const [view, linkProps] = useRouter(app, initial, notFound);
	return uele.h('div', { ...props, ...linkProps() }, view);
};

exports.Link = Link;
exports.Router = Router;
exports.createRouter = createRouter;
exports.navigate = navigate;
exports.useRouter = useRouter;
