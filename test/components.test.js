/**
 * Control flow components: If/Show/Match, Switch, Dynamic, lazy.
 * @vitest-environment jsdom
 */
import { expect, test, beforeEach } from 'vitest';
import { h, If, Show, Match, Switch, Dynamic, lazy, add, api } from '../src/index.js';
import { signal, effect } from 'ulive';

api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const mount = (...nodes) => {
	const root = document.createElement('div');
	root.append(...add(...nodes));
	return root;
};

// ------------------------------------------------------------------- If / Show

test('If renders children when truthy and fallback otherwise', () => {
	expect(mount(If({ when: true, children: ['yes'], fallback: 'no' })).textContent).toBe('yes');
	expect(mount(If({ when: false, children: ['yes'], fallback: 'no' })).textContent).toBe('no');
	expect(mount(If({ when: 1, children: ['yes'] })).textContent).toBe('yes');
	expect(mount(If({ when: 0, children: ['yes'] })).getAttribute('x')).toBe(null);
});

test('If defaults to an empty fallback', () => {
	const root = mount(If({ when: false, children: ['yes'] }));
	expect(root.textContent).toBe('');
	// dynamic children are wrapped in empty text markers
	expect(root.childNodes.length).toBe(3);
	expect(root.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
	expect(root.childNodes[0].nodeValue).toBe('');
	expect(root.childNodes[2].nodeType).toBe(Node.TEXT_NODE);
});

test('If is reactive', () => {
	const cond = signal(false);
	const root = mount(If({ when: cond, children: [h('i', null, 'T')], fallback: h('b', null, 'F') }));
	expect(root.innerHTML).toBe('<b>F</b>');
	cond.value = true;
	expect(root.innerHTML).toBe('<i>T</i>');
	cond.value = false;
	expect(root.innerHTML).toBe('<b>F</b>');
});

test('If accepts a render callback, called with the truthy when value', () => {
	const cond = signal('a');
	const root = mount(If({ when: cond, children: [(v) => h('div', null, 'value:' + v)], fallback: 'fb' }));
	expect(root.textContent).toBe('value:a');
	cond.value = 'b';
	expect(root.textContent).toBe('value:b');
	cond.value = '';
	expect(root.textContent).toBe('fb');
	cond.value = 'c';
	expect(root.textContent).toBe('value:c');
});

test('If renders multiple children', () => {
	expect(mount(If({ when: true, children: ['a', 'b'] })).textContent).toBe('ab');
});

test('Show and Match are If', () => {
	expect(Show).toBe(If);
	expect(Match).toBe(If);
	expect(mount(Show({ when: true, children: ['x'] })).textContent).toBe('x');
});

test('If renders static children into any container', () => {
	const root = document.createElement('div');
	root.appendChild(h('main', null, If({ when: true, children: [h('p', null, 'p')] })));
	expect(root.innerHTML).toBe('<main><p>p</p></main>');
});

// --------------------------------------------------------------------- Switch

test('Switch renders the first truthy branch', () => {
	const sw = Switch({
		fallback: 'fb',
		children: [If({ when: false, children: ['a'] }), If({ when: true, children: ['b'] }), If({ when: true, children: ['c'] })]
	});
	expect(mount(sw).textContent).toBe('b');
});

test('Switch falls back when no branch matches', () => {
	const sw = Switch({ fallback: h('div', null, 'none'), children: [If({ when: false, children: ['a'] })] });
	expect(mount(sw).innerHTML).toBe('<div>none</div>');
});

test('Switch accepts static children and an empty children list', () => {
	expect(mount(Switch({ children: ['static'] })).textContent).toBe('static');
	expect(mount(Switch({ children: [] })).textContent).toBe('');
});

test('Switch is reactive', () => {
	const state = signal('b');
	const sw = Switch({
		children: [
			If({ when: () => state.value === 'a', children: [h('i', null, 'A')] }),
			If({ when: () => state.value === 'b', children: [h('i', null, 'B')] })
		]
	});
	const root = mount(sw);
	expect(root.textContent).toBe('B');
	state.value = 'a';
	expect(root.textContent).toBe('A');
});

test('Switch uses Match elements as children', () => {
	const sw = Switch({
		fallback: 'fb',
		children: [h(Match, { when: false }, 'a'), h(Match, { when: true }, 'b')]
	});
	expect(mount(sw).textContent).toBe('b');
});

// -------------------------------------------------------------------- Dynamic

test('Dynamic renders a component with props and children', () => {
	const Comp = ({ id, children }) => h('div', { id }, children);
	expect(mount(Dynamic({ component: Comp, id: 'x', children: ['kid'] })).innerHTML).toBe('<div id="x">kid</div>');
});

test('Dynamic renders a node component', () => {
	const node = h('span', null, 'node');
	expect(mount(Dynamic({ component: node })).innerHTML).toBe('<span>node</span>');
});

test('Dynamic without a component renders a placeholder', () => {
	expect(mount(Dynamic({})).innerHTML).toBe('<!--undefined-->');
});

test('Dynamic can be nested inside elements', () => {
	const Comp = ({ children }) => h('i', null, children);
	expect(h('div', null, Dynamic({ component: Comp, children: ['c'] })).outerHTML).toBe('<div><i>c</i></div>');
});

// ----------------------------------------------------------------------- lazy

test('lazy renders the loaded default export', async () => {
	const Lazy = lazy(() => Promise.resolve({ default: ({ id }) => h('div', { id }, 'lazy') }));
	const root = mount(h(Lazy, { id: 'l' }));
	expect(root.textContent).toBe('');
	await new Promise((r) => setImmediate(r));
	expect(root.innerHTML).toBe('<div id="l">lazy</div>');
});

test('lazy renders the fallback when the import fails', async () => {
	const Lazy = lazy(() => Promise.reject(new Error('offline')), h('b', null, 'failed'));
	const root = mount(h(Lazy, {}));
	await new Promise((r) => setImmediate(r));
	expect(root.innerHTML).toBe('<b>failed</b>');
});

test('lazy renders the fallback when the module is broken', async () => {
	const Lazy = lazy(() => Promise.resolve({}), h('b', null, 'broken'));
	const root = mount(h(Lazy, {}));
	await new Promise((r) => setImmediate(r));
	expect(root.innerHTML).toBe('<b>broken</b>');
});

test('lazy defaults to an empty fallback', async () => {
	const Lazy = lazy(() => Promise.reject(new Error('x')));
	const root = mount(h(Lazy, {}));
	await new Promise((r) => setImmediate(r));
	expect(root.innerHTML).toBe('');
});

test('lazy passes props through', async () => {
	const Lazy = lazy(() => Promise.resolve({ default: (props) => h('i', null, props.name, '/', props.children.length) }));
	const root = mount(h(Lazy, { name: 'n' }, 'a'));
	await new Promise((r) => setImmediate(r));
	expect(root.textContent).toBe('n/1');
});
