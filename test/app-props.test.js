import { afterEach, describe, expect, test, vi } from 'vitest';
import * as main from '../src/index.js';
import * as lite from '../lite/index.js';
import { appProps } from '../props/index.js';
import { signal, effect } from 'ulive';

for (const [label, target] of [['main', main], ['lite', lite]]) {
	describe(`app props: ${label}`, () => {
		const original = new Map(target.props);
		Object.assign(target.api.engine, { effect, is: (value) => value?.peek, get: (value) => value.value });
		afterEach(() => {
			target.props.clear();
			original.forEach((value, key) => target.props.set(key, value));
			document.body.replaceChildren();
		});
		const setup = () => { expect(appProps(target)).toBe(target); return target.h; };
		test('show toggles hidden, text is safe and handles null', () => {
			const h = setup(), visible = signal(true), text = signal('<b>hello</b>');
			const el = h('p', { show: visible, text });
			expect(el.hidden).toBe(false);
			expect(el.querySelector('b')).toBeNull();
			expect(el.textContent).toBe('<b>hello</b>');
			visible.value = false; text.value = null;
			expect(el.hidden).toBe(true); expect(el.textContent).toBe('');
			visible.value = true; text.value = 0;
			expect(el.hidden).toBe(false); expect(el.textContent).toBe('0');
		});
		test('data and aria retain false/zero and remove null attributes', () => {
			const h = setup(), status = signal('online'), busy = signal(false);
			const el = h('div', { data: { userId: 0, status }, aria: { busy, label: 'Chat' } });
			expect(el.dataset.userId).toBe('0'); expect(el.dataset.status).toBe('online');
			expect(el.getAttribute('aria-busy')).toBe('false');
			busy.value = true; status.value = null;
			expect(el.getAttribute('aria-busy')).toBe('true'); expect(el.hasAttribute('data-status')).toBe(false);
		});
		test('value binds in both directions and suppresses composing input', () => {
			const h = setup(), value = signal('draft');
			const write = vi.fn((next) => { value.value = next; });
			const el = h('input', { bindValue: [value, write] });
			expect(el.value).toBe('draft');
			value.value = 'server'; expect(el.value).toBe('server');
			el.value = 'typing'; el.dispatchEvent(new InputEvent('input', { isComposing: true }));
			expect(write).not.toHaveBeenCalled();
			el.dispatchEvent(new InputEvent('input'));
			expect(value.value).toBe('typing');
			value.value = null; expect(el.value).toBe('');
		});
		test('checkbox binds checked, not its string value', () => {
			const h = setup(), checked = signal(false);
			const el = h('input', { type: 'checkbox', bindChecked: [checked, (v) => { checked.value = v; }] });
			checked.value = true; expect(el.checked).toBe(true);
			el.checked = false; el.dispatchEvent(new Event('change'));
			expect(checked.value).toBe(false);
		});
		test('listen supports case-sensitive custom events, once and object listeners', () => {
			const h = setup(), callback = vi.fn(), object = { handleEvent: vi.fn() };
			const el = h('div', { listen: { messageReady: [callback, { once: true }], ping: object } });
			el.dispatchEvent(new Event('messageReady')); el.dispatchEvent(new Event('messageReady'));
			el.dispatchEvent(new Event('ping'));
			expect(callback).toHaveBeenCalledTimes(1); expect(object.handleEvent).toHaveBeenCalledTimes(1);
		});
		test('region removal disposes subscriptions, listeners and actions exactly once', () => {
			const h = setup(), text = signal('start'), status = signal('online'), value = signal('draft');
			const cleanup = vi.fn(), event = vi.fn(), write = vi.fn();
			const el = h('input', { data: { status }, bindValue: [value, write], listen: { ping: [event, true] }, use: [() => cleanup, () => {}] });
			const leaf = h('p', { text });
			const [nodes, set] = target.useLive([el, leaf]);
			const host = document.createElement('div'); host.append(...nodes); document.body.append(host);
			set([]); set([]);
			expect(cleanup).toHaveBeenCalledTimes(1);
			text.value = 'later'; status.value = 'offline'; value.value = 'new';
			expect(leaf.textContent).toBe('start'); expect(el.dataset.status).toBe('online'); expect(el.value).toBe('draft');
			el.dispatchEvent(new Event('ping')); el.dispatchEvent(new Event('input'));
			expect(event).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
		});
		test('surviving nodes keep actions until actually removed', () => {
			const h = setup(), cleanup = vi.fn();
			const el = h('div', { use: () => cleanup });
			const [nodes, set] = target.useLive([el]);
			const host = document.createElement('div'); host.append(...nodes);
			set([el]); expect(cleanup).not.toHaveBeenCalled();
			set([]); expect(cleanup).toHaveBeenCalledTimes(1);
		});
	});
}
