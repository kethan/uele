/** @jsxImportSource uele */
/**
 * The three snippets printed under "Authoring guides" in README.md, run exactly
 * as documented - copy-paste code must not rot.
 *
 * The signal library below is a 25-line stand-in for any of the eleven real
 * ones: a cell, an effect runner with dependency tracking and a computed cell.
 * The plugin and the diff engine are the ones printed in the README.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { h, r, props, api, For } from 'uele';
import { scoped, install } from '../signals/internal.js';

/* ----------------------------------------------------------------- a library */

let track = null; // the effect (if any) that is currently reading

class Cell {
	constructor(v) {
		this.value = v;
		this.subs = new Set();
	}
	peek() {
		if (track) track(this); // subscribe the running effect
		return this.value;
	}
	set(v) {
		this.value = v;
		[...this.subs].forEach((f) => f());
	}
}

const effect = (fn) => {
	const deps = new Set();
	const run = () => {
		deps.forEach((d) => d.subs.delete(run));
		deps.clear();
		const prev = track;
		track = (cell) => (deps.add(cell), cell.subs.add(run));
		try {
			fn();
		} finally {
			track = prev;
		}
	};
	run();
	return () => deps.forEach((d) => d.subs.delete(run));
};

const computed = (fn) => {
	const out = new Cell();
	effect(() => out.set(fn()));
	return out;
};

const untracked = (fn) => {
	const prev = track;
	track = null;
	try {
		return fn();
	} finally {
		track = prev;
	}
};

/* -------------------------------------------------- snippet 1: write a plugin */

const tooltip = () => {
	props.set('tooltip', (node, value) => r(value, (text) => (node.title = text == null ? '' : text)));
	return () => props.delete('tooltip');
};

/* ------------------------------------------ snippet 2: write a signal adapter */

const useMySignals = (target = api) => {
	const s = scoped(effect);
	return install(target, {
		is: (v) => v instanceof Cell,
		get: (v) => v.peek(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => new Cell(v),
		computed,
		set: (cell, v) => cell.set(v),
		batch: (fn) => fn(),
		untracked
	});
};

/* ------------------------------------------- snippet 3: write a diff engine */

const useMyDiff = (target = api) => {
	const calls = [];
	target.udom = undefined;
	target.diff = (parent, oldNodes, newNodes, end) => {
		calls.push(newNodes.length);
		const keep = new Set(newNodes);
		oldNodes.forEach((node) => {
			if (!keep.has(node) && node.parentNode === parent) parent.removeChild(node);
		});
		let anchor = end || null;
		for (let i = newNodes.length - 1; i >= 0; i--) {
			const node = newNodes[i];
			if (node.parentNode !== parent || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
			anchor = node;
		}
	};
	return calls;
};

const text = (root) => [...root.querySelectorAll('li')].map((n) => n.textContent);

describe('the README authoring snippets', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		props.clear();
		useMySignals(); // a thunk only re-runs once a preset is installed
		api.diff = undefined;
		api.udom = undefined;
	});

	it('a plugin is a function that returns its own undo', () => {
		const off = tooltip();
		const label = new Cell('hi');

		const node = h('button', { tooltip: () => label.peek() }, 'Hover');
		expect(node.title).toBe('hi');

		label.set('bye'); // r() unwraps the thunk and follows the cell
		expect(node.title).toBe('bye');

		off();
		expect(props.has('tooltip')).toBe(false);

		// without the plugin the raw value is assigned - a cell stays a cell
		const stale = h('button', { tooltip: label });
		expect(stale.title).not.toBe('bye');
	});

	it('a signal adapter renders, derives and updates', () => {
		const count = new Cell(0);
		const double = computed(() => count.peek() * 2);

		const node = h('div', () => `${count.peek()}/${double.peek()}`);
		document.body.append(node);
		expect(node.textContent).toBe('0/0');

		count.set(2);
		expect(node.textContent).toBe('2/4');
		expect(untracked(() => count.peek())).toBe(2);
	});

	it('a diff engine is called for every list update', () => {
		const calls = useMyDiff();
		const items = new Cell(['a', 'b', 'c']);

		const view = (
			<ul>
				<For each={items}>{(item) => <li>{item}</li>}</For>
			</ul>
		);
		document.body.append(view);
		expect(text(view)).toEqual(['a', 'b', 'c']);

		items.set(['c', 'a', 'b']); // a pure reorder: three nodes, no rebuild
		expect(text(view)).toEqual(['c', 'a', 'b']);

		items.set(['c', 'a']); // and a removal
		expect(text(view)).toEqual(['c', 'a']);

		expect(calls.length).toBeGreaterThan(0);
		expect(view.querySelectorAll('li').length).toBe(2);
	});
});
