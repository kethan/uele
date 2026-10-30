/**
 * The authoring layer, proven on every preset: the SAME utility code and the
 * SAME ui/flow/router components run on all eleven signal libraries.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { h, add } from 'uele';
import { For } from 'uele/flow';
import { signal, computed, read, write, effect, batch, untracked, isCell, canEffect, canCompute } from 'uele/reactive';
import { Button, Input, Card, Stack, Label } from 'uele/ui';
import { Suspense, ErrorBoundary, Await, Portal, Title } from 'uele/flow';
import { createRouter, useRouter, Link, Router, navigate } from 'uele/router';

const PRESETS = [
	['reflex', 'uele/signals/reflex', 'reflex', true],
	['reactively', 'uele/signals/reactively', 'reactively', true],
	['anod', 'uele/signals/anod', 'anod', true],
	['lite-signal', 'uele/signals/lite-signal', 'liteSignal', true],
	['rescript-signals', 'uele/signals/rescript-signals', 'rescriptSignals', true],
	['maverick', 'uele/signals/maverick', 'maverick', true],
	['oby', 'uele/signals/oby', 'oby', true],
	['ulive', 'uele/signals/ulive', 'ulive', true],
	['preact', 'uele/signals/preact', 'preactSignals', true],
	['vue', 'uele/signals/vue', 'vue', true],
	['usignal', 'uele/signals/usignal', 'usignal', true],
	['alien-signals', 'uele/signals/alien-signals', 'alienSignals', true],
	['s-js', 'uele/signals/sjs', 'sjs', true],
	['mobx', 'uele/signals/mobx', 'mobx', true],
	['solid', 'uele/signals/solid', 'solid', true],
	['signals', 'uele/signals/signals', 'signals', true],
	// subscribe-only: signals work, effects/computed do not
	['rxjs', 'uele/signals/rxjs', 'rxjs', false],
	['nanostores', 'uele/signals/nanostores', 'nanostores', false],
	['tanstack', 'uele/signals/tanstack', 'tanstackStore', false]
];

/** a utility written once, against ele/reactive — no idea which library runs it */
const useCounter = (start = 0) => {
	const count = signal(start);
	return {
		count,
		inc: () => write(count, read(count) + 1),
		doubled: canCompute() ? computed(() => read(count) * 2) : null
	};
};

