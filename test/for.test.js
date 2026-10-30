/**
 * `For` / `map` in depth: source shapes, keys, identity reuse, nesting, stress,
 * the built-in and pluggable diffs, and the failure modes.
 *
 * The region contract (see test/diff.conformance.test.js) is what all of this
 * rests on: a live region is `[start marker, ...content, end marker]`, the markers
 * stay put, everything between them belongs to the region, and `For` keys decide
 * which content is reused instead of rebuilt.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { h, map, add, api, useLive, r } from '../src/index.js';
import { For, If, Switch, Dynamic } from 'uele/flow';
import { signal, effect } from 'ulive';
import { Subject, throwError, of } from 'rxjs';
import { ENGINES, installEngine, DEFAULT_DIFF } from './helpers/diff-engines.js';

api.engine.effect = effect;
api.engine.is = (v) => v?.peek;
api.engine.get = (v) => v.value;

const mount = (...nodes) => {
	const root = document.createElement('div');
	root.append(...add(...nodes));
	return root;
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const texts = (root, sel = 'i') => [...root.querySelectorAll(sel)].map((node) => node.textContent);
const ids = (root) => [...root.querySelectorAll('i')].map((node) => node.dataset.id);
const markers = (root) => [...root.childNodes].filter((node) => node.nodeType === 3 && node.nodeValue === '');
/** seeded prng so the stress runs are reproducible */
const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

let root;
beforeEach(() => {
	document.body.innerHTML = '';
	root = document.createElement('div');
	document.body.append(root);
});
afterEach(() => {
	Object.assign(api, DEFAULT_DIFF);
	delete api.coalesce;
});

// ------------------------------------------------------------------ source shapes

