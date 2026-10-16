/**
 * Realtime sources: promises, observables, async iterables, streams and timers.
 * @vitest-environment jsdom
 */
import { expect, test, vi, afterEach } from 'vitest';
import { h, r, add, map, useLive, props, api } from '../src/index.js';
import { signal, effect, computed } from 'ulive';

api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// wait for a condition instead of guessing a delay: windows timers are ~15.6ms at
// best, so a fixed `await tick(20)` is not enough for three queued messages on a
// loaded machine (and sleeps long enough to be slow everywhere else)
const until = async (cond, ms = 2000) => {
	const deadline = Date.now() + ms;
	while (!cond()) {
		if (Date.now() > deadline) throw new Error('timed out waiting for the dom to settle');
		await tick(1);
	}
};
const mount = (...nodes) => {
	const root = document.createElement('div');
	root.append(...add(...nodes));
	return root;
};

const timers = [];
afterEach(() => {
	while (timers.length) clearInterval(timers.pop());
});

// -------------------------------------------------------------------- promises

test('promise children render a placeholder first and then the value', async () => {
	const root = mount(h('div', null, Promise.resolve('later')));
	expect(root.textContent).toBe('');
	await tick();
	expect(root.textContent).toBe('later');
});

test('promise children can resolve to nodes and arrays', async () => {
	const node = Promise.resolve(h('b', null, 'node'));
	const list = Promise.resolve(['a', h('i', null, 'b')]);
	const root = mount(h('div', null, node, list));
	await tick();
	expect(root.innerHTML).toBe('<div><b>node</b>a<i>b</i></div>');
});

test('async components render when they resolve', async () => {
	const fetchTodo = () => Promise.resolve({ title: 'todo' });
	const Todo = async ({ id }) => h('li', { id }, (await fetchTodo()).title);
	const root = mount(h('ul', null, h(Todo, { id: 't' })));
	expect(root.innerHTML).toBe('<ul></ul>');
	await tick();
	expect(root.innerHTML).toBe('<ul><li id="t">todo</li></ul>');
});

test('a rejected promise does not touch the dom when handled', async () => {
	const p = Promise.reject(new Error('nope')).catch(() => 'recovered');
	const root = mount(h('div', null, p));
	await tick();
	expect(root.textContent).toBe('recovered');
});

// ------------------------------------------------------------------ observables

test('observables stream values into the dom', async () => {
	const listeners = new Set();
	const observable = {
		subscribe(next) {
			listeners.add(next);
			next('one');
			return { unsubscribe: () => listeners.delete(next) };
		}
	};
	const root = mount(h('div', null, observable));
	expect(root.textContent).toBe('one');
	for (const next of listeners) next('two');
	expect(root.textContent).toBe('two');
});

test('Symbol.observable sources are supported', () => {
	const source = {
		[Symbol.observable || Symbol.for('observable')]() {
			return { subscribe: (next) => (next('sym'), () => {}) };
		}
	};
	expect(mount(h('div', null, source)).textContent).toBe('sym');
});

test('observable errors reach the r() error handler', () => {
	const boom = new Error('stream failed');
	const source = { subscribe: (next, error) => (error(boom), () => {}) };
	const errors = [];
	r(source, () => {}, (e) => errors.push(e));
	expect(errors).toEqual([boom]);
});

test('observable errors inside a child are ignored, the last value stays', () => {
	let handler;
	const source = {
		subscribe: (next, error) => {
			handler = error;
			next('ok');
			return () => {};
		}
	};
	const root = mount(h('div', null, source));
	expect(typeof handler).toBe('function'); // error sink is always callable
	handler(new Error('x'));
	expect(root.textContent).toBe('ok');
});

test('rejected promises used as children do not crash the render', async () => {
	const source = Promise.reject(new Error('unhandled'));
	const root = mount(h('div', null, source));
	await tick(10);
	expect(root.textContent).toBe('');
});

// --------------------------------------------------------------- async iterable

test('async iterables render every emission (last one wins)', async () => {
	const source = {
		async *[Symbol.asyncIterator]() {
			yield 'a';
			yield 'b';
			yield 'c';
		}
	};
	const root = mount(h('div', null, source));
	await tick(10);
	expect(root.textContent).toBe('c');
});

