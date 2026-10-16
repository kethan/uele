/**
 * For/map: list rendering, keys, diffing.
 * @vitest-environment jsdom
 */
import { expect, test, afterEach, vi } from 'vitest';
import { h, For, map, add, api } from '../src/index.js';
import { signal, effect } from 'ulive';

api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const mount = (...nodes) => {
	const root = document.createElement('div');
	root.append(...add(...nodes));
	return root;
};

afterEach(() => {
	delete api.diff;
	delete api.udom;
});

// ------------------------------------------------------------------------ map

test('map renders an array', () => {
	const list = map([1, 2, 3], (v, i) => h('i', null, v + ':' + i));
	expect(mount(list).innerHTML).toBe('<i>1:0</i><i>2:1</i><i>3:2</i>');
});

test('map renders a reactive array and updates', () => {
	const items = signal(['a', 'b']);
	const list = map(items, (v) => h('i', null, v));
	const root = mount(list);
	expect(root.textContent).toBe('ab');
	items.value = ['a', 'b', 'c'];
	expect(root.textContent).toBe('abc');
	items.value = ['c', 'b', 'a'];
	expect(root.textContent).toBe('cba');
	items.value = ['b'];
	expect(root.textContent).toBe('b');
});

test('map shows the fallback for empty lists and refills', () => {
	const items = signal([]);
	const list = map(items, (v) => h('i', null, v), h('b', null, 'none'));
	const root = mount(list);
	expect(root.innerHTML).toBe('<b>none</b>');
	items.value = ['x'];
	expect(root.innerHTML).toBe('<i>x</i>');
	items.value = [];
	expect(root.innerHTML).toBe('<b>none</b>');
});

test('map defaults to an empty fallback', () => {
	const root = mount(map([], (v) => h('i', null, v)));
	expect(root.innerHTML).toBe('');
	expect(root.textContent).toBe('');
});

test('map accepts undefined/null items as empty', () => {
	expect(mount(map(undefined, (v) => h('i', null, v), 'fb')).textContent).toBe('fb');
	expect(mount(map(null, (v) => h('i', null, v))).textContent).toBe('');
});

test('map reuses nodes for unchanged keys', () => {
	const callback = vi.fn((v) => h('i', null, v));
	const items = signal(['a', 'b']);
	const root = mount(map(items, callback));
	const first = root.querySelectorAll('i')[0];
	items.value = ['b', 'a'];
	expect(callback).toHaveBeenCalledTimes(2);
	// nodes are reused by key, only reordered
	expect(root.querySelectorAll('i')[1]).toBe(first);
});

test('map supports a custom key and reuses those nodes', () => {
	const calls = [];
	const items = signal([{ id: 1, n: 'a' }, { id: 2, n: 'b' }]);
	const root = mount(map(items, (v, i) => (calls.push(v.id), h('i', null, v.n + i)), 'fb', (v) => v.id));
	expect(root.textContent).toBe('a0b1');
	const a = root.querySelectorAll('i')[0];
	// reordered, then updated in place with the same keys
	items.value = [{ id: 2, n: 'b' }, { id: 1, n: 'a' }];
	expect(root.textContent).toBe('b1a0');
	expect(root.querySelectorAll('i')[1]).toBe(a);
	expect(calls).toEqual([1, 2]); // keyed nodes are not re-rendered
	items.value = [{ id: 3, n: 'c' }];
	expect(root.textContent).toBe('c0');
	expect(calls).toEqual([1, 2, 3]);
});

test('map keeps every item when keys collide', () => {
	// identity keys: duplicates must not collapse into a single node
	const items = signal([1, 1, 2]);
	const root = mount(map(items, (v, i) => h('i', null, v + '#' + i)));
	expect(root.innerHTML).toBe('<i>1#0</i><i>1#1</i><i>2#2</i>');
	items.value = [2, 1, 1];
	// every duplicate keeps a node of its own - none are dropped
	expect(root.querySelectorAll('i').length).toBe(3);
	expect(root.querySelectorAll('i')[0].textContent).toBe('2#2');
	items.value = [1, 1, 1, 1];
	expect(root.querySelectorAll('i').length).toBe(4);
	items.value = [1, 1, 1, 1, 1];
	expect(root.querySelectorAll('i').length).toBe(5);
});