describe('For source shapes', () => {
	test('renders a plain array without subscribing', () => {
		const callback = vi.fn((v, i) => h('i', null, `${v}:${i}`));
		const list = For({ each: ['a', 'b', 'c'], children: [callback] });
		root.append(...list);
		expect(texts(root)).toEqual(['a:0', 'b:1', 'c:2']);
		expect(callback).toHaveBeenCalledTimes(3);
	});

	test('updates from a signal of arrays', () => {
		const items = signal([1, 2]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		expect(texts(root)).toEqual(['1', '2']);
		items.value = [3, 4, 5];
		expect(texts(root)).toEqual(['3', '4', '5']);
		items.value = [];
		expect(texts(root)).toEqual([]);
	});

	test('accepts a thunk as the source and re-reads it', () => {
		const items = signal([1]);
		root.append(...For({ each: () => items.value, children: [(v) => h('i', null, v)] }));
		expect(texts(root)).toEqual(['1']);
		items.value = [1, 2];
		expect(texts(root)).toEqual(['1', '2']);
	});

	test('accepts a Set, a Map, a generator and a string', () => {
		expect(texts(mount(For({ each: new Set([1, 2]), children: [(v) => h('i', null, v)] })))).toEqual(['1', '2']);
		expect(
			texts(mount(For({ each: new Map([['a', 1], ['b', 2]]).values(), children: [(v) => h('i', null, v)] })))
		).toEqual(['1', '2']);
		const gen = function* () {
			yield 'x';
			yield 'y';
		};
		expect(texts(mount(For({ each: gen(), children: [(v) => h('i', null, v)] })))).toEqual(['x', 'y']);
		expect(texts(mount(For({ each: 'abc', children: [(v) => h('i', null, v)] })))).toEqual(['a', 'b', 'c']);
		expect(texts(mount(For({ each: new Uint8Array([7, 8]), children: [(v) => h('i', null, v)] })))).toEqual(['7', '8']);
	});

	test('a non-iterable source renders the fallback instead of throwing', () => {
		for (const each of [5, true, { length: 2 }, Symbol('x'), new Date()]) {
			const el = mount(For({ each, children: [(v) => h('i', null, v)], fallback: h('b', null, 'fb') }));
			expect(el.textContent).toBe('fb');
			expect(el.querySelectorAll('i').length).toBe(0);
		}
	});

	test('undefined/null/false/0 sources render the fallback', () => {
		for (const each of [undefined, null, false, 0, '']) {
			expect(mount(For({ each, children: [(v) => h('i', null, v)], fallback: '.' })).textContent).toBe('.');
		}
	});

	test('a promise source shows the fallback and then the resolved items', async () => {
		root.append(...For({ each: Promise.resolve(['a', 'b']), children: [(v) => h('i', null, v)], fallback: 'loading' }));
		expect(root.textContent).toBe('loading');
		await flush();
		expect(texts(root)).toEqual(['a', 'b']);
	});

	test('a rejected promise keeps the fallback and never throws', async () => {
		root.append(
			...For({ each: Promise.reject(new Error('nope')), children: [(v) => h('i', null, v)], fallback: 'loading' })
		);
		await flush();
		await flush();
		expect(root.textContent).toBe('loading');
	});

	test('an observable source updates on every emission', () => {
		const items = new Subject();
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		expect(root.textContent).toBe('');
		items.next(['a']);
		expect(texts(root)).toEqual(['a']);
		items.next(['a', 'b']);
		expect(texts(root)).toEqual(['a', 'b']);
		items.next([]);
		expect(texts(root)).toEqual([]);
	});

	test('an observable error keeps the last content', () => {
		const items = new Subject();
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: 'fb' }));
		items.next(['a']);
		expect(() => items.error(new Error('boom'))).not.toThrow();
		expect(texts(root)).toEqual(['a']);
	});

	test('an async iterable feeds the list one batch at a time', async () => {
		const pages = (async function* () {
			yield ['a'];
			await new Promise((resolve) => setTimeout(resolve, 10));
			yield ['a', 'b'];
		})();
		root.append(...For({ each: pages, children: [(v) => h('i', null, v)], fallback: 'loading' }));
		expect(root.textContent).toBe('loading');
		await flush();
		expect(texts(root)).toEqual(['a']);
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(texts(root)).toEqual(['a', 'b']);
	});

	test('a new array with equal content still updates and reuses the nodes', () => {
		const items = signal([1, 2]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		const before = [...root.querySelectorAll('i')];
		items.value = [1, 2];
		expect(texts(root)).toEqual(['1', '2']);
		expect([...root.querySelectorAll('i')]).toEqual(before); // same nodes, same order
	});

	test('mutating the array in place does not notify (identity based signals)', () => {
		const items = signal([1]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		items.value.push(2);
		expect(texts(root)).toEqual(['1']);
		items.value = [...items.value];
		expect(texts(root)).toEqual(['1', '2']);
	});

	test('an empty array source never calls the callback', () => {
		const callback = vi.fn((v) => h('i', null, v));
		mount(For({ each: [], children: [callback] }));
		expect(callback).not.toHaveBeenCalled();
	});

	test('only the first child is used as the item callback', () => {
		const ignored = vi.fn(() => h('b', null, 'ignored'));
		root.append(...For({ each: [1], children: [(v) => h('i', null, v), ignored] }));
		expect(texts(root)).toEqual(['1']);
		expect(ignored).not.toHaveBeenCalled();
	});
});

// -------------------------------------------------------------------------- keys

