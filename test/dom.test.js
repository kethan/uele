/**
 * Attributes, styles, classes, events, refs, namespaces and custom props.
 * @vitest-environment jsdom
 */
import { expect, test, beforeEach } from 'vitest';
import { h, r, api, props, f } from '../src/index.js';
import { signal, effect } from 'ulive';

api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const SVG = 'http://www.w3.org/2000/svg';
const MATH = 'http://www.w3.org/1998/Math/MathML';

// ---------------------------------------------------------------- attributes

test('className is mapped to the class attribute', () => {
	expect(h('div', { className: 'a b' }).getAttribute('class')).toBe('a b');
});

test('null/false remove an attribute, true sets an empty one', () => {
	const el = h('div', { 'aria-hidden': true, hidden: false, 'data-x': null, 'data-y': undefined });
	expect(el.hasAttribute('aria-hidden')).toBe(true);
	expect(el.getAttribute('aria-hidden')).toBe('');
	expect(el.hasAttribute('data-x')).toBe(false);
	expect(el.hasAttribute('data-y')).toBe(false);
	expect(el.hasAttribute('hidden')).toBe(false);
});

test('numbers and data/aria attributes are stringified', () => {
	const el = h('div', { 'data-value': 5, 'aria-level': 0, tabindex: 3 });
	expect(el.getAttribute('data-value')).toBe('5');
	expect(el.getAttribute('aria-level')).toBe('0');
	expect(el.getAttribute('tabindex')).toBe('3');
});

test('reactive attributes update, including removal', () => {
	const label = signal('a');
	const el = h('div', { 'aria-label': label });
	expect(el.getAttribute('aria-label')).toBe('a');
	label.value = 'b';
	expect(el.getAttribute('aria-label')).toBe('b');
	label.value = null;
	expect(el.hasAttribute('aria-label')).toBe(false);
	label.value = false;
	expect(el.hasAttribute('aria-label')).toBe(false);
	label.value = 'c';
	expect(el.getAttribute('aria-label')).toBe('c');
});

test('known properties go through the element property, not the attribute', () => {
	const input = h('input', { type: 'checkbox', checked: true, value: 'x' });
	expect(input.checked).toBe(true);
	expect(input.value).toBe('x');
	// `checked` is a dirty flag, `value` reflects to the attribute
	expect(input.hasAttribute('checked')).toBe(false);
	expect(input.getAttribute('value')).toBe('x');
});

test('reactive properties update the property', () => {
	const disabled = signal(false);
	const button = h('button', { disabled });
	expect(button.disabled).toBe(false);
	disabled.value = true;
	expect(button.disabled).toBe(true);
});

test('textContent/innerHTML props are applied as properties', () => {
	expect(h('div', { textContent: 'text' }).outerHTML).toBe('<div>text</div>');
	expect(h('div', { innerHTML: '<b>b</b>' }).outerHTML).toBe('<div><b>b</b></div>');
});

test('a node passed as props is treated as a child', () => {
	const child = document.createElement('span');
	expect(h('div', child).outerHTML).toBe('<div><span></span></div>');
	expect(h('div', child, 'x').outerHTML).toBe('<div><span></span>x</div>');
	expect(h('div', [child]).outerHTML).toBe('<div><span></span></div>');
});

// -------------------------------------------------------------------- styles

test('style objects support camelCase, kebab-case and custom properties', () => {
	const el = h('div', { style: { backgroundColor: 'red', 'border-top-width': '1px', '--my-var': '2px' } });
	expect(el.style.backgroundColor).toBe('red');
	expect(el.style.getPropertyValue('border-top-width')).toBe('1px');
	expect(el.style.getPropertyValue('--my-var')).toBe('2px');
});

test('style string is assigned as cssText', () => {
	expect(h('div', { style: 'color: red' }).style.color).toBe('red');
});

test('style values null/undefined clear, reactive values update', () => {
	const color = signal('red');
	const el = h('div', { style: { color, opacity: null, zIndex: undefined } });
	expect(el.style.color).toBe('red');
	expect(el.style.opacity).toBe('');
	color.value = null;
	expect(el.style.color).toBe('');
	color.value = 'blue';
	expect(el.style.color).toBe('blue');
});

test('custom style properties use setProperty, null/undefined removes them', () => {
	const el = h('div', { style: { '--set': 'x', '--gone': undefined, '--null': null } });
	expect(el.style.getPropertyValue('--set')).toBe('x');
	expect(el.style.getPropertyValue('--gone')).toBe('');
	expect(el.style.getPropertyValue('--null')).toBe('');
});

// ------------------------------------------------------------------- classes

test('class maps toggle on reactive values', () => {
	const active = signal(false);
	const el = h('div', { class: { active, off: true } });
	expect(el.classList.contains('active')).toBe(false);
	expect(el.classList.contains('off')).toBe(true);
	active.value = true;
	expect(el.classList.contains('active')).toBe(true);
	active.value = 0;
	expect(el.classList.contains('active')).toBe(false);
});

