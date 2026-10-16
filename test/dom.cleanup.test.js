/**
 * DOM cleanup: what uele leaves behind after updates.
 *
 * The contract: a live region owns exactly the span between its markers, replaced
 * content is detached (never orphaned inside the parent), a region whose markers have
 * no parent is inert, attributes/styles/classes are removed when their value goes
 * away, and nothing is left in the document after an unmount.
 *
 * Markers are the empty text nodes uele creates per region: a region around a plain
 * value has two, and an empty text value (or placeholder) counts as one as well, so
 * the walk below is written against `childNodes.length` plus a marker helper only
 * where the count is unambiguous.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { h, add, useLive, For, If, Switch, Dynamic, lazy, api } from '../src/index.js';
import { signal, effect } from 'ulive';
import { ENGINES, installEngine, DEFAULT_DIFF } from './helpers/diff-engines.js';

api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const markers = (node) => [...node.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue === '');
const orphans = (...nodes) => nodes.every((node) => node.parentNode === null);
const shape = (node) =>
	[...node.childNodes].map((n) => (n.nodeType === 3 ? `text:${JSON.stringify(n.nodeValue)}` : n.nodeName.toLowerCase()));

let root;
beforeEach(() => {
	document.body.innerHTML = '';
	root = document.createElement('div');
	document.body.append(root);
});

describe('live region cleanup', () => {
	test('updating a region detaches the nodes it replaces', () => {
		const [nodes, set] = useLive('a');
		root.append(...add(nodes));
		const [sm, content, em] = root.childNodes;
		expect(content.nodeValue).toBe('a');
		set('b');
		expect(orphans(content)).toBe(true);
		expect(shape(root)).toEqual(['text:""', 'text:"b"', 'text:""']);
		expect(root.firstChild).toBe(sm);
		expect(root.lastChild).toBe(em);
	});

	test('a signal inside a region nests a second region, writable from both sides', () => {
		const cell = signal('a');
		const [nodes, set] = useLive(cell);
		root.append(...add(nodes));
		expect(root.childNodes.length).toBe(5); // outer markers + inner region
		expect(root.textContent).toBe('a');
		const before = [...root.childNodes];
		cell.value = 'c';
		// the inner region replaces its own content and keeps its markers; the outer pair stays put
		expect(root.childNodes.length).toBe(5);
		expect(root.firstChild).toBe(before[0]);
		expect(root.lastChild).toBe(before[4]);
		expect(root.textContent).toBe('c');
		set('b');
		// writing the outer value drops the nested region entirely, leaving one pair of markers
		expect(orphans(...before.slice(1, -1))).toBe(true);
		expect(markers(root).length).toBe(2);
		expect(root.textContent).toBe('b');
		cell.value = 'd'; // the nested region is gone for good
		expect(root.textContent).toBe('b');
	});

	test('repeated updates never add a second pair of markers', () => {
		const [nodes, set] = useLive('0');
		root.append(...add(nodes));
		for (let i = 1; i <= 50; i++) set(String(i));
		expect(markers(root).length).toBe(2);
		expect(root.textContent).toBe('50');
		expect(root.childNodes.length).toBe(3);
	});

	test('clearing a region keeps its markers and drops the content', () => {
		const [nodes, set] = useLive('a');
		root.append(...add(nodes));
		const [sm, content, em] = root.childNodes;
		set('');
		expect(orphans(content)).toBe(true);
		expect(root.firstChild).toBe(sm);
		expect(root.lastChild).toBe(em);
		expect(() => set('')).not.toThrow();
	});

	test('a region that is never mounted is inert, and works once mounted', () => {
		const [nodes, set] = useLive('a');
		set('b');
		expect(nodes.every((node) => node.parentNode === null)).toBe(true);
		root.append(...add(nodes));
		set('c');
		expect(root.textContent).toBe('c');
	});

	test('removing a marker makes the region inert instead of throwing', () => {
		const [nodes, set] = useLive('a');
		root.append(...add(nodes));
		const [sm] = root.childNodes;
		sm.remove();
		expect(() => set('b')).not.toThrow();
		expect(root.textContent).toBe('a'); // the detached half is not written to
	});

	test('a region inside a detached subtree still updates its own nodes', () => {
		const host = document.createElement('div');
		const [nodes, set] = useLive('a');
		host.append(...add(nodes));
		set('b');
		expect(host.textContent).toBe('b');
		expect(host.parentNode).toBe(null);
		expect(root.childNodes.length).toBe(0);
	});

	test('a hand-inserted node inside the span is swept by the next update', () => {
		const [nodes, set] = useLive('a');
		root.append(...add(nodes));
		const stray = document.createElement('u');
		root.lastChild.before(stray);
		set('b');
		expect(orphans(stray)).toBe(true);
		expect(root.textContent).toBe('b');
	});

	test('siblings outside the region are never touched', () => {
		const [nodes, set] = useLive('a');
		const before = document.createElement('hr');
		const after = document.createTextNode('tail');
		root.append(before, ...add(nodes), after);
		set('b');
		set('c');
		expect(root.firstChild).toBe(before);
		expect(root.lastChild).toBe(after);
		expect(root.childNodes.length).toBe(5);
	});

	test('two regions side by side stay independent', () => {
		const [ln, lset] = useLive('L1');
		const [rn, rset] = useLive('R1');
		root.append(...add(ln), document.createElement('hr'), ...add(rn));
		lset('L2');
		expect(root.textContent).toBe('L2R1');
		rset('R2');
		expect(root.textContent).toBe('L2R2');
		expect(root.childNodes.length).toBe(7);
	});

	test('a promise placeholder is replaced, not stacked', async () => {
		let resolve;
		const promise = new Promise((r) => (resolve = r));
		root.append(...add(promise));
		const placeholder = root.childNodes[1];
		expect(root.textContent).toBe('');
		resolve(h('i', null, 'done'));
		await new Promise((r) => setTimeout(r, 0));
		expect(placeholder.parentNode).toBe(null); // swept, not left behind
		expect(root.childNodes.length).toBe(3);
		expect(markers(root).length).toBe(2);
		expect(root.querySelector('i').textContent).toBe('done');
		expect(root.innerHTML).toBe('<i>done</i>');
	});

	test('lazy shows nothing until the module resolves and its fallback on error', async () => {
		const file = () => Promise.resolve({ default: (props) => h('i', null, props.v) });
		root.append(...add(lazy(file, h('b', null, 'fallback'))({ v: 'ready' })));
		expect(root.textContent).toBe('');
		await new Promise((r) => setTimeout(r, 0));
		expect(root.textContent).toBe('ready');
		expect(root.querySelector('b')).toBe(null);

		const broken = () => Promise.reject(new Error('offline'));
		const other = document.createElement('div');
		other.append(...add(lazy(broken, h('b', null, 'fallback'))({})));
		await new Promise((r) => setTimeout(r, 0));
		expect(other.textContent).toBe('fallback');
	});
});

describe('control flow cleanup', () => {
	test('If detaches the branch it leaves behind', () => {
		const cond = signal(true);
		root.append(...add(If({ when: cond, children: [h('i', null, 'T')], fallback: h('b', null, 'F') })));
		const truthy = root.querySelector('i');
		cond.value = false;
		expect(orphans(truthy)).toBe(true);
		expect(root.querySelector('b').textContent).toBe('F');
		const falsy = root.querySelector('b');
		cond.value = true;
		expect(orphans(falsy)).toBe(true);
		expect(root.querySelector('i').textContent).toBe('T');
		expect(root.querySelector('b')).toBe(null);
	});

	test('Switch replaces the whole branch and falls back', () => {
		const which = signal('a');
		root.append(
			...add(
				Switch({
					children: [
						() => (which.value === 'a' ? h('i', null, 'A') : ''),
						() => (which.value === 'b' ? h('i', null, 'B') : ''),
						() => (which.value === 'c' ? [h('i', null, 'C'), h('u', null, 'c')] : '')
					],
					fallback: h('b', null, 'none')
				})
			)
		);
		const a = root.querySelector('i');
		which.value = 'b';
		expect(orphans(a)).toBe(true);
		expect(root.querySelector('i').textContent).toBe('B');
		which.value = 'c';
		expect(root.querySelector('i').textContent).toBe('C');
		const branch = [...root.querySelectorAll('i,u')];
		which.value = 'z';
		expect(orphans(...branch)).toBe(true);
		expect(root.querySelector('b').textContent).toBe('none');
		expect(root.querySelectorAll('i,u').length).toBe(0);
	});

	test('Dynamic swaps the component and detaches the old nodes', () => {
		const A = () => h('i', null, 'A');
		const B = () => h('u', null, 'B');
		const [nodes, set] = useLive(Dynamic({ component: A }));
		root.append(...add(nodes));
		const a = root.querySelector('i');
		set(Dynamic({ component: B }));
		expect(orphans(a)).toBe(true);
		expect(root.querySelector('u').textContent).toBe('B');
		const b = root.querySelector('u');
		set(Dynamic({ component: A }));
		expect(orphans(b)).toBe(true);
		expect(root.querySelector('u')).toBe(null);
		expect(root.querySelector('i').textContent).toBe('A');
	});

	test('For removes the nodes of dropped keys from the document', () => {
		const items = signal(['a', 'b', 'c']);
		root.append(...For({ each: items, children: [(v) => h('i', null, v)], fallback: h('b', null, 'none') }));
		const [a, b, c] = root.querySelectorAll('i');
		items.value = ['b'];
		expect(orphans(a, c)).toBe(true);
		expect(b.parentNode).toBe(root);
		items.value = [];
		expect(orphans(b)).toBe(true);
		expect(root.querySelectorAll('i').length).toBe(0);
		expect(root.querySelector('b').textContent).toBe('none');
		expect(markers(root).length).toBe(2);
	});

	test('a control flow round trip leaves no stale nodes', () => {
		const show = signal(true);
		const items = signal([1, 2]);
		root.append(
			...add(
				If({
					when: show,
					children: [(on) => (on ? For({ each: items, children: [(v) => h('i', null, v)] }) : '')]
				})
			)
		);
		for (let i = 0; i < 5; i++) {
			show.value = false;
			// the branch is dropped, leaving the region and its empty placeholder
			expect(root.textContent).toBe('');
			expect(root.querySelectorAll('i').length).toBe(0);
			expect(root.childNodes.length).toBe(3);
			show.value = true;
			expect(root.querySelectorAll('i').length).toBe(2);
			expect(root.textContent).toBe('12');
			expect(root.childNodes.length).toBe(6);
		}
	});
});

describe('attribute and binding cleanup', () => {
	test('a live attribute is removed when its value becomes null or false', () => {
		const cell = signal('a');
		const node = h('div', { 'data-x': cell, title: 'static' });
		root.append(node);
		expect(node.getAttribute('data-x')).toBe('a');
		cell.value = 'b';
		expect(node.getAttribute('data-x')).toBe('b');
		cell.value = null;
		expect(node.hasAttribute('data-x')).toBe(false);
		expect(node.getAttribute('title')).toBe('static');
		cell.value = '';
		expect(node.hasAttribute('data-x')).toBe(true);
		expect(node.getAttribute('data-x')).toBe('');
		cell.value = false;
		expect(node.hasAttribute('data-x')).toBe(false);
		cell.value = true;
		expect(node.getAttribute('data-x')).toBe('');
	});

	test('a live property that shadows an attribute empties instead of removing', () => {
		// `title` is an element property, so the value goes through the property path
		const cell = signal('a');
		const node = h('div', { title: cell });
		root.append(node);
		cell.value = null;
		expect(node.hasAttribute('title')).toBe(true);
		expect(node.getAttribute('title')).toBe('');
		cell.value = 'b';
		expect(node.getAttribute('title')).toBe('b');
	});

	test('a boolean attribute follows its value', () => {
		const cell = signal(true);
		const node = h('div', { hidden: cell });
		root.append(node);
		expect(node.getAttribute('hidden')).toBe('');
		cell.value = false;
		expect(node.hasAttribute('hidden')).toBe(false);
		cell.value = true;
		expect(node.getAttribute('hidden')).toBe('');
		cell.value = undefined;
		expect(node.hasAttribute('hidden')).toBe(false);
	});

	test('a live style map clears properties again', () => {
		const width = signal('10px');
		const node = h('div', { style: { width: width, opacity: '1' } });
		root.append(node);
		expect(node.style.width).toBe('10px');
		width.value = '20px';
		expect(node.style.width).toBe('20px');
		width.value = null;
		expect(node.style.width).toBe('');
		expect(node.getAttribute('style')).toBe('opacity: 1;');
		width.value = '30px';
		expect(node.getAttribute('style')).toBe('opacity: 1; width: 30px;');
	});

	test('a live custom property is set and removed through the css api', () => {
		const tint = signal('red');
		const node = h('div', { style: { '--tint': tint } });
		root.append(node);
		expect(node.style.getPropertyValue('--tint')).toBe('red');
		tint.value = 'blue';
		expect(node.style.getPropertyValue('--tint')).toBe('blue');
		tint.value = null;
		expect(node.style.getPropertyValue('--tint')).toBe('');
	});

	test('a live class map toggles and clears', () => {
		const on = signal(true);
		const node = h('div', { class: { on: on, base: true } });
		root.append(node);
		expect(node.classList.contains('on')).toBe(true);
		on.value = false;
		expect(node.classList.contains('on')).toBe(false);
		expect(node.classList.contains('base')).toBe(true);
		expect(node.className).toBe('base');
	});

	test('a native handler is a property, so it can be replaced and cleared', () => {
		const first = vi.fn();
		const node = h('button', { onclick: first });
		root.append(node);
		node.dispatchEvent(new MouseEvent('click'));
		expect(first).toHaveBeenCalledTimes(1);
		const second = vi.fn();
		node.onclick = second;
		node.dispatchEvent(new MouseEvent('click'));
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		node.onclick = null;
		node.dispatchEvent(new MouseEvent('click'));
		expect(second).toHaveBeenCalledTimes(1);
		expect(node.onclick).toBe(null);
	});

	test('removing a node takes its bindings with it and stops touching the document', () => {
		const cell = signal('a');
		const handler = vi.fn();
		const node = h('div', { title: cell, onclick: handler }, cell);
		root.append(node);
		node.remove();
		cell.value = 'b';
		expect(node.textContent).toBe('b'); // the binding still updates the detached node
		expect(node.parentNode).toBe(null);
		node.dispatchEvent(new MouseEvent('click'));
		expect(handler).toHaveBeenCalledTimes(1);
		expect(root.childNodes.length).toBe(0);
	});

	test('a style property that is not a css property is cleared, not kept', () => {
		const node = h('div', { style: { '--x': '1', width: '5px' }, class: { a: true, b: false } });
		root.append(node);
		expect(node.style.getPropertyValue('--x')).toBe('1');
		node.style.removeProperty('--x');
		expect(node.getAttribute('style')).toBe('width: 5px;');
		expect(node.classList.contains('b')).toBe(false);
	});
});

describe('no global leakage', () => {
	test('mounting and unmounting leaves the document as it was', () => {
		const cell = signal('a');
		for (let i = 0; i < 20; i++) {
			const host = document.createElement('div');
			document.body.append(host);
			host.append(...add(h('i', null, cell), useLive([h('u', null, 'u')])[0]));
			host.remove();
		}
		expect(document.body.childNodes.length).toBe(1); // just the test root
		expect(root.childNodes.length).toBe(0);
		expect(document.querySelectorAll('i,u').length).toBe(0);
	});

	test('regions never re-attach themselves after their parent is gone', () => {
		const [nodes, set] = useLive('a');
		root.append(...add(nodes));
		root.remove();
		set('b');
		set('c');
		expect(document.body.contains(root)).toBe(false);
		expect(nodes[0].parentNode).toBe(root);
		expect(root.textContent).toBe('c');
	});

	test('api.diff can be removed without leaving the region half-managed', () => {
		const items = signal([1]);
		api.diff = (parent, oldNodes, newNodes, end) => {
			oldNodes.forEach((node) => parent.removeChild(node));
			newNodes.forEach((node) => parent.insertBefore(node, end || null));
		};
		try {
			root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
			items.value = [1, 2];
			expect(root.querySelectorAll('i').length).toBe(2);
		} finally {
			delete api.diff;
		}
		items.value = [3];
		expect(root.querySelectorAll('i').length).toBe(1);
		expect(root.textContent).toBe('3');
	});
});

/**
 * The cleanup contract must hold whichever differ is configured: after a region
 * updates, `parent` holds exactly the new nodes, the markers are never moved, and a
 * node that is no longer content is either reused in place (the in-place morphs
 * update the node they were handed) or detached - never left dangling.
 */