describe.each(PRESETS)('facade on %s', (slug, path, fn, hasEffect) => {
	let use;
	beforeEach(async () => {
		document.body.innerHTML = '';
		use = (await import(path))[fn];
		use();
	});

	it('creates cells, reads and writes them through one api', () => {
		const { count, inc } = useCounter(1);
		expect(isCell(count)).toBe(true);
		expect(read(count)).toBe(1);
		inc();
		expect(read(count)).toBe(2);
	});

	it('derives values (or reports that it cannot)', () => {
		const { count, doubled, inc } = useCounter(3);
		if (canCompute()) {
			expect(read(doubled)).toBe(6);
			inc();
			expect(read(doubled)).toBe(8);
		} else {
			expect(doubled).toBe(null); // documented: subscribe-only libraries have no computed values
		}
	});

	it('runs effects and disposes them (or reports that it cannot)', () => {
		expect(canEffect()).toBe(hasEffect);
		if (!hasEffect) return;
		const { count, inc } = useCounter(0);
		let seen = 0;
		const off = effect(() => {
			read(count);
			seen++;
		});
		inc();
		expect(seen).toBe(2);
		off();
		inc();
		expect(seen).toBe(2);
	});

	it('batch and untracked never break the update', () => {
		const { count, inc } = useCounter(0);
		batch(() => {
			inc();
			inc();
		});
		expect(read(count)).toBe(2);
		expect(untracked(() => read(count))).toBe(2);
	});

	it('renders a signal through the runtime and updates it', () => {
		const { count, inc } = useCounter('a');
		const root = h('div', null, count);
		document.body.append(root);
		expect(root.textContent).toBe('a');
		inc.call(null); // writes 1: the cell itself is what matters below
		write(count, 'b');
		expect(root.textContent).toBe('b');
	});

	it('ui primitives work unchanged', () => {
		const { count, inc } = useCounter('');
		const app = Card({ children: [Input({ model: count, 'aria-label': 'name' }), Button({ children: 'go', onclick: inc })] });
		document.body.append(app);
		const input = app.querySelector('input');
		input.value = 'typed';
		input.dispatchEvent(new Event('input'));
		expect(read(count)).toBe('typed');
		const label = Card({ children: Stack({ children: Label({ children: count }) }) });
		expect(label.textContent).toBe('typed');
	});

	it('flow components work unchanged', () => {
		// ErrorBoundary contains a throwing child
		const safe = ErrorBoundary({
			children: () => {
				throw new Error('boom');
			},
			fallback: (error) => h('p', null, 'caught ' + error.message)
		});
		document.body.append(safe);
		expect(safe.textContent).toBe('caught boom');

		// Await resolves a promise
		const async_ = Await({ for: Promise.resolve('late'), fallback: 'waiting', children: (v) => h('b', null, v) });
		document.body.append(async_);
		expect(async_.textContent).toBe('waiting');
	});

	it('Await settles and Portal/Title work', async () => {
		const node = Await({ for: () => Promise.resolve('value'), children: (v) => h('b', null, v) });
		document.body.append(node);
		await Promise.resolve();
		await Promise.resolve();
		expect(node.textContent).toBe('value');

		// Portal moves nodes elsewhere and leaves a placeholder
		const host = document.createElement('div');
		document.body.append(host);
		const app = h('div', null, Portal({ mount: host, children: h('i', null, 'ported') }));
		document.body.append(app);
		expect(host.textContent).toBe('ported');

		// Title sets document.title
		Title({ children: 'hello ' + slug });
		expect(document.title).toBe('hello ' + slug);
	});
});

describe('router (runs on ulive, same code for every preset)', () => {
	beforeEach(async () => {
		document.body.innerHTML = '';
		(await import('uele/signals/ulive')).ulive();
		window.history.pushState(null, '', '/');
	});

	const build = () => {
		const app = createRouter();
		app.get('/', () => h('h1', null, 'Home'));
		app.get('/about', () => h('h1', null, 'About'));
		app.get('/user/:id', ({ params }) => h('h1', null, 'User ' + params.id));
		app.get('*', () => h('h1', null, '404'));
		return app;
	};

	it('matches paths, params and wildcards', async () => {
		const app = build();
		const at = async (path) => {
			const res = await app.fetch(new Request('http://x' + path));
			return res.textContent;
		};
		expect(await at('/')).toBe('Home');
		expect(await at('/about')).toBe('About');
		expect(await at('/user/42')).toBe('User 42');
		expect(await at('/nope')).toBe('404');
	});

	it('renders the live view and navigates on link clicks', async () => {
		const app = build();
		const root = Router({ app, initial: h('h1', null, 'Loading'), 'aria-label': 'shell' });
		document.body.append(root);
		await Promise.resolve();
		expect(root.textContent).toBe('Home');

		root.append(Link({ to: '/about', children: 'About' }));
		root.querySelector('a').click();
		await Promise.resolve();
		expect(root.textContent).toContain('About');
		expect(window.location.pathname).toBe('/about');
	});

	it('renders the notFound branch when nothing matches', async () => {
		const app = createRouter(); // no routes at all
		const { view } = useRouter(app, 'loading', h('h1', null, 'Not found'));
		const root = h('div', null, view);
		document.body.append(root);
		await Promise.resolve();
		expect(root.textContent).toBe('Not found');
	});

	it('works with any fetch(Request) router, e.g. uflite/nano', async () => {
		// the documented uflite/nano shape: get() + fetch(request) -> raw result
		const ufliteLike = {
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
		ufliteLike.get('/', () => h('h1', null, 'uflite home'));
		const { view } = useRouter(ufliteLike, 'loading');
		const root = h('div', null, view);
		document.body.append(root);
		await Promise.resolve();
		expect(root.textContent).toBe('uflite home');
	});
});
