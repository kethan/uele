import { afterEach, describe, expect, test, vi } from 'vitest';
import * as main from '../src/index.js';
import * as lite from '../lite/index.js';
import { appProps, autoScroll } from '../props/index.js';
import { signal, effect } from 'ulive';

for (const [label, target] of [['main', main], ['lite', lite]]) {
	describe(`extended props: ${label}`, () => {
		const original = new Map(target.props);
		afterEach(() => {
			target.props.clear(); original.forEach((v, k) => target.props.set(k, v));
			document.body.replaceChildren();
		});
		const setup = () => {
			Object.assign(target.api.engine, { effect, is: (value) => value?.peek, get: (value) => value.value });
			appProps(target); return target.h;
		};
		test('single select updates source and DOM, including empty and missing values', () => {
			const h = setup(), value = signal('b');
			const el = h('select', { bindSelect: [value, (v) => { value.value = v; }] },
				h('option', { value: '' }, 'None'), h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B'));
			expect(el.value).toBe('b');
			value.value = 'a'; expect(el.selectedIndex).toBe(1);
			el.value = 'b'; el.dispatchEvent(new Event('change')); expect(value.value).toBe('b');
			value.value = null; expect(el.value).toBe(''); expect(el.selectedIndex).toBe(0);
			value.value = 'missing'; expect(el.selectedIndex).toBe(-1);
		});
		test('multiple select writes ordered string arrays and clears selection', () => {
			const h = setup(), value = signal([2, 'a']);
			const el = h('select', { bindSelect: [value, (v) => { value.value = v; }], multiple: true },
				...['a', '2', 'c'].map((v) => h('option', { value: v }, v)));
			expect([...el.selectedOptions].map((o) => o.value)).toEqual(['a', '2']);
			el.options[0].selected = false; el.options[2].selected = true;
			el.dispatchEvent(new Event('change')); expect(value.value).toEqual(['2', 'c']);
			value.value = []; expect(el.selectedOptions.length).toBe(0);
		});
		test('select and indeterminate bindings dispose on ancestor removal', () => {
			const h = setup(), value = signal('a'), mixed = signal(true), write = vi.fn();
			const select = h('select', { bindSelect: [value, write] }, h('option', { value: 'a' }), h('option', { value: 'b' }));
			const checkbox = h('input', { type: 'checkbox', indeterminate: mixed });
			expect(checkbox.indeterminate).toBe(true); mixed.value = false; expect(checkbox.indeterminate).toBe(false);
			const [nodes, set] = target.useLive([h('div', null, select, checkbox)]);
			const host = document.createElement('div'); host.append(...nodes);
			set([]); value.value = 'b'; mixed.value = true;
			expect(select.value).toBe('a'); expect(checkbox.indeterminate).toBe(false);
			select.dispatchEvent(new Event('change')); expect(write).not.toHaveBeenCalled();
		});
	});
}

const viewport = () => {
	const node = document.createElement('div');
	let height = 500;
	Object.defineProperties(node, { scrollHeight: { get: () => height }, clientHeight: { value: 100 } });
	return { node, grow: () => { height += 100; node.append(document.createTextNode('message')); } };
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

afterEach(() => vi.unstubAllGlobals());
test('autoScroll follows new messages, pauses while reading, resumes near bottom', async () => {
	const { node, grow } = viewport(); const dispose = autoScroll({ threshold: 20 })(node);
	await flush(); expect(node.scrollTop).toBe(500);
	node.scrollTop = 100; node.dispatchEvent(new Event('scroll')); grow();
	await flush(); expect(node.scrollTop).toBe(100);
	node.scrollTop = 490; node.dispatchEvent(new Event('scroll')); grow();
	await flush(); expect(node.scrollTop).toBe(700);
	dispose(); grow(); await flush(); expect(node.scrollTop).toBe(700);
});
test('autoScroll cancels queued work and disconnects resize observer', async () => {
	const disconnect = vi.fn(), observe = vi.fn();
	vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
	const { node } = viewport(); const dispose = autoScroll()(node);
	expect(observe).toHaveBeenCalledWith(node);
	dispose(); await flush(); expect(node.scrollTop).toBe(0); expect(disconnect).toHaveBeenCalledOnce();
});
test('autoScroll validates threshold', () => {
	for (const threshold of [-1, Infinity, NaN]) expect(() => autoScroll({ threshold })(document.createElement('div'))).toThrow(RangeError);
});
