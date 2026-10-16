/**
 * Preset conformance: every shipped preset is driven exactly as documented -
 * one `use…()` call, then the library's own cell/list API straight through the
 * runtime. Switching presets must never leave a stale hook behind.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { api, add, h, For } from 'uele';
import { DEFAULT_API, DEFAULT_DIFF } from './helpers/signal-adapters.js';

const host = () => {
	const root = document.createElement('div');
	document.body.append(root);
	return root;
};

beforeEach(() => {
	Object.assign(api, DEFAULT_API, DEFAULT_DIFF);
});
afterEach(() => {
	Object.assign(api, DEFAULT_API, DEFAULT_DIFF);
	document.body.replaceChildren();
});

/* ---------------------------------------------------------------- presets */

describe('signal adapter presets', () => {
	test('adapters/ulive: useUlive()', async () => {
		const { useUlive } = await import('../adapters/ulive.js');
		const { signal } = await import('ulive');
		useUlive();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('adapters/preact: usePreactSignals()', async () => {
		const { usePreactSignals } = await import('../adapters/preact.js');
		const { signal } = await import('@preact/signals-core');
		usePreactSignals();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('adapters/vue: useVue()', async () => {
		const { useVue } = await import('../adapters/vue.js');
		const { ref } = await import('@vue/reactivity');
		useVue();
		const s = ref('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('adapters/usignal: useUsignal()', async () => {
		const { useUsignal } = await import('../adapters/usignal.js');
		const { signal } = await import('usignal');
		useUsignal();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});

	test('adapters/alien-signals: useAlienSignals()', async () => {
		const { useAlienSignals } = await import('../adapters/alien-signals.js');
		const { signal } = await import('alien-signals');
		useAlienSignals();
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s('b');
		expect(root.textContent).toBe('b');
	});

	test('adapters/sjs: useSjs()', async () => {
		const { useSjs } = await import('../adapters/sjs.js');
		const S = (await import('s-js')).default;
		useSjs();
		const s = S.data('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s('b');
		expect(root.textContent).toBe('b');
	});

	test('adapters/mobx: useMobx()', async () => {
		const { useMobx } = await import('../adapters/mobx.js');
		const m = await import('mobx');
		m.configure({ enforceActions: 'never', useProxies: 'never' }); // app policy, not part of the preset
		useMobx();
		const s = m.observable.box('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.set('b');
		expect(root.textContent).toBe('b');
	});

	test('adapters/rxjs: useRxjs()', async () => {
		const { useRxjs } = await import('../adapters/rxjs.js');
		const { BehaviorSubject } = await import('rxjs');
		useRxjs();
		const s = new BehaviorSubject('a'); // replays the current value on subscribe
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.next('b');
		expect(root.textContent).toBe('b');
	});

	test('adapters/nanostores: useNanostores()', async () => {
		const { useNanostores } = await import('../adapters/nanostores.js');
		const { atom } = await import('nanostores');
		useNanostores();
		const s = atom('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		s.set('b'); // subscribe-path stores deliver on change
		expect(root.textContent).toBe('b');
	});

	test('adapters/tanstack: useTanstackStore()', async () => {
		const { useTanstackStore } = await import('../adapters/tanstack.js');
		const { Store } = await import('@tanstack/store');
		useTanstackStore();
		const s = new Store('a'); // subscribe() does not emit synchronously: first content arrives on change
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('');
		s.setState('b');
		expect(root.textContent).toBe('b');
	});

	test('adapters/solid: useSolid() (client build)', async () => {
		const { useSolid } = await import('../adapters/solid.js');
		const m = await import('solid-js/dist/solid.js');
		useSolid();
		const [read, write] = m.createSignal('a');
		const root = host();
		root.append(...add(h('p', null, read)));
		expect(root.textContent).toBe('a');
		write('b');
		expect(root.textContent).toBe('b');
	});

	test('presets accept a target (lite) and clear stale hooks when switching', async () => {
		const { usePreactSignals } = await import('../adapters/preact.js');
		const { useRxjs } = await import('../adapters/rxjs.js');
		const { api: liteApi } = await import('../lite/index.js');
		const { signal } = await import('@preact/signals-core');

		// rxjs wires api.any and leaves effect empty
		useRxjs();
		expect(typeof api.any).toBe('function');
		// switching to an effect-based preset must not keep the subscribe hook
		usePreactSignals();
		expect(api.any).toBeUndefined();

		// the same call configures the lite core when given its api
		usePreactSignals(liteApi);
		const s = signal('a');
		const root = host();
		root.append(...add(h('p', null, s)));
		expect(root.textContent).toBe('a');
		s.value = 'b';
		expect(root.textContent).toBe('b');
	});
});

/* ------------------------------------------------------------ diff presets */

const { useBuiltinDiff } = await import('../diffs/builtin.js');
const { useSwapdom } = await import('../diffs/swapdom.js');
const { useUdomdiff } = await import('../diffs/udomdiff.js');
const { useDomdiff } = await import('../diffs/domdiff.js');
const { useMorphdom } = await import('../diffs/morphdom.js');
const { useNanomorph } = await import('../diffs/nanomorph.js');
const { useFastArrayDiff } = await import('../diffs/fast-array-diff.js');
const { useRebuild } = await import('../diffs/rebuild.js');

describe('diff engine presets', () => {
	let ulive;
	beforeEach(async () => {
		const mod = await import('../adapters/ulive.js');
		mod.useUlive(); // the differ presets only touch api.diff/api.udom
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

	test('diffs/builtin: useBuiltinDiff() (marker walk)', drive(useBuiltinDiff));
	test('diffs/swapdom: useSwapdom()', drive(useSwapdom));
	test('diffs/udomdiff: useUdomdiff()', drive(useUdomdiff));
	test('diffs/domdiff: useDomdiff()', drive(useDomdiff));
	test('diffs/morphdom: useMorphdom()', drive(useMorphdom));
	test('diffs/nanomorph: useNanomorph()', drive(useNanomorph));
	test('diffs/fast-array-diff: useFastArrayDiff()', drive(useFastArrayDiff));
	test('diffs/rebuild: useRebuild()', drive(useRebuild));

	test('switching diff presets swaps the engine and builtin resets it', async () => {
		useSwapdom();
		expect(typeof api.diff).toBe('function');
		expect(api.udom).toBeUndefined();
		useUdomdiff();
		expect(typeof api.diff).toBe('function');
		expect(typeof api.udom).toBe('function');
		useBuiltinDiff();
		expect(api.diff).toBeUndefined();
		expect(api.udom).toBeUndefined();
	});
});
