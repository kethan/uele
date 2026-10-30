/**
 * The lite entry point: same h/add/useLive/props/api core without control flow components.
 * @vitest-environment jsdom
 */
import { expect, test } from 'vitest';
import * as lite from '../lite/index.js';
import { signal, effect } from 'ulive';

const { h, add, api, r, props, useLive } = lite;

api.engine.effect = effect;
api.engine.is = (v) => v?.peek;
api.engine.get = (v) => v.value;

const mount = (...nodes) => {
	const root = document.createElement('div');
	root.append(...add(...nodes));
	return root;
};

test('lite exports the core api only', () => {
	// `default`/`__esModule` are namespace-view artifacts of importing the CJS build
	const keys = Object.keys(lite).filter((k) => k !== 'default' && k !== '__esModule').sort();
	expect(keys).toEqual(['add', 'api', 'h', 'props', 'r', 'useLive']);
});

test('lite creates elements, attributes and children', () => {
	expect(h('div', { id: 'a' }, 'x').outerHTML).toBe('<div id="a">x</div>');
	expect(h('div', null, ['a', ['b']]).textContent).toBe('ab');
});

test('lite skips attributes that cannot be properties on svg elements', () => {
	const svg = h('svg', { width: 100 }, h('circle', { cx: 5 }));
	expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
	expect(svg.getAttribute('width')).toBe('100');
	expect(svg.firstChild.getAttribute('cx')).toBe('5');
});

