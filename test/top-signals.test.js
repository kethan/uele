import { afterEach, describe, expect, test } from 'vitest';
import * as main from '../src/index.js';
import * as lite from '../lite/index.js';
import { HOOKS } from '../signals/internal.js';

const entries = [
	['reflex', 'reflex'], ['reactively', 'reactively'], ['anod', 'anod'],
	['lite-signal', 'liteSignal'], ['rescript-signals', 'rescriptSignals'],
	['maverick', 'maverick'], ['oby', 'oby']
];
for (const [slug, hook] of entries) {
	const { [hook]: install } = await import(`../signals/${slug}.js`);
	for (const [label, mod] of [['main', main], ['lite', lite]]) {
		describe(`${slug}: ${label} authoring and lifecycle`, () => {
			const original = { ...mod.api };
			afterEach(() => { Object.assign(mod.api, HOOKS, original); document.body.replaceChildren(); });
			const setup = () => install(mod.api);
			test('complete hooks replace stale configuration and preserve unrelated fields', () => {
				const target = { any: () => {}, untracked: () => {}, custom: 123 };
				expect(install(target)).toBe(target);
				for (const name of Object.keys(HOOKS)) expect(name in target).toBe(true);
				expect(target.any).toBeUndefined(); expect(target.custom).toBe(123);
			});
			test('dynamic computed chains follow only the active branch', () => {
				const api = setup(), first = api.signal(1), second = api.signal(10), toggle = api.signal(true);
				const selected = api.computed(() => api.get(api.get(toggle) ? first : second));
				const doubled = api.computed(() => api.get(selected) * 2);
				const el = mod.h('p', null, doubled);
				expect(el.textContent).toBe('2');
				api.set(toggle, false); expect(el.textContent).toBe('20');
				api.set(first, 99); expect(el.textContent).toBe('20');
				api.set(second, 12); expect(el.textContent).toBe('24');
			});
			test('nested batch returns its result, commits writes and recovers from errors', () => {
				const api = setup(), cell = api.signal(0), el = mod.h('p', null, cell);
				expect(api.batch(() => { api.set(cell, 1); return api.batch(() => { api.set(cell, 2); return 42; }); })).toBe(42);
				expect(el.textContent).toBe('2');
				expect(() => api.batch(() => { throw new Error('test'); })).toThrow('test');
				api.set(cell, 3); expect(el.textContent).toBe('3');
			});
			test('untracked hook excludes dependency when offered', () => {
				const api = setup(), a = api.signal(1), b = api.signal(10);
				if (!api.untracked) { expect(['reactively', 'rescript-signals']).toContain(slug); return; }
				let runs = 0;
				const stop = api.effect(() => { runs++; api.get(a); api.untracked(() => api.get(b)); });
				api.set(b, 11); expect(runs).toBe(1);
				api.set(a, 2); expect(runs).toBe(2);
				stop(); api.set(a, 3); expect(runs).toBe(2);
			});
			test('region removal stops nested attributes and text effects', () => {
				const api = setup(), cell = api.signal('a');
				const child = mod.h('input', { value: cell });
				const text = mod.h('p', null, cell);
				const [nodes, set] = mod.useLive([mod.h('div', null, child, text)]);
				const host = document.createElement('div'); host.append(...nodes); document.body.append(host);
				api.set(cell, 'b'); expect(child.value).toBe('b'); expect(text.textContent).toBe('b');
				set([]); api.set(cell, 'c');
				expect(child.value).toBe('b'); expect(text.textContent).toBe('b');
			});
			test('subscription cleanup runs exactly once on disposal', () => {
				const api = setup(), cell = api.signal(0); let cleaned = 0;
				const stop = mod.sub(cell, () => {}, undefined, () => { cleaned++; });
				stop(); expect(cleaned).toBe(1);
			});
		});
	}
}

test('Anod computed errors propagate and a later read recovers', async () => {
	const { anod } = await import('../signals/anod.js');
	const api = anod({});
	const fail = api.signal(true);
	const error = new Error('computed failed');
	const computed = api.computed(() => {
		if (api.get(fail)) throw error;
		return 42;
	});
	// Anod exposes structured Err records, not the original exception alone.
	let thrown;
	try { api.get(computed); } catch (value) { thrown = value; }
	expect(thrown).toMatchObject({ error });
	api.set(fail, false);
	expect(api.get(computed)).toBe(42);
	// The throwing computation must not leave its tracking context active.
	const other = api.signal(7);
	expect(api.get(other)).toBe(7);
});