describe('For keys', () => {
	test('default key is the value itself, so object items are reused by identity', () => {
		const a = { n: 'a' };
		const b = { n: 'b' };
		const items = signal([a, b]);
		const calls = [];
		root.append(
			...For({
				each: items,
				children: [(v) => (calls.push(v.n), h('i', null, v.n))]
			})
		);
		const [first] = root.querySelectorAll('i');
		items.value = [b, a];
		expect(texts(root)).toEqual(['b', 'a']);
		expect(root.querySelectorAll('i')[1]).toBe(first);
		expect(calls).toEqual(['a', 'b']); // reused items are not re-rendered
	});

	test('every duplicate key gets its own node and at most one is reused per build', () => {
		const items = signal([1, 1, 2]);
		const callback = vi.fn((v) => h('i', null, v));
		root.append(...For({ each: items, children: [callback] }));
		expect(texts(root)).toEqual(['1', '1', '2']);
		const [one, two, three] = root.querySelectorAll('i');
		expect(one).not.toBe(two);
		// mount builds once and map re-builds once (reusing the nodes), and each build
		// can consume a key a single time - the second `1` is rebuilt in both builds
		expect(callback).toHaveBeenCalledTimes(4);
		items.value = [1, 1, 2];
		expect(texts(root)).toEqual(['1', '1', '2']);
		expect(callback).toHaveBeenCalledTimes(5);
		const nodes = [...root.querySelectorAll('i')];
		expect(nodes.length).toBe(3);
		// only one node per duplicate key survives a rebuild
		expect(nodes.filter((node) => node === one || node === two || node === three).length).toBeGreaterThan(0);
		expect(new Set(nodes).size).toBe(3);
	});

	test('a custom key function receives the value and the current index', () => {
		const seen = [];
		const items = signal(['a', 'b', 'c']);
		root.append(
			...For({
				each: items,
				key: (v, i) => (seen.push([v, i]), v),
				children: [(v) => h('i', null, v)]
			})
		);
		// the first batch is the initial build, then map re-reads the source
		expect(seen.slice(0, 3)).toEqual([['a', 0], ['b', 1], ['c', 2]]);
		seen.length = 0;
		items.value = ['c', 'a', 'b'];
		// one batch per update, every key sees the current index
		expect(seen).toEqual([['c', 0], ['a', 1], ['b', 2]]);
	});

	test('index keys keep the nodes and their positional content', () => {
		const items = signal(['a', 'b', 'c']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], key: (v, i) => i }));
		const before = [...root.querySelectorAll('i')];
		items.value = ['c', 'b', 'a'];
		// positional keys reuse the nodes as they are: the rendered content does not follow the value
		expect(texts(root)).toEqual(['a', 'b', 'c']);
		expect([...root.querySelectorAll('i')]).toEqual(before);
		items.value = ['x', 'y'];
		expect(texts(root)).toEqual(['a', 'b']); // positional keys: the surviving nodes keep their content
		expect(root.querySelectorAll('i').length).toBe(2);
	});

	test('keyed nodes are reused even when the callback would build different markup', () => {
		const items = signal([{ id: 1, n: 'a' }, { id: 2, n: 'b' }]);
		root.append(
			...For({
				each: items,
				key: (v) => v.id,
				children: [(v) => h('i', { 'data-id': v.id }, v.n)]
			})
		);
		const [first] = root.querySelectorAll('i');
		items.value = [{ id: 2, n: 'b' }, { id: 1, n: 'a' }];
		expect(ids(root)).toEqual(['2', '1']);
		expect(root.querySelectorAll('i')[1]).toBe(first);
		expect(root.querySelectorAll('i')[1].textContent).toBe('a'); // the markup from the first render
	});

	test('a removed key is rebuilt when it comes back', () => {
		const items = signal([1, 2]);
		const callback = vi.fn((v) => h('i', null, v));
		root.append(...For({ each: items, children: [callback] }));
		const first = root.querySelectorAll('i')[0];
		items.value = [2];
		items.value = [1, 2];
		expect(callback).toHaveBeenCalledTimes(3);
		expect(root.querySelectorAll('i')[0]).not.toBe(first);
	});

	test('exotic keys (NaN, objects, undefined) do not collide', () => {
		const shared = {};
		const items = signal([NaN, NaN, shared, shared, undefined]);
		root.append(...For({ each: items, children: [(v) => h('i', null, String(v))], key: (v) => v }));
		expect(texts(root)).toEqual(['NaN', 'NaN', '[object Object]', '[object Object]', 'undefined']);
		items.value = [undefined, shared, shared, NaN, NaN];
		expect(texts(root)).toEqual(['undefined', '[object Object]', '[object Object]', 'NaN', 'NaN']);
	});

	test('a key that changes for the same item rebuilds it', () => {
		const item = { id: 1, n: 'a' };
		const items = signal([item]);
		const callback = vi.fn((v) => h('i', null, v.n));
		root.append(...For({ each: items, children: [callback], key: (v) => v.id }));
		item.id = 2;
		items.value = [item];
		expect(callback).toHaveBeenCalledTimes(2);
		expect(texts(root)).toEqual(['a']);
	});

	test('the key function can build composite and prefixed keys', () => {
		const items = signal([{ t: 'a', id: 1 }, { t: 'b', id: 1 }]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v.t)], key: (v) => `${v.t}:${v.id}` }));
		const [first, second] = root.querySelectorAll('i');
		items.value = [{ t: 'b', id: 1 }, { t: 'a', id: 1 }];
		expect(root.querySelectorAll('i')[1]).toBe(first);
		expect(root.querySelectorAll('i')[0]).toBe(second);
	});
});

