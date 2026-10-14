/**
 * Diff-engine conformance suite.
 *
 * Eight engines drive the same live-region scenarios through both entry points:
 * the built-in range replace, swapdom, udomdiff, domdiff, morphdom, nanomorph,
 * fast-array-diff and a minimal reference differ.
 *
 * The `api.diff` contract that every engine must satisfy:
 *   1. it is called as `api.diff(parent, oldNodes, newNodes, end)`, and as
 *      `api.diff(parent, oldNodes, newNodes, api.udom, end)` when `api.udom` is set;
 *   2. afterwards `parent` contains exactly `newNodes`, once each, in order;
 *   3. nodes outside the region (including the `end` marker and any static
 *      siblings) are untouched;
 *   4. uele keeps the `newNodes` array as the region's current content, so an
 *      engine that keeps old nodes has to write them back into that array.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as uele from '../src/index.js';
import * as lite from '../lite/index.js';
import { signal, effect } from 'ulive';
import { APIS, DEFAULT_API } from './helpers/signal-adapters.js';
import { ENGINES, installEngine, DEFAULT_DIFF, naiveMorphEngine, morphdom } from './helpers/diff-engines.js';

Object.assign(APIS.main, DEFAULT_DIFF, DEFAULT_API);
Object.assign(APIS.lite, DEFAULT_DIFF, DEFAULT_API);

const host = () => {
	const root = document.createElement('div');
	document.body.append(root);
	return root;
};

for (const [label, mod, apiTarget] of [
	['main', uele, APIS.main],
	['lite', lite, APIS.lite]
]) {
	const full = label === 'main';

	describe(`diff target: ${label}`, () => {
		beforeEach(() => {
			Object.assign(apiTarget, DEFAULT_API);
			apiTarget.effect = effect;
			apiTarget.is = (v) => v?.peek;
			apiTarget.get = (v) => v.value;
		});

		afterEach(() => {
			Object.assign(apiTarget, DEFAULT_DIFF);
			Object.assign(apiTarget, DEFAULT_API);
		});

		for (const engine of ENGINES) {
			describe(engine.name, () => {
				let root;
				beforeEach(() => {
					installEngine(apiTarget, engine, { effect, is: (v) => v?.peek, get: (v) => v.value });
					root = host();
				});
				afterEach(() => root.remove());

				test('updates a live region through grow, shrink, reorder and clear', () => {
					const { h, useLive } = mod;
					const [nodes, set] = useLive([h('i', null, 'a')]);
					root.append(...nodes, 'tail');
					const read = () => root.textContent;
					const list = (...items) => items.map((t) => h('i', null, t));

					expect(read()).toBe('atail');
					set(list('a', 'b'));
					expect(read()).toBe('abtail');
					set(list('b'));
					expect(read()).toBe('btail');
					set([]);
					expect(read()).toBe('tail');
					set(list('x', 'y', 'z'));
					expect(read()).toBe('xyztail');
					set(list('z', 'x'));
					expect(read()).toBe('zxtail');
					set(list('x', 'z'));
					expect(read()).toBe('xztail');
					// two markers, two items and the trailing text node
					expect(root.childNodes.length).toBe(2 + 2 + 1);
					expect(root.lastChild.nodeValue).toBe('tail');
				});

				test('keeps sibling regions and static nodes in place', () => {
					const { h, useLive } = mod;
					const [first, setFirst] = useLive([h('b', null, '1')]);
					const [second, setSecond] = useLive([h('b', null, '2')]);
					const staticNode = h('b', null, 'static');
					root.append(...first, ...second, staticNode);
					expect(root.textContent).toBe('12static');
					setFirst([h('b', null, '1a'), h('b', null, '1b')]);
					expect(root.textContent).toBe('1a1b2static');
					setSecond([]);
					expect(root.textContent).toBe('1a1bstatic');
					setSecond([h('b', null, '2a')]);
					expect(root.textContent).toBe('1a1b2astatic');
					setFirst([]);
					expect(root.textContent).toBe('2astatic');
					// the static node is still last and still the same object
					expect(root.lastChild).toBe(staticNode);
				});

				test('drives a reactive cell through add()', () => {
					const { h, add } = mod;
					const cell = signal('a');
					root.append(...add(cell));
					expect(root.textContent).toBe('a');
					cell.value = 'b';
					expect(root.textContent).toBe('b');
					cell.value = 42;
					expect(root.textContent).toBe('42');
				});

				test('markers stay in the parent between updates', () => {
					const { h, useLive } = mod;
					const [nodes, set] = useLive([h('i', null, 'a')]);
					root.append(...nodes);
					const [sm, em] = [root.firstChild, root.lastChild];
					expect(sm.nodeValue).toBe('');
					expect(em.nodeValue).toBe('');
					for (let i = 0; i < 20; i++) {
						set([h('i', null, String(i))]);
						expect(root.firstChild).toBe(sm);
						expect(root.lastChild).toBe(em);
						expect(sm.parentNode).toBe(root);
						expect(em.parentNode).toBe(root);
					}
					expect(root.textContent).toBe('19');
				});

				test('100 mixed updates do not accumulate nodes', () => {
					const { h, useLive } = mod;
					const [nodes, set] = useLive([]);
					root.append(...nodes);
					const size = () => root.childNodes.length;
					const empty = size();
					for (let i = 0; i < 100; i++) {
						set(i % 3 === 0 ? [] : [h('i', null, String(i)), h('i', null, String(i + 1))]);
						set([]);
						expect(size()).toBe(empty);
					}
					expect(root.textContent).toBe('');
				});

				test('a removed host can still be updated without touching the document', () => {
					const { h, add } = mod;
					const cell = signal('a');
					root.append(...add(cell));
					root.remove();
					expect(() => {
						cell.value = 'b';
					}).not.toThrow();
					expect(document.body.contains(root)).toBe(false);
				});

				if (full) {
					test('a keyed list keeps content and reuses surviving nodes', () => {
						const items = signal([
							{ id: 'a' },
							{ id: 'b' },
							{ id: 'c' }
						]);
						root.append(
							...uele.For({
								each: items,
								key: (item) => item.id,
								children: [(item) => uele.h('u', { 'data-id': item.id }, item.id)]
							})
						);
						const ids = () => [...root.querySelectorAll('u')].map((n) => n.dataset.id);
						const before = [...root.querySelectorAll('u')];
						expect(ids()).toEqual(['a', 'b', 'c']);
						items.value = [
							{ id: 'c' },
							{ id: 'a' },
							{ id: 'b' },
							{ id: 'd' }
						];
						const after = [...root.querySelectorAll('u')];
						expect(ids()).toEqual(['c', 'a', 'b', 'd']);
						// map() reuses nodes itself, so the surviving keys are the same objects
						expect(after.filter((n) => before.includes(n)).length).toBe(3);
						items.value = [];
						expect(ids()).toEqual([]);
						items.value = [{ id: 'z' }];
						expect(ids()).toEqual(['z']);
					});

					test('If and Switch update through the differ', () => {
						const on = signal(true);
						root.append(...uele.add(uele.If({ when: on, children: ['yes'], fallback: uele.h('em', null, 'no') })));
						expect(root.textContent).toBe('yes');
						on.value = false;
						expect(root.textContent).toBe('no');
						on.value = true;
						expect(root.textContent).toBe('yes');
						const page = signal(1);
						const branch = () => (page.value === 1 ? 'one' : page.value === 2 ? 'two' : '');
						root.replaceChildren();
						root.append(...uele.add(uele.Switch({ children: [branch], fallback: 'none' })));
						expect(root.textContent).toBe('one');
						page.value = 3;
						expect(root.textContent).toBe('none');
					});
				}
			});
		}
	});
}

// ---------------------------------------------------------------- the contract

describe('api.diff call contract', () => {
	let root;
	beforeEach(() => {
		installEngine(APIS.main, { install: () => {} }, { effect, is: (v) => v?.peek, get: (v) => v.value });
		root = host();
	});
	afterEach(() => {
		Object.assign(APIS.main, DEFAULT_DIFF, DEFAULT_API);
		root.remove();
	});

	test('is called as (parent, oldNodes, newNodes, end)', () => {
		const calls = [];
		APIS.main.diff = (...args) => calls.push(args);
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		const em = root.lastChild;
		set([uele.h('i', null, 'b')]);
		expect(calls).toHaveLength(1);
		const [parent, oldNodes, newNodes, end] = calls[0];
		expect(parent).toBe(root);
		expect(oldNodes.map((n) => n.textContent)).toEqual(['a']);
		expect(newNodes.map((n) => n.textContent)).toEqual(['b']);
		expect(end).toBe(em);
	});

	test('is called as (parent, oldNodes, newNodes, api.udom, end) when api.udom is set', () => {
		const calls = [];
		const udom = (node) => node;
		APIS.main.udom = udom;
		APIS.main.diff = (...args) => calls.push(args);
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		const em = root.lastChild;
		set([uele.h('i', null, 'b')]);
		expect(calls[0][3]).toBe(udom);
		expect(calls[0][4]).toBe(em);
	});

	test('the oldNodes of the next call are the nodes it inserted', () => {
		const calls = [];
		APIS.main.diff = (...args) => {
			calls.push(args);
			args[1].forEach((n) => n.parentNode && n.parentNode.removeChild(n));
			args[2].forEach((n) => args[0].insertBefore(n, args[3] || null));
		};
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		const first = [uele.h('i', null, 'b')];
		set([...first]);
		set([uele.h('i', null, 'c')]);
		expect(calls[1][1]).toEqual(first);
	});

	test('an engine that keeps nodes must write them back into newNodes', () => {
		// documented requirement: uele stores the array it passed as oldNodes
		const naive = { install: naiveMorphEngine(morphdom) };
		installEngine(APIS.main, naive, { effect, is: (v) => v?.peek, get: (v) => v.value });
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes, 'tail');
		set([uele.h('i', null, 'b')]);
		// the morph happened, but uele now tracks a node that is not in the dom
		expect(root.textContent).toBe('btail');
		set([uele.h('i', null, 'c')]);
		expect(root.textContent).toBe('btail');
		expect(() => set([])).toThrow(/not a child of this node/i);
	});

	test('exceptions from a differ are not swallowed', () => {
		APIS.main.diff = () => {
			throw new Error('differ exploded');
		};
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		expect(() => set([uele.h('i', null, 'b')])).toThrow('differ exploded');
	});

	test('the return value of a differ is ignored', () => {
		APIS.main.diff = (parent, oldNodes, newNodes, end) => {
			oldNodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
			newNodes.forEach((n) => parent.insertBefore(n, end || null));
			return 'not an array';
		};
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		set([uele.h('i', null, 'b')]);
		expect(root.textContent).toBe('b');
		set([uele.h('i', null, 'c')]);
		expect(root.textContent).toBe('c');
	});

	test('a differ is not required at all (undefined falls back to the range replace)', () => {
		APIS.main.diff = undefined;
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes, 'tail');
		set([uele.h('i', null, 'b'), uele.h('i', null, 'c')]);
		expect(root.textContent).toBe('bctail');
	});
});

// ------------------------------------------------------------ engine specifics

describe('engine specifics', () => {
	let root;
	beforeEach(() => {
		root = host();
	});
	afterEach(() => {
		Object.assign(APIS.main, DEFAULT_DIFF, DEFAULT_API);
		root.remove();
	});

	test('swapdom can replace its DOM helpers (swap.insert/remove/replace)', () => {
		const seen = [];
		installEngine(APIS.main, ENGINES[1], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const swap = APIS.main.diff;
		const original = { insert: swap.insert, remove: swap.remove, replace: swap.replace };
		try {
			swap.insert = (anchor, node, parent) => (seen.push('insert'), original.insert(anchor, node, parent));
			swap.remove = (node, parent) => (seen.push('remove'), original.remove(node, parent));
			const [nodes, set] = uele.useLive([]);
			root.append(...nodes);
			set([uele.h('i', null, 'a')]);
			set([]);
			expect(seen).toContain('insert');
			expect(seen).toContain('remove');
		} finally {
			Object.assign(swap, original);
		}
	});

	test('udomdiff asks the api.udom callback for every node action', () => {
		const actions = [];
		installEngine(APIS.main, ENGINES[2], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const get = APIS.main.udom;
		APIS.main.udom = (node, action) => (actions.push(action), get(node, action));
		const [nodes, set] = uele.useLive([]);
		root.append(...nodes);
		set([uele.h('i', null, 'a'), uele.h('i', null, 'b')]);
		set([uele.h('i', null, 'b')]);
		expect(actions.length).toBeGreaterThan(0);
		expect(actions.every((a) => typeof a === 'number')).toBe(true);
		expect(actions).toContain(1); // append
		expect(actions).toContain(-1); // remove
	});

	test('domdiff receives the end marker through its options bag', () => {
		const seen = [];
		installEngine(APIS.main, ENGINES[3], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const diff = APIS.main.diff;
		APIS.main.diff = (parent, oldNodes, newNodes, end) => {
			seen.push(end);
			return diff(parent, oldNodes, newNodes, end);
		};
		const [nodes, set] = uele.useLive([]);
		root.append(...nodes, 'tail');
		const em = root.childNodes[1];
		set([uele.h('i', null, 'a')]);
		expect(seen[0]).toBe(em);
		expect(root.textContent).toBe('atail');
	});

	test('fast-array-diff keeps the LCS in place and only moves the rest', () => {
		installEngine(APIS.main, ENGINES[6], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const [nodes, set] = uele.useLive([uele.h('i', { 'data-id': 'a' }), uele.h('i', { 'data-id': 'b' }), uele.h('i', { 'data-id': 'c' })]);
		root.append(...nodes);
		const [a, b, c] = root.querySelectorAll('i');
		const moves = [];
		const insertBefore = root.insertBefore.bind(root);
		root.insertBefore = (node, anchor) => (moves.push(node.dataset.id), insertBefore(node, anchor));
		set([c, a, b]);
		expect([...root.querySelectorAll('i')].map((n) => n.dataset.id)).toEqual(['c', 'a', 'b']);
		// the LCS (a, b) is never re-inserted, only the head that moved
		expect(moves.length).toBeLessThan(3);
		expect(moves).not.toContain('c');
		expect([a, b, c].every((n) => n.isConnected)).toBe(true);
	});

	test('morph engines update in place instead of replacing nodes', () => {
		installEngine(APIS.main, ENGINES[4], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const [nodes, set] = uele.useLive([uele.h('i', { title: 'a' }, 'a')]);
		root.append(...nodes);
		const first = root.querySelector('i');
		set([uele.h('i', { title: 'b' }, 'b')]);
		const second = root.querySelector('i');
		expect(second).toBe(first);
		expect(second.getAttribute('title')).toBe('b');
		expect(second.textContent).toBe('b');
	});

	test('the rebuild differ replaces every node (no reuse)', () => {
		installEngine(APIS.main, ENGINES[7], { effect, is: (v) => v?.peek, get: (v) => v.value });
		const [nodes, set] = uele.useLive([uele.h('i', null, 'a')]);
		root.append(...nodes);
		const first = root.querySelector('i');
		set([uele.h('i', null, 'a')]);
		expect(root.querySelector('i')).not.toBe(first);
		expect(root.textContent).toBe('a');
	});
});