test('class accepts strings, arrays and signals', () => {
	expect(h('div', { class: 'a b' }).className).toBe('a b');
	expect(h('div', { class: ['a', 'b'] }).getAttribute('class')).toBe('a,b');
	const cls = signal('x');
	const el = h('div', { class: cls });
	expect(el.className).toBe('x');
	cls.value = 'y';
	expect(el.className).toBe('y');
});

// -------------------------------------------------------------------- events

test('native handlers are assigned as properties', () => {
	let clicks = 0;
	const button = h('button', { onclick: () => clicks++ });
	button.click();
	expect(clicks).toBe(1);
	expect(typeof button.onclick).toBe('function');
});

test('onX casing is normalised for native handlers', () => {
	let clicks = 0;
	const button = h('button', { onClick: () => clicks++ });
	button.click();
	expect(clicks).toBe(1);
});

test('a falsy handler unregisters a native one', () => {
	let clicks = 0;
	const button = h('button', { onclick: () => clicks++ });
	button.click();
	button.onclick = false;
	button.click();
	expect(clicks).toBe(1);
});

test('custom events are bound with addEventListener', () => {
	let hits = 0;
	const el = h('div', { onmyevt: () => hits++, onOther: () => hits++ });
	el.dispatchEvent(new Event('myevt'));
	el.dispatchEvent(new Event('other'));
	expect(hits).toBe(2);
});

test('non-function values for custom events are ignored', () => {
	expect(() => h('div', { onmyevt: 1 })).not.toThrow();
});

// ----------------------------------------------------------------------- refs

test('ref receives the element and props object', () => {
	let node, attrs;
	const el = h('div', { id: 'r', ref: (n, a) => ((node = n), (attrs = a)) });
	expect(node).toBe(el);
	expect(attrs.id).toBe('r');
});

test('non-function refs are ignored', () => {
	expect(() => h('div', { ref: 'no' })).not.toThrow();
});

// ---------------------------------------------------------------- custom props

test('props handlers take over attributes and can be removed', () => {
	props.set('id', (el, value) => (el.id = 'custom-' + value));
	expect(h('div', { id: 'x' }).id).toBe('custom-x');
	props.delete('id');
	expect(h('div', { id: 'x' }).id).toBe('x');
});

test('props handlers receive name and attrs and may subscribe reactively', () => {
	const upper = signal(true);
	props.set('uppercase', (el, value) => r(value, (v) => (el.style.textTransform = v ? 'uppercase' : '')));
	const el = h('div', { uppercase: upper });
	expect(el.style.textTransform).toBe('uppercase');
	upper.value = false;
	expect(el.style.textTransform).toBe('');
	props.delete('uppercase');
});

test('props can define custom event attributes', () => {
	let hits = 0;
	props.set('onCustom', (el, fn) => el.addEventListener('custom', fn));
	// custom props are consulted after the on* branch, so use a non-handler name
	props.set('custom-on', (el, fn) => el.addEventListener('custom', fn));
	const el = h('div', { 'custom-on': () => hits++ });
	el.dispatchEvent(new Event('custom'));
	expect(hits).toBe(1);
	props.delete('custom-on');
	props.delete('onCustom');
});

// ---------------------------------------------------------------- namespaces

test('svg elements and their attributes use the svg namespace', () => {
	const svg = h('svg', { width: 100, height: 100, viewBox: '0 0 10 10' }, h('circle', { cx: 5, cy: 5, r: 4 }));
	expect(svg.namespaceURI).toBe(SVG);
	expect(svg.getAttribute('width')).toBe('100');
	expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
	const circle = svg.firstChild;
	expect(circle.namespaceURI).toBe(SVG);
	expect(circle.getAttribute('cx')).toBe('5');
	expect(circle.tagName).toBe('circle');
});

test('svg props never hit readonly properties', () => {
	// SVGSVGElement.width is an SVGAnimatedLength - assigning it would throw/do nothing in a browser
	const svg = h('svg', { width: signal(50) });
	expect(svg.getAttribute('width')).toBe('50');
});

test('mathml elements use the mathml namespace', () => {
	const math = h('math', null, h('mi', null, 'x'), h('mo', null, '+'), h('maligngroup'));
	expect(math.namespaceURI).toBe(MATH);
	expect(math.children[0].namespaceURI).toBe(MATH);
	expect(math.children[2].tagName).toBe('maligngroup');
});

test('ambiguous svg tags are created in the svg namespace', () => {
	for (const tag of ['image', 'text', 'tspan', 'defs', 'use', 'filter', 'clipPath', 'feGaussianBlur', 'linearGradient'])
		expect(h(tag).namespaceURI, tag).toBe(SVG);
});

test('html tags are never created in the svg or mathml namespace', () => {
	const html = ['div', 'span', 'p', 'a', 'button', 'img', 'input', 'main', 'section', 'iframe', 'title', 'style', 'script', 'meta', 'menu', 'meter', 'mark', 'map', 'template'];
	for (const tag of html) expect(h(tag).namespaceURI, tag).toBe('http://www.w3.org/1999/xhtml');
});