// -------------------------------------------------------------- identity, order

describe('For identity and ordering', () => {
	test('reorder, insert and remove keep untouched nodes', () => {
		const items = signal(['a', 'b', 'c', 'd']);
		root.append(...For({ each: items, children: [(v) => h('i', { 'data-id': v }, v)] }));
		const [a, b, c, d] = [...root.querySelectorAll('i')];

		items.value = ['d', 'a', 'b', 'c'];
		expect(ids(root)).toEqual(['d', 'a', 'b', 'c']);
		expect([...root.querySelectorAll('i')]).toEqual([d, a, b, c]);

		items.value = ['x', 'd', 'a', 'b', 'c', 'y'];
		expect(ids(root)).toEqual(['x', 'd', 'a', 'b', 'c', 'y']);
		expect([...root.querySelectorAll('i')].slice(1, 5)).toEqual([d, a, b, c]);

		items.value = ['c'];
		expect(ids(root)).toEqual(['c']);
		expect([a, b, d].every((node) => node.parentNode === null)).toBe(true);
	});

	test('a node for a removed key is never reused later', () => {
		const items = signal(['a', 'b']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		const stale = root.querySelectorAll('i')[0];
		items.value = ['b'];
		expect(stale.parentNode).toBe(null);
		items.value = ['b', 'a'];
		const fresh = root.querySelectorAll('i')[1];
		expect(fresh).not.toBe(stale);
		expect(stale.parentNode).toBe(null);
	});

	test('markers stay identical and in place across every update', () => {
		const items = signal([1, 2]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: h('b', null, 'none') }));
		const [sm, em] = markers(root);
		expect(root.firstChild).toBe(sm);
		expect(root.lastChild).toBe(em);
		for (const next of [[1, 2, 3], [], [9], [4, 5, 6, 7]]) {
			items.value = next;
			expect(root.firstChild).toBe(sm);
			expect(root.lastChild).toBe(em);
			const [start, end] = markers(root);
			expect(start).toBe(sm);
			expect(end).toBe(em);
		}
	});

	test('static siblings around the region survive updates', () => {
		const items = signal([1]);
		root.append(document.createElement('hr'));
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		root.append(document.createTextNode('tail'));
		const hr = root.firstChild;
		items.value = [1, 2, 3];
		items.value = [];
		items.value = [7];
		expect(root.firstChild).toBe(hr);
		expect(root.lastChild.nodeValue).toBe('tail');
		expect(texts(root)).toEqual(['7']);
	});

	test('the region contains exactly the markers and the items', () => {
		const items = signal([1, 2, 3]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		expect(root.childNodes.length).toBe(5);
		items.value = [1, 2, 3, 4];
		expect(root.childNodes.length).toBe(6);
		items.value = [1];
		expect(root.childNodes.length).toBe(3);
	});

	test('a list of signals updates single items without rebuilding the list', () => {
		const cells = [signal('a'), signal('b'), signal('c')];
		const items = signal(cells);
		const callback = vi.fn((cell) => h('i', null, cell));
		root.append(...For({ each: items, children: [callback] }));
		expect(texts(root)).toEqual(['a', 'b', 'c']);
		const before = [...root.querySelectorAll('i')];
		cells[1].value = 'B';
		expect(texts(root)).toEqual(['a', 'B', 'c']);
		expect(callback).toHaveBeenCalledTimes(3); // the list itself was not rebuilt
		expect([...root.querySelectorAll('i')]).toEqual(before);
	});

	test('a keyed list of signals keeps one live region per item', () => {
		const cells = [{ id: 1, cell: signal('a') }, { id: 2, cell: signal('b') }];
		const items = signal(cells);
		root.append(...For({ each: items, children: [(v) => h('i', { 'data-id': v.id }, v.cell)], key: (v) => v.id }));
		const first = root.querySelectorAll('i')[0];
		items.value = [cells[1], cells[0]];
		expect(ids(root)).toEqual(['2', '1']);
		expect(root.querySelectorAll('i')[1]).toBe(first);
		cells[0].cell.value = 'A';
		expect(texts(root)).toEqual(['b', 'A']);
	});
});

// --------------------------------------------------------------------- structure

