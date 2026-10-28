/** @jsxImportSource uele */
/**
 * `uele/flow` and `uele/router`, driven harder than the per-preset smoke run in
 * test/reactive.test.js: async races, error containment, portals, link
 * interception, history and disposal. JSX, because that is how the docs show
 * them.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { signal } from '@preact/signals-core';
import { Suspense, Await, ErrorBoundary, Portal, Title } from 'uele/flow';
import { createRouter, useRouter, Link, Router, navigate } from 'uele/router';

const tick = () => new Promise((r) => setTimeout(r, 0));
const deferred = () => {
	let resolve, reject;
	const promise = new Promise((ok, no) => ((resolve = ok), (reject = no)));
	return { promise, resolve, reject };
};

beforeEach(() => {
	preactSignals();
	document.body.innerHTML = '';
	document.title = 'before';
	window.history.pushState(null, '', '/');
});

/* ------------------------------------------------------------------- Await */

describe('Await', () => {
	it('shows the fallback, then the resolved value', async () => {
		const { promise, resolve } = deferred();
		const node = <Await for={promise} fallback={<i>waiting</i>}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(node);
		expect(node.textContent).toBe('waiting');
		resolve('done');
		await tick();
		expect(node.textContent).toBe('done');
		expect(node.querySelector('b')).toBeTruthy();
	});

	it('accepts a thunk and re-runs it when the cells it reads change', async () => {
		const id = signal(1);
		const load = vi.fn(async () => 'user ' + id.value);
		const node = <Await for={load}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('user 1');
		id.value = 2;
		await tick();
		expect(node.textContent).toBe('user 2');
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('accepts a cell holding a promise', async () => {
		const promise = signal(deferred().promise);
		const node = <Await for={promise}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('');
	});

	it('renders a plain (non-promise) value immediately', () => {
		const node = <Await for={'plain'}>{(v) => <b>{v}</b>}</Await>;
		expect(node.textContent).toBe('plain');
	});

	it('never lets a late response overwrite a newer one', async () => {
		const slow = deferred();
		const fast = deferred();
		const source = signal(slow.promise);
		const node = <Await for={source}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(node);
		source.value = fast.promise; // the newer request
		fast.resolve('fast');
		await tick();
		expect(node.textContent).toBe('fast');
		slow.resolve('slow'); // arrives late: must be ignored
		await tick();
		expect(node.textContent).toBe('fast');
	});

	it('renders `catch` on rejection, and nothing without it', async () => {
		const failing = Promise.reject(new Error('nope'));
		const node = <Await for={failing} catch={(e) => <u>{e.message}</u>}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('nope');

		const bare = <Await for={Promise.reject(new Error('x'))}>{(v) => <b>{v}</b>}</Await>;
		document.body.append(bare);
		await tick();
		expect(bare.textContent).toBe('');
	});

	it('renders `catch` when the thunk throws synchronously', () => {
		const node = (
			<Await
				for={() => {
					throw new Error('boom');
				}}
				catch={(e) => <u>{e.message}</u>}
			>
				{(v) => <b>{v}</b>}
			</Await>
		);
		expect(node.textContent).toBe('boom');
	});
});

/* ---------------------------------------------------------------- Suspense */

describe('Suspense', () => {
	it('shows the fallback until the async children resolve', async () => {
		const { promise, resolve } = deferred();
		const node = (
			<Suspense fallback={<i>loading</i>}>{async () => <b>{await promise}</b>}</Suspense>
		);
		document.body.append(node);
		expect(node.textContent).toBe('loading');
		resolve('loaded');
		await tick();
		expect(node.textContent).toBe('loaded');
	});

	it('renders sync children straight away', () => {
		const node = <Suspense fallback={<i>loading</i>}>{() => <b>sync</b>}</Suspense>;
		expect(node.textContent).toBe('sync');
	});

	it('catches a rejected async child', async () => {
		const node = (
			<Suspense fallback={<i>loading</i>} catch={(e) => <u>{e.message}</u>}>
				{async () => {
					throw new Error('async boom');
				}}
			</Suspense>
		);
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('async boom');
	});
});

/* ----------------------------------------------------------- ErrorBoundary */

describe('ErrorBoundary', () => {
	it('renders the children when nothing throws', () => {
		const node = <ErrorBoundary fallback={<i>fallback</i>}>{() => <b>fine</b>}</ErrorBoundary>;
		expect(node.textContent).toBe('fine');
	});

	it('accepts plain node children', () => {
		const node = (
			<ErrorBoundary fallback={<i>fallback</i>}>
				<b>node</b>
			</ErrorBoundary>
		);
		expect(node.textContent).toBe('node');
	});

	it('catches a synchronous throw and passes the error to the fallback', () => {
		const seen = [];
		const node = (
			<ErrorBoundary fallback={(e) => <u>{e.message}</u>} onError={(e) => seen.push(e.message)}>
				{() => {
					throw new Error('boom');
				}}
			</ErrorBoundary>
		);
		expect(node.textContent).toBe('boom');
		expect(seen).toEqual(['boom']);
	});

	it('catches a rejected async child and calls onError once', async () => {
		const seen = [];
		const node = (
			<ErrorBoundary fallback={(e) => <u>{e.message}</u>} onError={(e) => seen.push(e.message)}>
				{async () => {
					throw new Error('later');
				}}
			</ErrorBoundary>
		);
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('later');
		expect(seen).toEqual(['later']);
	});

	it('contains the error: siblings keep rendering', () => {
		const parent = (
			<div>
				<ErrorBoundary fallback={<i>saved</i>}>
					{() => {
						throw new Error('x');
					}}
				</ErrorBoundary>
				<b>alive</b>
			</div>
		);
		expect(parent.textContent).toContain('saved');
		expect(parent.textContent).toContain('alive');
	});
});

/* ----------------------------------------------------------------- Portal */

describe('Portal', () => {
	it('moves its children into the target and leaves a placeholder', () => {
		const host = <div id="host" />;
		document.body.append(host);
		const node = (
			<div>
				<Portal mount={host}>
					<b>ported</b>
				</Portal>
				<i>stayed</i>
			</div>
		);
		document.body.append(node);
		expect(host.textContent).toBe('ported');
		expect(node.querySelector('b')).toBe(null); // it left the tree
		expect(node.textContent).toContain('stayed');
	});

	it('keeps live bindings working after the move', () => {
		const host = <div id="host" />;
		document.body.append(host);
		const name = signal('a');
		const node = (
			<div>
				<Portal mount={host}>
					<b>{name}</b>
				</Portal>
			</div>
		);
		document.body.append(node);
		expect(host.textContent).toBe('a');
		name.value = 'b';
		expect(host.textContent).toBe('b');
	});

	it('defaults to document.body and accepts a selector', () => {
		document.body.append(<Portal>{<b>to body</b>}</Portal>);
		expect(document.body.textContent).toContain('to body');

		const target = <div id="target" />;
		document.body.append(target);
		document.body.append(
			<Portal mount="#target">
				<b>by selector</b>
			</Portal>
		);
		expect(target.textContent).toBe('by selector');
	});
});

/* ------------------------------------------------------------------ Title */

describe('Title', () => {
	it('sets document.title from a string', () => {
		document.body.append(<Title>Hello</Title>);
		expect(document.title).toBe('Hello');
	});

	it('follows a cell', () => {
		const name = signal('first');
		const node = <Title>{name}</Title>;
		const host = <div>{node}</div>;
		document.body.append(host);
		expect(document.title).toBe('first');
		name.value = 'second';
		expect(document.title).toBe('second');
	});

	it('accepts a thunk', () => {
		const name = signal('a');
		document.body.append(<Title>{() => 'title: ' + name.value}</Title>);
		expect(document.title).toBe('title: a');
		name.value = 'b';
		expect(document.title).toBe('title: b');
	});
});

/* ----------------------------------------------------------------- Router */

describe('createRouter', () => {
	const build = () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>);
		app.get('/about', () => <h1>About</h1>);
		app.get('/user/:id', ({ params }) => <h1>User {params.id}</h1>);
		app.get('/user/:id/posts/:post', ({ params }) => <h1>{params.id}/{params.post}</h1>);
		app.get('*', () => <h1>Not found</h1>);
		return app;
	};
	const at = async (app, path) => (await app.fetch(new Request('http://x' + path)))?.textContent;

	it('matches static routes, params and nested params', async () => {
		const app = build();
		expect(await at(app, '/')).toBe('Home');
		expect(await at(app, '/about')).toBe('About');
		expect(await at(app, '/user/42')).toBe('User 42');
		expect(await at(app, '/user/42/posts/7')).toBe('42/7');
		expect(await at(app, '/nope')).toBe('Not found');
	});

	it('decodes params and parses the query string', async () => {
		const app = createRouter();
		app.get('/search', ({ params, query, path }) => (
			<h1>
				{query.q} {query.page} {path}
			</h1>
		));
		expect(await at(app, '/search?q=uele&page=2')).toBe('uele 2 /search');
	});

	it('collects repeated query keys into an array', async () => {
		let seen;
		const app = createRouter();
		app.get('/t', ({ query }) => (seen = query.tag, <h1>ok</h1>));
		await app.fetch(new Request('http://x/t?tag=a&tag=b'));
		expect(seen).toEqual(['a', 'b']);
	});

	it('returns undefined when nothing matches (so the caller shows notFound)', async () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>); // no wildcard
		expect(await app.fetch(new Request('http://x/nope'))).toBeUndefined();
	});

	it('supports async handlers', async () => {
		const app = createRouter();
		app.get('/slow', async () => <h1>slow</h1>);
		expect(await at(app, '/slow')).toBe('slow');
	});
});

