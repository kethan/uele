/**
 * Preset conformance: every shipped preset is driven exactly as documented -
 * one `use…()` call, then the library's own cell/list API straight through the
 * runtime. Switching presets must never leave a stale hook behind.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { api, add, h } from 'uele';
import { For } from 'uele/flow';
import { DEFAULT_API, DEFAULT_DIFF } from './helpers/signal-adapters.js';

const host = () => {
	const root = document.createElement('div');
	document.body.append(root);
	return root;
};

beforeEach(() => {
	Object.assign(api.engine, DEFAULT_API);
    Object.assign(api, DEFAULT_DIFF);
});
afterEach(() => {
	Object.assign(api.engine, DEFAULT_API);
    Object.assign(api, DEFAULT_DIFF);
	document.body.replaceChildren();
});

/* ---------------------------------------------------------------- presets */

describe('signal adapter presets', () => {
	test('signals/ulive: ulive()', async () => {
		const { ulive } = await import('../signals/ulive.js');
		const { signal } = await import('ulive');
		ulive();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('signals/preact: preactSignals()', async () => {
		const { preactSignals } = await import('../signals/preact.js');
		const { signal } = await import('@preact/signals-core');
		preactSignals();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('signals/vue: vue()', async () => {
		const { vue } = await import('../signals/vue.js');
		const { ref } = await import('@vue/reactivity');
		vue();
		const s = ref('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('signals/usignal: usignal()', async () => {
		const { usignal } = await import('../signals/usignal.js');
		const { signal } = await import('usignal');
		usignal();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('signals/alien-signals: alienSignals()', async () => {
		const { alienSignals } = await import('../signals/alien-signals.js');
		const { signal } = await import('alien-signals');
		alienSignals();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/sjs: sjs()', async () => {
		const { sjs } = await import('../signals/sjs.js');
		const S = (await import('s-js')).default;
		sjs();
		const s = S.data('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/mobx: mobx()', async () => {
		const { mobx } = await import('../signals/mobx.js');
		const m = await import('mobx');
		m.configure({ enforceActions: 'never', useProxies: 'never' }); // app policy, not part of the preset
		mobx();
		const s = m.observable.box('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.set('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/rxjs: rxjs()', async () => {
		const { rxjs } = await import('../signals/rxjs.js');
		const { BehaviorSubject } = await import('rxjs');
		rxjs();
		const s = new BehaviorSubject('a'); // replays the current value on subscribe
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.next('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/nanostores: nanostores()', async () => {
		const { nanostores } = await import('../signals/nanostores.js');
		const { atom } = await import('nanostores');
		nanostores();
		const s = atom('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		s.set('b'); // subscribe-path stores deliver on change
		expect(root.textContent).toBe('b');
	});

	test('signals/tanstack: tanstackStore()', async () => {
		const { tanstackStore } = await import('../signals/tanstack.js');
		const { Store } = await import('@tanstack/store');
		tanstackStore();
		const s = new Store('a'); // subscribe() does not emit synchronously: first content arrives on change
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('');
		s.setState('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/solid: solid() (client build)', async () => {
		const { solid } = await import('../signals/solid.js');
		const m = await import('solid-js/dist/solid.js');
		solid();
		const [read, write] = m.createSignal('a');
		const root = host();
		root.append(...add(h('p', null, read)));
		expect(root.textContent).toBe('a');
		write('b');
		expect(root.textContent).toBe('b');
	});

	test('signals/signals: signals()', async () => {
		const { signals } = await import('../signals/signals.js');
		const { signal } = await import('@webreflection/signals');
		signals();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('presets accept a target (lite) and clear stale hooks when switching', async () => {
		const { preactSignals } = await import('../signals/preact.js');
		const { rxjs } = await import('../signals/rxjs.js');
		const { api: liteApi } = await import('../lite/index.js');
		const { signal } = await import('@preact/signals-core');

		// rxjs wires api.any and leaves effect empty
		rxjs();
		expect(typeof api.any).toBe('function');
		// switching to an effect-based preset must not keep the subscribe hook
		preactSignals();
		expect(api.any).toBeUndefined();

		// the same call configures the lite core when given its api
		preactSignals(liteApi);
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});
});

/* ------------------------------------------------------------ diff presets */

const { builtinDiff } = await import('../diffs/builtin.js');
const { swapdom } = await import('../diffs/swapdom.js');
const { udomdiff } = await import('../diffs/udomdiff.js');
const { domdiff } = await import('../diffs/domdiff.js');
const { morphdom } = await import('../diffs/morphdom.js');
const { nanomorph } = await import('../diffs/nanomorph.js');
const { fastArrayDiff } = await import('../diffs/fast-array-diff.js');
const { rebuild } = await import('../diffs/rebuild.js');

describe('diff engine presets', () => {
	let ulive;
	beforeEach(async () => {
		const mod = await import('../signals/ulive.js');
		mod.ulive(); // the differ presets only touch api.diff
		ulive = await import('ulive');
	});

	const drive = (useDiff) => async () => {
		useDiff();
		const items = ulive.signal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
		const root = host();
		root.append(
			...add(
				For({
					each: items,
					key: (item) => item.id,
					children: [(item) => h('u', { 'data-id': item.id }, item.id)]
				})
			)
		);
		const ids = () => [...root.querySelectorAll('u')].map((n) => n.dataset.id).join('');
		expect(ids()).toBe('abc');
		items.value = [{ id: 'c' }, { id: 'a' }, { id: 'b' }, { id: 'd' }]; // reorder + grow
		expect(ids()).toBe('cabd');
		items.value = [{ id: 'd' }]; // shrink to a fresh row
		expect(ids()).toBe('d');
		items.value = []; // clear
		expect(ids()).toBe('');
	};

	test('diffs/builtin: builtinDiff() (marker walk)', drive(builtinDiff));
	test('diffs/swapdom: swapdom()', drive(swapdom));
	test('diffs/udomdiff: udomdiff()', drive(udomdiff));
	test('diffs/domdiff: domdiff()', drive(domdiff));
	test('diffs/morphdom: morphdom()', drive(morphdom));
	test('diffs/nanomorph: nanomorph()', drive(nanomorph));
	test('diffs/fast-array-diff: fastArrayDiff()', drive(fastArrayDiff));
	test('diffs/rebuild: rebuild()', drive(rebuild));

	test('switching diff presets swaps the engine and builtin resets it', async () => {
		swapdom();
		expect(typeof api.diff).toBe('function');
		udomdiff();
		expect(typeof api.diff).toBe('function');
		expect('udom' in api).toBe(false);
		builtinDiff();
		expect(api.diff).toBeUndefined();
	});
});