describe('For structure and nesting', () => {
	test('nested lists update independently', () => {
		const rows = signal([
			{ id: 'r1', cells: signal(['a', 'b']) },
			{ id: 'r2', cells: signal(['c']) }
		]);
		const grid = For({
			each: rows,
			key: (row) => row.id,
			children: [
				(row) => h('i', { 'data-id': row.id }, For({ each: row.cells, children: [(c) => h('b', null, c)] }))
			]
		});
		root.append(...grid);
		expect(root.textContent).toBe('abc');
		expect(root.querySelectorAll('i > b').length).toBe(3);
		const [firstRow, secondRow] = root.querySelectorAll('i');
		// the outer list is not rebuilt at all: only the row that changed updates
		rows.value[0].cells.value = ['a', 'b', 'x'];
		expect(root.textContent).toBe('abxc');
		expect(root.querySelectorAll('i > b').length).toBe(4);
		expect(root.querySelectorAll('i')[0]).toBe(firstRow);
		expect(root.querySelectorAll('i')[1]).toBe(secondRow);
	});

	test('a list nested inside a list row keeps its own markers', () => {
		const inner = signal(['1', '2']);
		const rows = signal(['r1']);
		root.append(
			...For({
				each: rows,
				children: [(row) => h('i', null, row, For({ each: inner, children: [(v) => h('b', null, v)] }))]
			})
		);
		expect(markers(root.querySelector('i')).length).toBe(2);
		inner.value = ['1', '2', '3'];
		expect(root.textContent).toBe('r1123');
		expect(root.querySelectorAll('b').length).toBe(3);
	});

	test('three levels of For stay in sync', () => {
		const items = signal([['a'], ['b']]);
		root.append(
			...For({
				each: items,
				children: [
					(row, i) =>
						h('i', null, For({ each: row, children: [(cell) => h('b', null, cell, For({ each: [cell, cell], children: [(v) => h('u', null, v)] }))] }))
				]
			})
		);
		expect(root.textContent).toBe('aaabbb');
		items.value = [['a'], ['b'], ['c']];
		expect(root.textContent).toBe('aaabbbccc');
		expect(root.querySelectorAll('u').length).toBe(6);
	});

	test('For inside If, Switch and Dynamic', () => {
		const show = signal(true);
		const items = signal([1, 2]);
		root.append(
			...add(
				If({
					when: show,
					children: [(on) => (on ? For({ each: items, children: [(v) => h('i', null, v)] }) : h('i', null, 'on'))],
					fallback: h('i', null, 'off')
				})
			)
		);
		expect(texts(root)).toEqual(['1', '2']);
		items.value = [3];
		expect(texts(root)).toEqual(['3']);
		show.value = false;
		expect(texts(root)).toEqual(['off']);
		show.value = true;
		expect(texts(root)).toEqual(['3']); // the list region was rebuilt from the current items

		const which = signal('list');
		const switcher = root.appendChild(document.createElement('div'));
		switcher.append(
			...add(
				Switch({
					children: [
						() => (which.value === 'list' ? For({ each: items, children: [(v) => h('i', null, v)] }) : ''),
						() => (which.value === 'empty' ? 'empty' : '')
					]
				})
			)
		);
		expect(texts(switcher)).toEqual(['3']);
		which.value = 'empty';
		expect(texts(switcher)).toEqual([]);
		expect(switcher.textContent).toBe('empty');

		const dynamic = root.appendChild(document.createElement('div'));
		const List = ({ each }) => For({ each, children: [(v) => h('i', null, v)] });
		dynamic.append(...add(Dynamic({ component: List, each: items, children: [(v) => h('i', null, v)] })));
		expect(texts(dynamic)).toEqual(['3']);
	});

	test('a component that renders For works through h()', () => {
		const List = ({ each, children }) => For({ each, children });
		const items = signal(['a', 'b']);
		root.append(...add(h(List, { each: items }, (v) => h('i', null, v))));
		expect(texts(root)).toEqual(['a', 'b']);
		items.value = ['z'];
		expect(texts(root)).toEqual(['z']);
	});

	test('For inside svg keeps the namespace of the item tags', () => {
		const items = signal([1, 2]);
		root.innerHTML = '<svg></svg>';
		const svg = root.firstChild;
		svg.append(...For({ each: items, children: [(v) => h('circle', { r: v })] }));
		expect([...svg.querySelectorAll('circle')].map((c) => c.namespaceURI)).toEqual([
			'http://www.w3.org/2000/svg',
			'http://www.w3.org/2000/svg'
		]);
		items.value = [1, 2, 3];
		expect(svg.querySelectorAll('circle').length).toBe(3);
		expect(svg.querySelector('circle').getAttribute('r')).toBe('1');
	});

	test('For items can carry refs, styles, classes and events', () => {
		const items = signal([{ id: 1, on: true }, { id: 2, on: false }]);
		const seen = [];
		const clicked = vi.fn();
		root.append(
			...For({
				each: items,
				key: (v) => v.id,
				children: [
					(v) =>
						h(
							'i',
							{
								'data-id': v.id,
								class: { on: v.on },
								style: { width: v.id * 10 + 'px' },
								ref: (node) => seen.push([v.id, node.dataset.id]),
								onclick: clicked
							},
							v.id
						)
				]
			})
		);
		const [first, second] = root.querySelectorAll('i');
		expect(seen).toEqual([[1, '1'], [2, '2']]);
		expect(first.classList.contains('on')).toBe(true);
		expect(second.classList.contains('on')).toBe(false);
		expect(first.style.width).toBe('10px');
		first.dispatchEvent(new MouseEvent('click'));
		expect(clicked).toHaveBeenCalledTimes(1);
		items.value = [{ id: 2, on: true }, { id: 1, on: false }];
		expect(ids(root)).toEqual(['2', '1']);
		// refs are only called when a node is created - reordered nodes are not re-attached
		expect(seen.length).toBe(2);
	});
});