describe('useRouter', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
	});

	const build = () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>);
		app.get('/about', () => <h1>About</h1>);
		app.get('/user/:id', ({ params }) => <h1>User {params.id}</h1>);
		return app;
	};

	it('renders the route we are already on, then follows navigate()', async () => {
		const app = build();
		const { view, navigate: go } = useRouter(app, '…loading');
		const node = <main>{view}</main>;
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('Home');

		await go('/about');
		expect(node.textContent).toBe('About');
		await go('/user/9');
		expect(node.textContent).toBe('User 9');
	});

	it('renders notFound for an unknown path', async () => {
		const app = build();
		const { view, navigate: go } = useRouter(app, '', <h1>404</h1>);
		const node = <main>{view}</main>;
		document.body.append(node);
		await go('/missing');
		expect(node.textContent).toBe('404');
	});

	it('follows browser history (popstate)', async () => {
		const app = build();
		const { view } = useRouter(app);
		const node = <main>{view}</main>;
		document.body.append(node);
		await tick();
		window.history.pushState(null, '', '/about');
		window.dispatchEvent(new PopStateEvent('popstate'));
		await tick();
		expect(node.textContent).toBe('About');
	});

	it('navigate() (module level) pushes history and notifies mounted routers', async () => {
		const app = build();
		const { view } = useRouter(app);
		const node = <main>{view}</main>;
		document.body.append(node);
		await tick();
		navigate('/about');
		await tick();
		expect(node.textContent).toBe('About');
		expect(window.location.pathname).toBe('/about');
	});
});

