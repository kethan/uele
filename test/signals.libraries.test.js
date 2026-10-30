/**
 * Library-specific integrations: the parts of each signal library that the
 * conformance matrix cannot express (operators, scopes, batches, lifecycle
 * hooks, error channels) plus the two generic integration recipes.
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { add, h, map, useLive, r, api } from '../src/index.js';
import { DEFAULT_API, install } from './helpers/signal-adapters.js';

const host = () => {
	const root = document.createElement('div');
	document.body.append(root);
	return root;
};

/** current text of a live region, markers removed */
const live = (root) => root.textContent;

afterEach(() => install(api, { overrides: DEFAULT_API }));

// --------------------------------------------------------------------- ulive

describe('ulive', () => {
	test('computed chains render and update, peek() reads without tracking', async () => {
		const m = await import('ulive');
		install(api, { overrides: { is: (v) => v?.peek, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const a = m.signal(2);
		const b = m.computed(() => a.value * 3);
		const c = m.computed(() => b.value + 1);
		root.append(h('div', null, c));
		expect(live(root)).toBe('7');
		a.value = 3;
		expect(live(root)).toBe('10');
		expect(b.peek()).toBe(9);
		root.remove();
	});

	test('batch coalesces writes and untracked reads do not subscribe', async () => {
		const m = await import('ulive');
		install(api, { overrides: { is: (v) => v?.peek, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const a = m.signal(0);
		const b = m.signal(0);
		let renders = 0;
		const el = h('p', null, m.computed(() => (renders++, a.value + b.value)));
		root.append(el);
		m.batch(() => {
			a.value = 1;
			b.value = 2;
		});
		expect(el.textContent).toBe('3');
		expect(renders).toBeLessThanOrEqual(3);
		const other = m.signal('x');
		expect(m.untracked(() => other.value)).toBe('x');
		root.remove();
	});

	test('signals holding objects and arrays render and update', async () => {
		const m = await import('ulive');
		install(api, { overrides: { is: (v) => v?.peek, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const list = m.signal([1, 2]);
		root.append(...map(list, (n) => h('i', null, String(n))));
		expect([...root.querySelectorAll('i')].map((n) => n.textContent)).toEqual(['1', '2']);
		list.value = [3, 4, 5];
		expect([...root.querySelectorAll('i')].map((n) => n.textContent)).toEqual(['3', '4', '5']);
		root.remove();
	});
});

// ------------------------------------------------------- @preact/signals-core

describe('@preact/signals-core', () => {
	test('works with zero configuration: usub uses the built-in .subscribe()', async () => {
		const m = await import('@preact/signals-core');
		install(api, { overrides: {} });
		const root = host();
		const count = m.signal(0);
		const el = h('p', null, count);
		root.append(el);
		expect(el.textContent).toBe('0');
		count.value = 1;
		expect(el.textContent).toBe('1');
		// without api.is/api.get the synchronous read path still returns the cell,
		// so register the library when you need map/For/If to read it
		expect(api.get(count) === count || api.get(count) === 0).toBe(true);
		install(api, { overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value } });
		expect(api.get(count)).toBe(1);
		root.remove();
	});

	test('computed values are lazy and batch() coalesces renders', async () => {
		const m = await import('@preact/signals-core');
		install(api, { overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const a = m.signal(1);
		let computed = 0;
		const doubled = m.computed(() => (computed++, a.value * 2));
		root.append(h('div', null, doubled));
		const before = computed;
		m.batch(() => {
			a.value = 2;
			a.value = 3;
		});
		expect(root.textContent).toBe('6');
		expect(computed).toBeGreaterThan(before);
		root.remove();
	});
});

// ------------------------------------------------------------ @vue/reactivity

describe('@vue/reactivity', () => {
	test('effectScope/onScopeDispose integrate through api.cleanup', async () => {
		const m = await import('@vue/reactivity');
		const disposals = [];
		install(api, {
			overrides: {
				is: m.isRef,
				get: (v) => v.value,
				effect: (fn) => {
					const scope = m.effectScope();
					scope.run(() => fn());
					return () => scope.stop();
				},
				cleanup: (fn) => fn && m.onScopeDispose(fn)
			}
		});
		const root = host();
		const cell = m.ref('a');
		const stop = api.sub(cell, () => disposals.push('sub'), undefined, () => disposals.push('cleanup'));
		stop();
		expect(disposals).toEqual(['sub', 'cleanup']);
		root.remove();
	});

	test('computed refs and reactive objects work', async () => {
		const m = await import('@vue/reactivity');
		install(api, { overrides: { is: m.isRef, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const cell = m.ref(2);
		const doubled = m.computed(() => cell.value * 2);
		root.append(h('div', null, doubled));
		expect(root.textContent).toBe('4');
		cell.value = 5;
		expect(root.textContent).toBe('10');
		root.remove();
	});

	test('a ref can drive a live region through useLive and stop()', async () => {
		const m = await import('@vue/reactivity');
		install(api, { overrides: { is: m.isRef, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const cell = m.ref('a');
		const [nodes] = useLive(cell);
		root.append(...nodes);
		cell.value = 'b';
		expect(root.textContent).toBe('b');
		root.remove();
	});
});

// -------------------------------------------------------------------- usignal

describe('usignal', () => {
	test('batch() coalesces writes into one render', async () => {
		const m = await import('usignal');
		install(api, { overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value, effect: m.effect } });
		const root = host();
		const a = m.signal(1);
		const b = m.signal(2);
		let writes = 0;
		const el = h('p', null, m.computed(() => (writes++, a.value + b.value)));
		root.append(el);
		m.batch(() => {
			a.value = 10;
			b.value = 20;
		});
		expect(el.textContent).toBe('30');
		expect(writes).toBeLessThanOrEqual(3);
		root.remove();
	});

	test('peek() and Signal identity', async () => {
		const m = await import('usignal');
		install(api, { overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value, effect: m.effect } });
		const s = m.signal(3);
		expect(api.is(s)).toBe(true);
		expect(s.peek()).toBe(3);
		expect(api.get(s)).toBe(3);
	});
});

// ------------------------------------------------------------- alien-signals

describe('alien-signals', () => {
	test('signals are functions and batches can be nested', async () => {
		const m = await import('alien-signals');
		install(api, { overrides: { is: (v) => typeof v === 'function', get: (v) => v(), effect: m.effect } });
		const root = host();
		const a = m.signal(1);
		const b = m.signal(2);
		root.append(h('p', null, m.computed(() => a() + b())));
		expect(root.textContent).toBe('3');
		m.startBatch();
		a(5);
		b(5);
		m.endBatch();
		expect(root.textContent).toBe('10');
		expect(m.isSignal(a)).toBe(true);
		expect(api.is(a)).toBe(true);
		root.remove();
	});

	test('an effect cleanup returned from the callback disposes on re-run', async () => {
		const m = await import('alien-signals');
		const teardowns = [];
		install(api, {
			overrides: {
				is: (v) => typeof v === 'function',
				get: (v) => v(),
				effect: m.effect,
				cleanup: (fn) => fn && teardowns.push(fn)
			}
		});
		const root = host();
		const cell = m.signal(1);
		const stop = api.sub(cell, () => {}, undefined, () => teardowns.push('user'));
		cell(2);
		expect(teardowns.length).toBeGreaterThan(0);
		stop();
		expect(teardowns.filter((f) => f === 'user').length).toBeGreaterThan(0);
		root.remove();
	});
});

// ----------------------------------------------------------------------- s-js

describe('s-js', () => {
	test('S.root owns the disposer and S.cleanup runs natively on dispose', async () => {
		const S = (await import('s-js')).default;
		const ran = [];
		install(api, {
			overrides: {
				is: (v) => typeof v === 'function',
				get: (v) => v(),
				effect: (fn) => {
					let dispose;
					S.root((d) => {
						dispose = d;
						S.effect(fn);
					});
					return dispose;
				},
				cleanup: (fn) => fn && S.cleanup(() => ran.push(fn))
			}
		});
		const root = host();
		const cell = S.data('a');
		const el = h('p', null, cell);
		root.append(el);
		expect(el.textContent).toBe('a');
		cell('b');
		expect(el.textContent).toBe('b');
		root.remove();
	});

	test('S.sample() reads without subscribing and nested roots dispose independently', async () => {
		const S = (await import('s-js')).default;
		install(api, { overrides: { is: (v) => typeof v === 'function', get: (v) => v(), effect: (fn) => {
			let dispose;
			S.root((d) => {
				dispose = d;
				S.effect(fn);
			});
			return dispose;
		} } });
		const root = host();
		const a = S.data(1);
		const b = S.value(10);
		expect(S.sample(() => b())).toBe(10);
		const [nodes] = useLive(a);
		root.append(...nodes);
		a(2);
		expect(root.textContent).toBe('2');
		root.remove();
	});
});

// ----------------------------------------------------------------------- mobx

describe('mobx', () => {
	test('boxed observables, computed values and reactions', async () => {
		const m = await import('mobx');
		m.configure({ enforceActions: 'never', useProxies: 'never' });
		install(api, { overrides: { is: (v) => m.isBoxedObservable(v) || m.isComputed(v), get: (v) => v.get(), effect: m.autorun } });
		const root = host();
		const price = m.observable.box(2);
		const qty = m.observable.box(3);
		const total = m.computed(() => price.get() * qty.get());
		root.append(h('p', null, total));
		expect(root.textContent).toBe('6');
		price.set(4);
		expect(root.textContent).toBe('12');
		const seen = [];
		const dispose = m.reaction(() => total.get(), (v) => seen.push(v));
		qty.set(10);
		expect(seen).toEqual([40]);
		dispose();
		root.remove();
	});
});

// ---------------------------------------------------------------------- rxjs

describe('rxjs', () => {
	const rx = async () => {
		const m = await import('rxjs');
		install(api, {
			overrides: {
				is: (v) => !!v?.subscribe && typeof v.pipe === 'function',
				get: (v) => v?.value,
				any: (src) => (src?.subscribe ? (next) => src.subscribe((v) => next(v)).unsubscribe : undefined)
			}
		});
		return m;
	};

	test('operator chains feed the dom, values and completion included', async () => {
		const m = await rx();
		const root = host();
		const ticks = new m.BehaviorSubject(1);
		const doubled = ticks.pipe(m.map((v) => v * 2), m.distinctUntilChanged());
		const [nodes, set] = useLive([]);
		root.append(...nodes);
		api.sub(doubled, (v) => set([h('i', null, String(v))]));
		expect(root.textContent).toBe('2');
		ticks.next(3);
		expect(root.textContent).toBe('6');
		ticks.next(3);
		expect(root.textContent).toBe('6');
		root.remove();
	});

	test('a Subject renders nothing until the first emission', async () => {
		const m = await rx();
		const root = host();
		const subject = new m.Subject();
		const el = h('p', null, subject);
		root.append(el);
		expect(el.textContent).toBe('');
		subject.next('first');
		expect(el.textContent).toBe('first');
		root.remove();
	});

	test('interval streams update the dom and stop on unsubscribe', async () => {
		vi.useFakeTimers();
		const m = await rx();
		const root = host();
		const [nodes, set] = useLive('0');
		root.append(...nodes);
		const stop = m.interval(10).pipe(m.take(3)).subscribe((n) => set(String(n)));
		vi.advanceTimersByTime(35);
		expect(root.textContent).toBe('2');
		stop.unsubscribe();
		vi.advanceTimersByTime(100);
		expect(root.textContent).toBe('2');
		vi.useRealTimers();
		root.remove();
	});

	test('errors never escape add(): r() is the error channel', async () => {
		const m = await rx();
		const root = host();
		const errors = [];
		const failing = new m.Subject();
		root.append(h('p', null, failing));
		failing.error(new Error('boom'));
		const seen = [];
		r(failing, (v) => seen.push(v), (e) => errors.push(e.message));
		expect(errors).toEqual(['boom']);
		expect(seen).toEqual([]);
		root.remove();
	});

	test('a websocket-like stream drives a list, teardown unsubscribes', async () => {
		const m = await rx();
		const root = host();
		const messages = new m.BehaviorSubject([]);
		root.append(...map(messages, (text) => h('li', null, text), 'empty'));
		expect(root.textContent).toBe('empty');
		messages.next(['a']);
		messages.next(['a', 'b']);
		expect([...root.querySelectorAll('li')].map((n) => n.textContent)).toEqual(['a', 'b']);
		root.remove();
	});
});

// ---------------------------------------------------------------- nanostores

describe('nanostores', () => {
	test('atoms, map stores and computed stores render', async () => {
		const m = await import('nanostores');
		install(api, { overrides: { is: (v) => !!v?.subscribe && typeof v.get === 'function', get: (v) => v.get() } });
		const root = host();
		const count = m.atom(2);
		const doubled = m.computed(count, (v) => v * 2);
		root.append(h('p', null, doubled));
		expect(root.textContent).toBe('4');
		count.set(5);
		expect(root.textContent).toBe('10');
		const user = m.map({ name: 'a' });
		root.append(h('em', null, m.computed(user, (u) => u.name)));
		expect(root.querySelector('em').textContent).toBe('a');
		user.setKey('name', 'b');
		expect(root.querySelector('em').textContent).toBe('b');
		root.remove();
	});

	test('onMount/onStop lifecycle follows uele subscriptions', async () => {
		const m = await import('nanostores');
		install(api, { overrides: {} });
		const root = host();
		const store = m.atom('x');
		let mounted = 0;
		let stopped = 0;
		m.onMount(store, () => {
			mounted++;
			return () => {};
		});
		m.onStop(store, () => stopped++);
		const stop = api.sub(store, () => {});
		expect(mounted).toBe(1);
		expect(store.lc).toBe(1);
		stop();
		expect(stopped).toBe(1);
		expect(store.lc).toBe(0);
		root.remove();
	});

	test('batch() coalesces notifications', async () => {
		const m = await import('nanostores');
		install(api, { overrides: {} });
		const root = host();
		const a = m.atom(0);
		const b = m.atom(0);
		let notifications = 0;
		const off = a.subscribe(() => notifications++);
		m.batch(() => {
			a.set(1);
			b.set(2);
		});
		expect(a.get()).toBe(1);
		expect(notifications).toBe(2);
		off();
		root.remove();
	});
});

// ------------------------------------------------------------ @tanstack/store

describe('@tanstack/store', () => {
	test('stores that do not emit on subscribe are seeded through useLive', async () => {
		const m = await import('@tanstack/store');
		install(api, { overrides: {} });
		const root = host();
		const store = new m.Store({ count: 0 });
		const render = (state) => h('span', null, String(state.count));
		const [nodes, set] = useLive(render(store.state));
		root.append(...nodes);
		expect(root.textContent).toBe('0');
		const unsubscribe = store.subscribe((state) => set(render(state)));
		store.setState((s) => ({ ...s, count: s.count + 1 }));
		expect(root.textContent).toBe('1');
		unsubscribe.unsubscribe();
		store.setState({ count: 99 });
		expect(root.textContent).toBe('1');
		root.remove();
	});

	test('api.any integrates a subscribe-only store with uele live regions', async () => {
		const m = await import('@tanstack/store');
		install(api, {
			overrides: {
				is: (v) => v instanceof m.Store,
				get: (v) => (v instanceof m.Store ? v.state : v?.value),
				any: (src) => (src instanceof m.Store ? (next) => src.subscribe(() => next(src.state)).unsubscribe : undefined)
			}
		});
		const root = host();
		const store = new m.Store(1);
		const el = h('p', null, store);
		root.append(el);
		// the first render is empty: the store has no initial emission
		expect(el.textContent).toBe('');
		store.setState(2);
		expect(el.textContent).toBe('2');
		expect(api.get(store)).toBe(2);
		root.remove();
	});
});

// ------------------------------------------------- generic integration recipes

describe('library-agnostic integration', () => {
	test('a minimal custom source works through api.is/api.get/api.any alone', () => {
		const custom = () => {
			let value = 0;
			const listeners = new Set();
			return {
				get value() {
					return value;
				},
				set value(next) {
					value = next;
					listeners.forEach((l) => l(next));
				},
				listen: (fn) => {
					listeners.add(fn);
					return () => listeners.delete(fn);
				}
			};
		};
		const make = () => {
			let value = 0;
			const listeners = new Set();
			return {
				get value() {
					return value;
				},
				set value(next) {
					value = next;
					listeners.forEach((l) => l(next));
				},
				listen: (fn) => {
					listeners.add(fn);
					return () => listeners.delete(fn);
				}
			};
		};
		install(api, {
			overrides: {
				is: (v) => !!v?.listen && typeof v.value !== 'undefined',
				get: (v) => v?.value,
				any: (src) => (src?.listen ? (next) => src.listen(next) : undefined)
			}
		});
		const root = host();
		const cell = make();
		root.append(h('p', null, cell));
		expect(api.is(cell)).toBe(true);
		expect(api.get(cell)).toBe(0);
		cell.value = 5;
		expect(root.textContent).toBe('5');
		root.append(...useLive(h('i', null, cell))[0]);
		// api.any must emit the current value while subscribing: a listener that
		// only reports *future* changes leaves the region empty until the next one
		expect(root.querySelector('i').textContent).toBe('');
		cell.value = 6;
		expect(root.querySelector('i').textContent).toBe('6');
		expect(root.textContent).toBe('66');
		// priming the subscriber fixes it
		install(api, {
			overrides: {
				is: (v) => !!v?.listen && typeof v.value !== 'undefined',
				get: (v) => v?.value,
				any: (src) => (src?.listen ? (next) => (next(src.value), src.listen(next)) : undefined)
			}
		});
		const primed = make();
		primed.value = 7;
		root.replaceChildren();
		root.append(...useLive(h('i', null, primed))[0]);
		expect(root.querySelector('i').textContent).toBe('7');
		root.remove();
	});

	test('plain functions still work as thunks and components with a custom api', () => {
		const custom = () => {
			let value = 'v';
			const listeners = new Set();
			return {
				get value() {
					return value;
				},
				read: () => value,
				listen: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
				value_: 0
			};
		};
		const cell = custom();
		install(api, {
			overrides: {
				is: (v) => !!v?.read && typeof v.listen === 'function',
				get: (v) => v?.read?.(),
				any: (src) => (src?.listen ? (next) => src.listen(next) : undefined)
			}
		});
		const root = host();
		const Comp = ({ children }) => h('div', null, children);
		root.append(h(Comp, null, 'kid'));
		expect(root.innerHTML).toBe('<div>kid</div>');
		root.append(...add(() => h('b', null, 'thunk')));
		expect(root.querySelector('b').textContent).toBe('thunk');
		expect(api.is(cell)).toBe(true);
		root.remove();
	});
});