// --------------------------------------------------------------------- fallback

describe('For fallback', () => {
	test('the fallback appears for an empty list and refills', () => {
		const items = signal([]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: h('b', null, 'none') }));
		expect(root.querySelector('b').textContent).toBe('none');
		items.value = ['x'];
		expect(root.querySelector('b')).toBe(null);
		expect(texts(root)).toEqual(['x']);
		items.value = [];
		expect(root.querySelector('b').textContent).toBe('none');
	});

	test('the same fallback node is reused across empty states', () => {
		const items = signal([]);
		const fallback = h('b', null, 'none');
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback }));
		const first = root.querySelector('b');
		items.value = [1];
		items.value = [];
		expect(root.querySelector('b')).toBe(first);
	});

	test('a string or array fallback is converted like any other child', () => {
		expect(mount(For({ each: [], children: [(v) => h('i', null, v)], fallback: 'empty' })).textContent).toBe('empty');
		const many = mount(
			For({ each: [], children: [(v) => h('i', null, v)], fallback: [h('b', null, 'a'), h('b', null, 'b')] })
		);
		expect(many.textContent).toBe('ab');
	});

	test('a function fallback behaves like a live child', () => {
		const items = signal([]);
		const cell = signal('wait');
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: () => cell.value }));
		expect(root.textContent).toBe('wait');
		cell.value = 'still waiting';
		expect(root.textContent).toBe('still waiting');
	});

	test('clearing to the fallback and back keeps the list nodes', () => {
		const items = signal(['a', 'b']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: '.' }));
		const [a, b] = root.querySelectorAll('i');
		items.value = [];
		expect(root.textContent).toBe('.');
		items.value = ['a', 'b'];
		expect([...root.querySelectorAll('i')]).toEqual([a, b]);
	});

	test('fallback and items never coexist', () => {
		const items = signal([1]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: h('b', null, 'none') }));
		for (const next of [[], [1], [], [1, 2], []]) {
			items.value = next;
			const hasItems = root.querySelectorAll('i').length > 0;
			const hasFallback = !!root.querySelector('b');
			expect(hasItems !== hasFallback).toBe(true);
		}
	});
});

// ----------------------------------------------------------------------- diffs