describe('Link and linkProps', () => {
	const build = () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>);
		app.get('/about', () => <h1>About</h1>);
		return app;
	};

	it('intercepts in-app links', async () => {
		const app = build();
		const node = <Router app={app} initial={'…'} />;
		document.body.append(node);
		await tick();
		node.append(<Link to="/about">About</Link>);
		node.querySelector('a').click();
		await tick();
		expect(node.textContent).toContain('About');
		expect(window.location.pathname).toBe('/about');
	});

	it('leaves external links, target=_blank and modifier clicks to the browser', async () => {
		const app = build();
		const { view, props: linkProps } = useRouter(app);
		const node = <main {...linkProps}>{view}</main>;
		document.body.append(node);
		await tick();

		// jsdom follows an unprevented anchor click and logs "Not implemented:
		// navigation", and it reads `defaultPrevented` during dispatch - so record it
		// from a listener that runs *after* linkProps' handler, then cancel the click
		const seen = [];
		node.addEventListener('click', (e) => {
			seen.push(e.defaultPrevented);
			e.preventDefault();
		});

		const external = <a href="https://example.com/x">out</a>;
		node.append(external);
		let event = new MouseEvent('click', { bubbles: true, cancelable: true });
		external.dispatchEvent(event);
		expect(seen.at(-1)).toBe(false);

		const blank = <a href="/about" target="_blank" />;
		node.append(blank);
		event = new MouseEvent('click', { bubbles: true, cancelable: true });
		blank.dispatchEvent(event);
		expect(seen.at(-1)).toBe(false);

		const meta = <a href="/about">meta</a>;
		node.append(meta);
		event = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
		meta.dispatchEvent(event);
		expect(seen.at(-1)).toBe(false);
	});

	it('intercepts a plain anchor nested inside the wrapper', async () => {
		const app = build();
		const { view, props: linkProps } = useRouter(app);
		const node = (
			<main {...linkProps}>
				{view}
				<nav>
					<span>
						<a href="/about">deep</a>
					</span>
				</nav>
			</main>
		);
		document.body.append(node);
		await tick();
		const event = new MouseEvent('click', { bubbles: true, cancelable: true });
		node.querySelector('a').dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		await tick();
		expect(node.textContent).toContain('About');
	});
});

describe('Router works with any fetch(Request) router, e.g. uflite/nano', () => {
	it('renders whatever the handler returns (uflite/nano returns it raw)', async () => {
		// the uflite/nano shape: get(path, handler) + fetch(request) -> the raw result
		const nano = {
			routes: [],
			get(path, handler) {
				this.routes.push([path, handler]);
				return this;
			},
			async fetch(request) {
				const { pathname } = new URL(request.url);
				const found = this.routes.find(([p]) => p === pathname);
				return found ? found[1]() : undefined;
			}
		};
		nano.get('/', () => <h1>nano home</h1>);
		const { view } = useRouter(nano, '…');
		const node = <main>{view}</main>;
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('nano home');
	});
});

afterEach(() => {
	document.title = 'before';
});