describe('cleanup under every differ', () => {
	for (const engine of ENGINES) {
		describe(engine.name, () => {
			beforeEach(() => installEngine(api, engine, { effect, is: (v) => v?.peek, get: (v) => v.value }));
			afterEach(() => Object.assign(api, DEFAULT_DIFF, { effect, is: (v) => v?.peek, get: (v) => v.value }));

			test('a region update replaces its content and keeps its markers', () => {
				const [nodes, set] = useLive('a');
				root.append(...add(nodes));
				const sm = root.firstChild;
				const em = root.lastChild;
				const content = root.childNodes[1];
				set('b');
				expect(root.textContent).toBe('b');
				expect(root.childNodes.length).toBe(3);
				expect(root.firstChild).toBe(sm);
				expect(root.lastChild).toBe(em);
				expect(root.childNodes[1]).not.toBe(sm);
				expect(root.childNodes[1] === content || content.parentNode === null).toBe(true);
				expect(sm.parentNode).toBe(root);
				expect(em.parentNode).toBe(root);
			});

			test('a shrinking keyed list leaves only its markers and its rows', () => {
				const items = signal(['a', 'b', 'c']);
				root.append(...For({ each: items, children: [(v) => h('i', null, v)] }));
				const rows = [...root.querySelectorAll('i')];
				items.value = ['b'];
				expect(root.querySelectorAll('i').length).toBe(1);
				expect(root.childNodes.length).toBe(3); // sm, row, em
				expect(root.querySelector('i')).toBe(rows[1]); // keyed reuse keeps the node itself
				expect(rows.filter((node) => node.parentNode !== null)).toHaveLength(1);
				expect(root.childNodes[0].nodeValue).toBe('');
				expect(root.childNodes[2].nodeValue).toBe('');
			});

			test('a control flow swap detaches the branch it replaces', () => {
				const cond = signal(true);
				root.append(...add(If({ when: cond, children: [h('i', null, 'T')], fallback: h('b', null, 'F') })));
				const truthy = root.querySelector('i');
				cond.value = false;
				expect(orphans(truthy)).toBe(true);
				expect(root.querySelector('b').textContent).toBe('F');
				expect(root.querySelectorAll('i').length).toBe(0);
				cond.value = true;
				expect(root.querySelectorAll('i').length).toBe(1);
				expect(root.querySelectorAll('b').length).toBe(0);
			});

			test('unmounting the region leaves the document clean', () => {
				const cell = signal('a');
				const [nodes] = useLive(cell);
				root.append(...add(nodes));
				const wrapper = document.createElement('section');
				document.body.append(wrapper);
				wrapper.append(root);
				root.remove();
				expect(document.body.childNodes.length).toBe(1); // the wrapper, and nothing else
				expect(root.childNodes.length).toBe(5); // outer markers + the nested signal region
				cell.value = 'c'; // still reactive while detached
				expect(root.textContent).toBe('c');
				expect(document.body.textContent).toBe('');
			});
		});
	}
});