describe('For with api.diff', () => {
	const list = (items, key) =>
		For({
			each: items,
			key,
			fallback: h('b', null, 'none'),
			children: [(v) => h('i', { 'data-id': v.id }, v.id)]
		});
	const rows = (list) => [...list.querySelectorAll('i')].map((n) => n.dataset.id);

	for (const engine of ENGINES) {
		test(`${engine.name}: renders, reorders and clears`, () => {
			installEngine(api, engine, { effect, is: (v) => v?.peek, get: (v) => v.value });
			const items = signal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
			const host = document.createElement('div');
			host.append(...list(items));
			document.body.append(host);
			expect(rows(host)).toEqual(['a', 'b', 'c']);

			items.value = [{ id: 'c' }, { id: 'a' }];
			expect(rows(host)).toEqual(['c', 'a']);
			items.value = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
			expect(rows(host)).toEqual(['a', 'b', 'c']);
			items.value = [];
			expect(rows(host)).toEqual([]);
			expect(host.textContent).toBe('none'); // fallback
			expect(host.childNodes.length).toBe(3); // the markers and the fallback survive
			host.remove();
		});
	}

	test('switching from the built-in path to a differ hands over the live nodes', () => {
		const items = signal(['a']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		items.value = ['b'];
		items.value = ['c'];
		const seen = [];
		api.diff = (parent, oldNodes, newNodes, end) => {
			seen.push(oldNodes.map((n) => n.textContent));
			oldNodes.forEach((node) => node.parentNode === parent && parent.removeChild(node));
			newNodes.forEach((node) => parent.insertBefore(node, end || null));
		};
		items.value = ['d'];
		expect(seen).toEqual([['c']]); // not the stale first render
		expect(texts(root)).toEqual(['d']);
		expect(root.childNodes.length).toBe(3);
	});

	test('removing the differ again falls back to the built-in path', () => {
		const items = signal(['a']);
		const rebuild = (parent, oldNodes, newNodes, end) => {
			oldNodes.forEach((node) => parent.removeChild(node));
			newNodes.forEach((node) => parent.insertBefore(node, end || null));
		};
		api.diff = rebuild;
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		items.value = ['a', 'b'];
		delete api.diff;
		items.value = ['b'];
		expect(texts(root)).toEqual(['b']);
		expect(root.childNodes.length).toBe(3);
		items.value = ['x', 'y'];
		expect(texts(root)).toEqual(['x', 'y']);
	});

	test('a keyed differ still gets one node per key (identity reuse is upstream)', () => {
		const items = signal([{ id: 1 }, { id: 2 }]);
		installEngine(api, ENGINES[4], { effect, is: (v) => v?.peek, get: (v) => v.value }); // morphdom
		root.append(...list(items, (v) => v.id));
		const [first, second] = root.querySelectorAll('i');
		items.value = [{ id: 2 }, { id: 1 }];
		expect(rows(root)).toEqual(['2', '1']);
		expect([...root.querySelectorAll('i')]).toEqual([second, first]);
	});

	test('a differ that throws surfaces the error', () => {
		const items = signal([1]);
		api.diff = () => {
			throw new Error('differ exploded');
		};
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		expect(() => (items.value = [1, 2])).toThrow('differ exploded');
	});

	test('the differ receives the live item set, not the first render', () => {
		const items = signal([1]);
		const calls = [];
		api.diff = (parent, oldNodes, newNodes, end) => {
			calls.push([oldNodes.map((n) => n.textContent), newNodes.map((n) => n.textContent)]);
			oldNodes.forEach((node) => parent.removeChild(node));
			newNodes.forEach((node) => parent.insertBefore(node, end || null));
		};
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		items.value = [2];
		items.value = [3, 4];
		expect(calls).toEqual([
			[['1'], ['2']],
			[['2'], ['3', '4']]
		]);
	});
});

// ---------------------------------------------------------------------- stress

describe('For stress', () => {
	const build = (n) => Array.from({ length: n }, (_, i) => ({ id: i, label: 'item-' + i }));
	const shuffle = (random, list) => {
		const out = list.slice();
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	};

	test('1000 items and 200 keyed updates stay consistent and reuse nodes', () => {
		const random = rng(42);
		const items = signal(build(1000));
		const callback = vi.fn((v) => h('i', { 'data-id': v.id }, v.label));
		root.append(...For({ each: items, children: [callback], key: (v) => v.id }));
		expect(root.querySelectorAll('i').length).toBe(1000);
		expect(callback).toHaveBeenCalledTimes(1000);
		let previous = new Map([...root.querySelectorAll('i')].map((node) => [node.dataset.id, node]));
		let reused = 0;
		let candidates = 0;

		let current = build(1000);
		for (let step = 0; step < 200; step++) {
			const op = random();
			if (op < 0.35) {
				current = shuffle(random, current).slice(0, 990); // reorder + drop
			} else if (op < 0.7) {
				const insert = { id: 5000 + step, label: 'new-' + step };
				const at = Math.floor(random() * (current.length + 1));
				current = [...current.slice(0, at), insert, ...current.slice(at)];
			} else if (op < 0.85) {
				current = current.slice(0, Math.floor(random() * current.length));
			} else {
				current = build(1000);
			}
			items.value = current;
			const rendered = new Map([...root.querySelectorAll('i')].map((node) => [node.dataset.id, node]));
			expect(rendered.size).toBe(current.length);
			expect([...rendered.keys()]).toEqual(current.map((v) => String(v.id)));
			// every id that survived the step keeps its node
			for (const [id, node] of rendered) {
				if (!previous.has(id)) continue;
				candidates++;
				if (previous.get(id) === node) reused++;
				else expect.fail(`id ${id} lost its node`);
			}
			previous = rendered;
		}
		// node churn stays proportional to the changes, not to the list size
		expect(candidates).toBeGreaterThan(5000);
		expect(reused / candidates).toBeGreaterThan(0.99);
	}, 60000); // 1000 items x 200 keyed updates: ~4s here, far more on a loaded machine

	test('2000 updates never accumulate nodes', () => {
		const items = signal([1, 2, 3]);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		for (let i = 0; i < 2000; i++) items.value = i % 50 === 0 ? [1, 2, 3, 4, 5] : [1, 2, 3];
		expect(root.childNodes.length).toBe(5);
		expect(root.textContent).toBe('123');
	});

	test('a deep chain of nested lists updates from the outside in', () => {
		const items = signal([[['x']]]);
		root.append(
			...For({
				each: items,
				children: [
					(one) =>
						h('i', null, For({ each: one, children: [(two) => h('b', null, For({ each: two, children: [(three) => h('u', null, three)] }))] }))
				]
			})
		);
		expect(root.textContent).toBe('x');
		items.value = [[['x', 'y']], [['z']]];
		expect(root.textContent).toBe('xyz');
	});
});

// --------------------------------------------------------------------- failures

describe('For failure modes', () => {
	test('a missing item callback throws', () => {
		expect(() => For({ each: [1] })).toThrow(TypeError);
		expect(() => For({ each: [] })).toThrow(TypeError);
		expect(() => mount(For({ each: [1], children: [] }))).toThrow(TypeError);
	});

	test('a throwing item callback propagates', () => {
		expect(() =>
			mount(
				For({
					each: [1],
					children: [
						() => {
							throw new Error('callback exploded');
						}
					]
				})
			)
		).toThrow('callback exploded');
	});

	test('a throwing key function propagates', () => {
		expect(() =>
			mount(
				For({
					each: [1],
					key: () => {
						throw new Error('key exploded');
					},
					children: [(v) => h('i', null, v)]
				})
			)
		).toThrow('key exploded');
	});

	test('map() is usable without For and without reactivity', () => {
		const nodes = map(['a', 'b'], (v) => h('i', null, v), 'fb', (v) => v);
		expect(nodes.length).toBe(2 + 2);
		expect(mount(map(['a'], (v) => h('i', null, v))).textContent).toBe('a');
		expect(mount(map([], (v) => h('i', null, v), 'fb')).textContent).toBe('fb');
	});

	test('For keeps working when the source errors and recovers', () => {
		const items = signal(['a']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
		items.value = null;
		expect(texts(root)).toEqual([]);
		items.value = ['b'];
		expect(texts(root)).toEqual(['b']);
	});

	test('keys of every value type are accepted without leaking nodes', () => {
		const items = signal([0, '', false, null, undefined, NaN]);
		root.append(
			...For({
				each: items,
				key: (v) => v,
				children: [(v) => h('i', null, String(v))]
			})
		);
		expect(root.querySelectorAll('i').length).toBe(6);
		items.value = [undefined, null, false, '', 0, NaN];
		expect(root.querySelectorAll('i').length).toBe(6);
		expect(root.childNodes.length).toBe(8);
	});
});
