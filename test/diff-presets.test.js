import { useHeckel } from 'uele/diffs/heckel';
import { useListDifference } from 'uele/diffs/list-difference';
import { expect, test } from 'vitest';
import { useSpect } from 'uele/diffs/spect';
import { useSnabbdom } from 'uele/diffs/snabbdom';
import { useStage0 } from 'uele/diffs/stage0';

for (const install of [useSpect, useSnabbdom, useStage0, useHeckel, useListDifference]) {
	test(`${install.name}: clears udom, returns target and supports an unbounded region`, () => {
		const target = { udom: () => {} };
		expect(install(target)).toBe(target);
		expect(target.udom).toBeUndefined();
		const parent = document.createElement('div');
		const a = document.createTextNode('a');
		const b = document.createTextNode('b');
		const old = [a, b];
		const next = [b, a];
		parent.append(...old);
		target.diff(parent, old, next);
		expect([...parent.childNodes]).toEqual(next);
		expect(old).toEqual([a, b]);
		expect(next).toEqual([b, a]);
		target.diff(parent, next, []);
		expect(parent.childNodes.length).toBe(0);
		target.diff(parent, [], old);
		expect([...parent.childNodes]).toEqual(old);
	});
}

test('Stage0-style LIS moves only one node for a rotation', () => {
	const target = useStage0({});
	const parent = document.createElement('div');
	const nodes = Array.from('abcd', (value) => document.createTextNode(value));
	parent.append(...nodes);
	let moves = 0;
	const insert = parent.insertBefore.bind(parent);
	parent.insertBefore = (...args) => { moves++; return insert(...args); };
	target.diff(parent, nodes, [nodes[3], ...nodes.slice(0, 3)]);
	expect(parent.textContent).toBe('dabc');
	expect(moves).toBe(1);
});
