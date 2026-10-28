/** @jsxImportSource uele */
/**
 * Remaining `uele/flow` + `uele/router` edges: an async child that RESOLVES
 * through ErrorBoundary (the reject side was covered), Await/Suspense
 * failures with no `catch` handler, Title in all child forms plus its
 * teardown restore, and re-clicking the link for the route you are on.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { preactSignals } from 'uele/signals/preact';
import { signal, write, read } from 'uele/reactive';
import { Await, Suspense, ErrorBoundary, Title } from 'uele/flow';
import { createRouter, useRouter, navigate } from 'uele/router';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	preactSignals();
	document.body.innerHTML = '';
	document.title = 'before';
	window.history.pushState(null, '', '/');
});

describe('ErrorBoundary / Await resolution paths', () => {
	it('renders a child promise that resolves, without touching onError', async () => {
		const seen = [];
		const node = (
			<ErrorBoundary fallback={<i>fallback</i>} onError={(e) => seen.push(e.message)}>
				{() => Promise.resolve(<b>async ok</b>)}
			</ErrorBoundary>
		);
		document.body.append(node);
		await tick();
		await tick();
		expect(node.textContent).toContain('async ok');
		expect(seen).toEqual([]);
	});

	it('Await renders empty (not a crash) when the source throws synchronously with no catch', async () => {
		const node = (
			<Await for={() => { throw new Error('sync boom'); }} fallback={<i>loading</i>}>
				{(v) => <b>{v}</b>}
			</Await>
		);
		document.body.append(node);
		await tick();
		expect(node.textContent).toBe('');
	});

	it('Suspense keeps rendering empty when children reject with no catch', async () => {
		const node = (
			<Suspense fallback={<i>loading</i>}>
				{async () => { throw new Error('late boom'); }}
			</Suspense>
		);
		document.body.append(node);
		await tick();
		await tick();
		expect(node.textContent).toBe('');
	});
});

describe('Title child forms and teardown', () => {
	it('applies string, cell, thunk and null children', async () => {
		const cell = signal('Cell Title');
		document.body.append(<Title>Static Title</Title>);
		await tick();
		expect(document.title).toBe('Static Title');

		document.body.innerHTML = '';
		document.body.append(<Title>{cell}</Title>);
		await tick();
		expect(document.title).toBe('Cell Title');

		document.body.innerHTML = '';
		document.body.append(<Title>{() => 'Thunk Title'}</Title>);
		await tick();
		expect(document.title).toBe('Thunk Title');

		document.body.innerHTML = '';
		document.body.append(<Title>{null}</Title>);
		await tick();
		expect(document.title).toBe('');
	});

	it('keeps the title in sync as a cell child changes (cleanup runs between runs)', async () => {
		const cell = signal('One');
		document.body.append(<Title>{cell}</Title>);
		await tick();
		expect(document.title).toBe('One');
		write(cell, 'Two');
		await tick();
		expect(document.title).toBe('Two');
	});

	it('restores the previous title when its region is torn down, and stops reacting', async () => {
		const show = signal(true);
		const name = signal('Page A');
		// the Title subtree is discarded by the framework itself (region re-run)
		document.body.append(<div>{() => (read(show) ? <Title>{name}</Title> : 'off')}</div>);
		await tick();
		expect(document.title).toBe('Page A');
		write(show, false);
		await tick();
		expect(document.body.textContent).toContain('off');
		expect(document.title).toBe('before'); // cleanup ran with the discarded region
		write(name, 'Zombie'); // the unmounted Title must not react any more
		await tick();
		expect(document.title).toBe('before');
	});

	it('a swapped-in Title wins, and restores the captured previous on removal', async () => {
		const page = signal('a');
		document.body.append(
			<div>{() => (read(page) === 'a' ? <Title>Page A</Title> : read(page) === 'b' ? <Title>Page B</Title> : 'none')}</div>
		);
		await tick();
		expect(document.title).toBe('Page A');
		write(page, 'b'); // B applies after A is disposed; A's guarded restore must not clobber it
		await tick();
		expect(document.title).toBe('Page B');
		write(page, 'none'); // B restores what it captured at mount (stacked semantics)
		await tick();
		expect(document.title).toBe('Page A');
	});
});

describe('useRouter same-route link clicks', () => {
	it('does not push a duplicate history entry for the current path', async () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>);
		app.get('/about', () => <h1>About</h1>);
		const { view, props: linkProps } = useRouter(app, '', <h1>404</h1>);
		const node = (
			<main {...linkProps}>
				{view}
				<a href="/about">About</a>
			</main>
		);
		document.body.append(node);
		navigate('/about'); // pushes history and notifies the router
		await tick();
		expect(window.location.pathname).toBe('/about');
		expect(node.textContent).toContain('About');

		const before = window.history.length;
		const link = node.querySelector('a');
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await tick();
		expect(window.location.pathname).toBe('/about');
		expect(window.history.length).toBe(before); // navigate ran, but no duplicate entry
		expect(node.textContent).toContain('About');
	});
});