test('an async iterable that throws stops without breaking the render', async () => {
	const source = {
		async *[Symbol.asyncIterator]() {
			yield 'first';
			throw new Error('stream broke');
		}
	};
	const root = mount(h('div', null, source));
	await tick(10);
	expect(root.textContent).toBe('first');
});

test('slow async iterables update the dom as messages arrive', async () => {
	const messages = [];
	const source = {
		async *[Symbol.asyncIterator]() {
			for (const m of messages) {
				await tick(1);
				yield m;
			}
		}
	};
	messages.push('m1');
	const root = mount(h('div', null, source));
	messages.push('m2', 'm3'); // pushed before the generator can see the end of the array
	await until(() => root.textContent === 'm3');
	expect(root.textContent).toBe('m3');
});

// ---------------------------------------------------------------------- timers

test('timers and signals keep the dom in sync', async () => {
	const count = signal(0);
	const [live, setLive] = useLive(count);
	const root = mount(h('span', null, live));
	expect(root.textContent).toBe('0');
	timers.push(setInterval(() => count.value++, 5));
	await tick(30);
	clearInterval(timers.pop());
	const seen = Number(root.textContent);
	expect(seen).toBeGreaterThan(0);
	setLive('done');
	expect(root.textContent).toBe('done');
});

test('a websocket style stream updates a keyed list in realtime', async () => {
	const messages = signal([]);
	const root = mount(map(messages, (m) => h('li', { 'data-id': m.id }, m.text)));
	const first = { id: 1, text: 'hi' };
	const second = { id: 2, text: 'there' };
	const socket = {
		onmessage: (m) => (messages.value = messages.value.concat(m))
	};
	socket.onmessage(first);
	expect(root.querySelectorAll('li').length).toBe(1);
	socket.onmessage(second);
	expect(root.innerHTML).toBe('<li data-id="1">hi</li><li data-id="2">there</li>');
	// drop one message: nodes are keyed by message identity, so the survivor is re-used
	const node = root.querySelectorAll('li')[1];
	messages.value = [second];
	expect(root.querySelectorAll('li')[0]).toBe(node);
});

test('form input drives a signal and a live region', () => {
	const value = signal('');
	const input = h('input', { type: 'text', oninput: (e) => (value.value = e.target.value) });
	const echo = mount(h('p', null, value));
	input.value = 'typed';
	input.dispatchEvent(new Event('input'));
	expect(echo.textContent).toBe('typed');
});

test('computed values drive multiple bindings', () => {
	const price = signal(10);
	const qty = signal(2);
	const total = computed(() => price.value * qty.value);
	const root = mount(h('div', null, total, ' x ', total));
	expect(root.textContent).toBe('20 x 20');
	qty.value = 3;
	expect(root.textContent).toBe('30 x 30');
});

// --------------------------------------------------------------------- cleanup

test('the documented props.unmount pattern cleans up on removal', async () => {
	const cleanup = vi.fn();
	const observer = new MutationObserver(() => {});
	props.set('unmount', (node, fn) => {
		const watch = () => {
			if (!node.parentNode) return requestAnimationFrame(watch);
			const o = new MutationObserver((list) => {
				for (const m of list)
					for (const removed of m.removedNodes)
						if (removed === node) (fn(), o.disconnect());
			});
			o.observe(node.parentNode, { childList: true });
		};
		watch();
	});
	const el = h('div', { unmount: cleanup }, 'bye');
	document.body.append(el);
	await tick(25); // let the observer attach to the parent
	document.body.removeChild(el);
	await tick(25);
	expect(cleanup).toHaveBeenCalledTimes(1);
	props.delete('unmount');
	observer.disconnect();
});

test('r returns an unsubscribe that stops further updates', () => {
	const count = signal(0);
	const seen = [];
	const off = r(count, (v) => seen.push(v));
	count.value = 1;
	expect(seen).toEqual([0, 1]);
	expect(typeof off).toBe('function');
	off();
	count.value = 2;
	expect(seen).toEqual([0, 1]);
});

test('add keeps a stable node order with mixed dynamic children', async () => {
	const a = signal('a');
	const root = mount(h('div', null, 'start', a, Promise.resolve('p'), 'end'));
	expect(root.textContent).toBe('startaend');
	await tick();
	expect(root.textContent).toBe('startapend');
	a.value = 'A';
	expect(root.textContent).toBe('startApend');
});