test('map drops nodes of removed keys so they are not reused', () => {
	const callback = vi.fn((v) => h('i', null, v));
	const items = signal(['a', 'b']);
	const root = mount(map(items, callback));
	items.value = [];
	items.value = ['a'];
	// 'a' was released when the list emptied - it is rebuilt instead of resurrected
	expect(callback).toHaveBeenCalledTimes(3);
	expect(root.textContent).toBe('a');
});

test('map accepts any iterable', () => {
	expect(mount(map(new Set([1, 2]), (v) => h('i', null, v))).textContent).toBe('12');
	expect(mount(map('ab', (v) => h('i', null, v))).textContent).toBe('ab');
	function* gen() { yield 1; yield 2; }
	expect(mount(map(gen(), (v) => h('i', null, v))).textContent).toBe('12');
});

test('map works without reactivity and nested in elements', () => {
	const el = h('ul', null, map([1, 2], (v) => h('li', null, v)));
	expect(el.outerHTML).toBe('<ul><li>1</li><li>2</li></ul>');
});

test('map lists update when the items signal is replaced by an equivalent array', () => {
	const items = signal([1, 2]);
	const root = mount(map(items, (v) => h('i', null, v)));
	items.value = [1, 2];
	expect(root.textContent).toBe('12');
});

// ------------------------------------------------------------------ For

test('For renders a list from a signal', () => {
	const calls = [];
	const items = signal([1, 2, 3]);
	const list = h(For, { each: items }, (item, i) => (calls.push(item), h('div', null, item + '.' + i)));
	const root = mount(list);
	expect(root.textContent).toBe('1.02.13.2');
	// nodes are keyed by item, so a reorder never re-runs the callback
	items.value = [3, 2, 1];
	expect(root.textContent).toBe('3.22.11.0');
	expect(calls).toEqual([1, 2, 3]);
	items.value = [1, 2, 3, 4];
	expect(root.textContent).toBe('1.02.13.24.3');
});

test('For with index keys keeps positional content', () => {
	const items = signal(['a', 'b']);
	const list = h(For, { each: items, key: (v, i) => i }, (item, i) => h('div', null, item + i));
	const root = mount(list);
	expect(root.textContent).toBe('a0b1');
	items.value = ['c', 'd'];
	// same keys, so the callback is not re-run for the reused positions
	expect(root.textContent).toBe('a0b1');
	items.value = ['c', 'd', 'e'];
	expect(root.textContent).toBe('a0b1e2');
});

test('For accepts a plain array', () => {
	const list = h(For, { each: [1, 2] }, (item) => h('div', null, item));
	expect(mount(list).innerHTML).toBe('<div>1</div><div>2</div>');
});

test('For shows a fallback for empty lists', () => {
	const items = signal([]);
	const list = h(For, { each: items, fallback: h('div', null, 'No items') }, (item) => h('div', null, item));
	const root = mount(list);
	expect(root.textContent).toBe('No items');
	items.value = [1];
	expect(root.textContent).toBe('1');
});

test('For supports a key function', () => {
	const items = signal([{ id: 1, n: 'a' }]);
	const list = h(For, { each: items, key: (v) => v.id }, (item) => h('div', null, item.n));
	const root = mount(list);
	const node = root.querySelector('div');
	items.value = [{ id: 1, n: 'b' }];
	expect(root.querySelector('div')).toBe(node);
	items.value = [{ id: 2, n: 'c' }];
	expect(root.querySelector('div')).not.toBe(node);
});