test('lite keeps custom elements out of the svg/mathml namespaces', () => {
	expect(h('my-icon').namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	expect(h('image').namespaceURI).toBe('http://www.w3.org/2000/svg');
	expect(h('maligngroup').namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
});

test('lite binds native and custom events', () => {
	let clicks = 0;
	let custom = 0;
	const el = h('button', { onclick: () => clicks++, onmyevt: () => custom++ });
	el.click();
	el.dispatchEvent(new Event('myevt'));
	expect([clicks, custom]).toEqual([1, 1]);
});

test('lite applies styles, class maps and refs', () => {
	const active = signal(false);
	let ref;
	const el = h('div', { style: { color: 'red' }, class: { active }, ref: (n) => (ref = n) });
	expect(el.style.color).toBe('red');
	expect(el.classList.contains('active')).toBe(false);
	active.value = true;
	expect(el.classList.contains('active')).toBe(true);
	expect(ref).toBe(el);
});

test('lite property values are emptied when null/undefined', () => {
	const input = h('input', { value: undefined, placeholder: null });
	expect(input.value).toBe('');
	expect(input.placeholder).toBe('');
});

test('lite supports custom props handlers', () => {
	props.set('uppercase', (el, value) => r(value, (v) => (el.style.textTransform = v ? 'uppercase' : '')));
	const el = h('div', { uppercase: true });
	expect(el.style.textTransform).toBe('uppercase');
	props.delete('uppercase');
});

test('lite renders reactive children and live regions', () => {
	const count = signal(0);
	const [live, setLive] = useLive(count);
	const root = mount(h('div', null, live));
	expect(root.textContent).toBe('0');
	count.value = 1;
	expect(root.textContent).toBe('1');
	setLive(5);
	expect(root.textContent).toBe('5');
	setLive((n) => String(Number(n) + 1));
	expect(root.textContent).toBe('6');
});

test('lite leaves a detached region inert instead of writing to it', () => {
	const [live, setLive] = useLive('a');
	const root = mount(h('div', null, live));
	expect(root.textContent).toBe('a');
	// the start marker is gone, so the span cannot be located: the update is a no-op,
	// not a write into a parent the markers are no longer part of
	root.firstChild.firstChild.remove();
	expect(() => setLive('b')).not.toThrow();
	expect(root.textContent).toBe('a');
});

test('lite handles primitive children like the main entry', () => {
	expect(h('div', null, true, null, undefined, 1n, Symbol('s')).innerHTML)
		.toBe('<!--true--><!--null--><!--undefined-->1Symbol(s)');
});

test('lite add handles promises, functions and signals', async () => {
	const count = signal('a');
	const root = mount(add('start', count, () => 'fn', Promise.resolve('p')));
	expect(root.textContent).toBe('startafn');
	await new Promise((r) => setImmediate(r));
	expect(root.textContent).toBe('startafnp');
	count.value = 'A';
	expect(root.textContent).toBe('startAfnp');
});

test('lite r/is/get delegate to the api object', () => {
	expect(api.is(count => count)).toBe(true);
	const value = signal(2);
	expect(api.get(value)).toBe(2);
	const seen = [];
	r(value, (v, reactive) => seen.push([v, reactive]));
	expect(seen).toEqual([[2, true]]);
	// non reactive values are passed straight through (and r() returns the callback result)
	r(3, (v, reactive) => seen.push([v, reactive]));
	expect(seen).toEqual([[2, true], [3, false]]);
});

test('lite uses api.diff when configured', () => {
	const calls = [];
	api.diff = (parent, a, b, end) => calls.push([parent.nodeName, a.length, b.length, end]);
	const items = signal([1]);
	const root = mount(h('div', null, items));
	expect(items.value).toEqual([1]);
	items.value = [1, 2];
	expect(calls.length).toBe(1);
	expect(calls[0][1]).toBe(1);
	expect(calls[0][2]).toBe(2);
	delete api.diff;
});

test('lite style objects handle camelCase and custom properties', () => {
	const el = h('div', { style: { color: 'red', '--x': '1px', '--gone': undefined } });
	expect(el.style.color).toBe('red');
	expect(el.style.getPropertyValue('--x')).toBe('1px');
	expect(el.style.getPropertyValue('--gone')).toBe('');
});

test('lite renders function components with props and children', () => {
	const Comp = ({ id, children }) => h('div', { id }, children);
	expect(h(Comp, { id: 'c' }, 'kid').outerHTML).toBe('<div id="c">kid</div>');
});

test('lite sub subscribes to signals and unsubscribes', () => {
	const value = signal(1);
	const seen = [];
	const off = api.sub(value, (v) => seen.push(v));
	value.value = 2;
	off();
	value.value = 3;
	expect(seen).toEqual([1, 2]);
});

test('lite fragments return children', () => {
	expect(h(h, null, 'a', 'b')).toEqual(['a', 'b']);
	expect(mount(h(h, null, h('i', null, '1'))).innerHTML).toBe('<i>1</i>');
});

test('lite treats a node passed as props as a child', () => {
	const child = document.createElement('span');
	expect(h('div', child, 'x').outerHTML).toBe('<div><span></span>x</div>');
});

test('lite maps className and removes attributes for null/false/true', () => {
	const el = h('div', { className: 'c', 'data-a': null, 'data-b': false, 'data-c': true });
	expect(el.className).toBe('c');
	expect(el.hasAttribute('data-a')).toBe(false);
	expect(el.hasAttribute('data-b')).toBe(false);
	expect(el.getAttribute('data-c')).toBe('');
	expect(h(undefined)).toBe(undefined);
	expect(h(1)).toBe(undefined);
});

test('lite reactive style values are cleared when null', () => {
	const color = signal('red');
	const el = h('div', { style: { color, '--x': '1px' } });
	expect(el.style.color).toBe('red');
	color.value = null;
	expect(el.style.color).toBe('');
	expect(el.style.getPropertyValue('--x')).toBe('1px');
});

test('lite calls api.diff with exactly four arguments', () => {
	const args = [];
	api.diff = (...a) => args.push(a);
	const items = signal([1]);
	mount(h('div', null, items));
	items.value = [1, 2];
	expect(args[0]).toHaveLength(4);
	expect(args[0][3]).toBeInstanceOf(Node);
	delete api.diff;
});

test('lite swallows rejected promises instead of throwing', async () => {
	const root = mount(h('div', null, Promise.reject(new Error('boom'))));
	await new Promise((r) => setImmediate(r));
	expect(root.textContent).toBe('');
});

test('lite does not subscribe to subscribe() observables (tiny usub)', () => {
	const root = mount(h('div', null, { subscribe: () => {} }));
	expect(root.textContent).toBe('[object Object]');
});

test('lite disposes bindings of discarded elements', () => {
	const cell = signal('a');
	const show = signal(true);
	let el = null;
	const root = mount(() => (show.value ? (el = h('div', { title: cell, 'data-x': cell, style: { width: cell } }, 'x')) : 'gone'));
	expect(el.title).toBe('a');
	show.value = false; // the region discards the element and its bindings
	cell.value = 'b';
	expect(el.title).toBe('a');
	expect(el.getAttribute('data-x')).toBe('a');
});