test('custom elements (with a dash) always stay in the html namespace', () => {
	for (const tag of ['my-icon', 'my-feature', 'mdi-icon', 'm-button', 'mc-widget', 'image-picker', 'mal-widget'])
		expect(h(tag).namespaceURI, tag).toBe('http://www.w3.org/1999/xhtml');
});

test('namespaces do not leak from children into the parent attributes', () => {
	// the parent is created and its attributes applied after the children were built
	const div = h('div', { textContent: 'parent' }, h('svg'));
	expect(div.textContent).toBe('parent');
	expect(div.hasAttribute('textContent')).toBe(false);
});

test('namespaces do not leak out of function children that render an svg', () => {
	const div = h('div', { textContent: 'parent' }, () => h('svg'));
	expect(div.textContent).toBe('parent');
	expect(div.hasAttribute('textContent')).toBe(false);
});

test('nested svg trees keep their namespace', () => {
	const svg = h('svg', null, h('g', null, h('circle', { r: 1 })));
	expect(svg.firstChild.namespaceURI).toBe(SVG);
	expect(svg.firstChild.firstChild.namespaceURI).toBe(SVG);
});

// ------------------------------------------------------------------ fragment

test('h(h, ...) returns the children (Fragment)', () => {
	const frag = h(h, null, h('i', null, '1'), h('b', null, '2'));
	expect(Array.isArray(frag)).toBe(true);
	expect(frag.length).toBe(2);
	const root = document.createElement('div');
	root.append(...frag);
	expect(root.innerHTML).toBe('<i>1</i><b>2</b>');
});

test('h with an unsupported tag returns undefined', () => {
	expect(h(undefined)).toBe(undefined);
	expect(h(42)).toBe(undefined);
});

// ------------------------------------------------------------------ children

test('children of every supported type are coerced', () => {
	expect(h('div', null, 'a', 1, true, null, undefined, 10n, Symbol('s')).outerHTML)
		.toBe('<div>a1<!--true--><!--null--><!--undefined-->10Symbol(s)</div>');
});

test('object children are stringified', () => {
	expect(h('div', null, { a: 1 }).outerHTML).toBe('<div>[object Object]</div>');
});

test('empty string children render nothing visible', () => {
	expect(h('div', '', 'x').textContent).toBe('x');
});

test('deeply nested arrays are flattened', () => {
	expect(h('div', null, [[['a'], ['b']], 'c']).textContent).toBe('abc');
});

test('a component receives props and children', () => {
	const Comp = ({ id, children }) => h('div', { id }, children);
	expect(h(Comp, { id: 'x' }, 'kid').outerHTML).toBe('<div id="x">kid</div>');
});

test('a component receives an empty children array', () => {
	const Comp = ({ children }) => h('div', null, String(children.length), children);
	expect(h(Comp, {}).textContent).toBe('0');
	expect(h(Comp, {}, 'kid').textContent).toBe('1kid');
});

test('null/undefined properties are emptied instead of stringified', () => {
	const input = h('input', { value: undefined, placeholder: null });
	expect(input.value).toBe('');
	expect(input.placeholder).toBe('');
	expect(input.getAttribute('value')).toBe(null);
	const div = h('div', { title: null, textContent: undefined });
	expect(div.getAttribute('title')).toBe('');
	expect(div.textContent).toBe('');
});

// ------------------------------------------------------------------ f factory

test('f creates element factories that pass props and children to h', () => {
	const { div, button } = f(h);
	expect(div({ id: 'a' }, 'x').outerHTML).toBe('<div id="a">x</div>');
	expect(div('a', 'b').outerHTML).toBe('<div>ab</div>');
	expect(button({ onclick: () => {} }, 'go').outerHTML).toBe('<button>go</button>');
});

test('f uses the property name as the tag, so custom elements work too', () => {
	const { 'my-widget': myWidget, article } = f(h);
	expect(myWidget({ id: 'c' }, 'kid').outerHTML).toBe('<my-widget id="c">kid</my-widget>');
	expect(myWidget().namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	expect(article({ id: 'a' }).outerHTML).toBe('<article id="a"></article>');
	// the tag function is called with (tagName, props, ...children) - the h signature
	const calls = [];
	const spy = (tag, attrs, ...children) => (calls.push([tag, attrs, children]), h(tag, attrs, ...children));
	const { p, span } = f(spy);
	expect(p({ title: 't' }, 'x').outerHTML).toBe('<p title="t">x</p>');
	expect(span().outerHTML).toBe('<span></span>');
	expect(calls).toEqual([['p', { title: 't' }, ['x']], ['span', undefined, []]]);
});

test('f factories accept reactive children', () => {
	const { p } = f(h);
	const text = signal('a');
	const el = p(text);
	const root = document.createElement('div');
	root.append(el);
	expect(root.textContent).toBe('a');
	text.value = 'b';
	expect(root.textContent).toBe('b');
});