test('For inside an element keeps its live markers', () => {
	const items = signal([1]);
	const el = h('ul', null, map(items, (v) => h('li', null, v)));
	expect(el.innerHTML).toBe('<li>1</li>');
	items.value = [1, 2];
	expect(el.innerHTML).toBe('<li>1</li><li>2</li>');
});

// ----------------------------------------------------------------- api.diff

// swapdom compatible: diff(parent, oldNodes, newNodes, end)
const swapdom = (parent, a, b, end = null) => {
	let i = 0, cur, next, bi, bidx = new Set(b);
	const insert = (a, b) => parent.insertBefore(a, b);
	const remove = (a) => parent.removeChild(a);
	while ((bi = a[i++])) !bidx.has(bi) ? remove(bi) : (cur = cur || bi);
	cur = cur || end; i = 0;
	while ((bi = b[i++])) {
		next = cur ? cur.nextSibling : end;
		if (cur === bi) cur = next;
		else {
			if (b[i] === next) cur = next;
			insert(bi, cur);
		}
	}
	return b;
};

test('api.diff is used to update lists and receives the old/new nodes', () => {
	const calls = [];
	const items = signal(['a', 'b']);
	api.diff = (parent, a, b, end) => (calls.push([a.length, b.length]), swapdom(parent, a, b, end));
	const root = mount(map(items, (v) => h('i', null, v)));
	expect(root.innerHTML).toBe('<i>a</i><i>b</i>');

	items.value = ['c', 'b', 'a'];
	expect(root.innerHTML).toBe('<i>c</i><i>b</i><i>a</i>');

	items.value = ['a', 'b', 'c', 'd'];
	expect(root.innerHTML).toBe('<i>a</i><i>b</i><i>c</i><i>d</i>');

	items.value = [];
	expect(root.innerHTML).toBe('');

	items.value = ['x'];
	expect(root.innerHTML).toBe('<i>x</i>');

	expect(calls).toEqual([[2, 3], [3, 4], [4, 1], [1, 1]]);
});

test('api.diff receives the end marker when no udom is configured', () => {
	const items = signal([1]);
	const root = mount(map(items, (v) => h('i', null, v)));
	expect(root.innerHTML).toBe('<i>1</i>');
	let args;
	api.diff = (...a) => (args = a);
	items.value = [1, 2];
	expect(args[0]).toBe(root); // parent
	expect(args[1].length).toBe(1); // old nodes
	expect(args[2].length).toBe(2); // new nodes
	expect(args[3]).toBe(root.childNodes[2]); // end marker (diff never ran, so nothing was inserted)
	expect(args[4]).toBe(undefined);
});

test('api.udom switches api.diff to the udomdiff signature', () => {
	const udom = () => 'get';
	const args = [];
	api.udom = udom;
	api.diff = (...a) => args.push(a.slice(3));
	const sig = signal([1]);
	const root = document.createElement('div');
	root.append(...add(map(sig, (v) => h('i', null, v))));
	sig.value = [1, 2];
	expect(args.length).toBe(1);
	expect(args[0][0]).toBe(udom); // get
	expect(args[0][1]).toBe(root.childNodes[2]); // before = end marker
});

test('map still updates when api.diff is removed again', () => {
	const items = signal([1]);
	const root = mount(map(items, (v) => h('i', null, v)));
	items.value = [1, 2];
	expect(root.textContent).toBe('12');
});

// ----------------------------------------------------------------- perf/scale

test('map handles large lists and single item updates', () => {
	const items = signal(Array.from({ length: 1000 }, (_, i) => i));
	const root = mount(map(items, (v) => h('i', null, v)));
	expect(root.querySelectorAll('i').length).toBe(1000);
	const last = root.querySelectorAll('i')[999];
	items.value = items.value.concat(1000);
	expect(root.querySelectorAll('i').length).toBe(1001);
	expect(root.querySelectorAll('i')[999]).toBe(last);
	items.value = items.value.filter((v) => v !== 0);
	expect(root.querySelectorAll('i').length).toBe(1000);
});
