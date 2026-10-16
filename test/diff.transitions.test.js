/**
 * Exhaustive diff transitions.
 *
 * Every ordered pair of list states over a four-node pool is pushed through
 * every `api.diff` engine (65 states -> 4 225 transitions per engine, 42 250
 * per run). The contract checked after each transition is the one
 * `Live.replace` relies on:
 *
 *   1. the parent's span between the markers is exactly `newNodes`, in order,
 *      once each;
 *   2. the markers and static siblings are untouched;
 *   3. old nodes not in `newNodes` are detached (not orphaned inside parent);
 *   4. shared nodes keep their identity (they are moved, never recreated).
 *
 * Nodes carry their label so a failure names the exact transition.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { APIS, DEFAULT_API } from './helpers/signal-adapters.js';
import { ENGINES, installEngine, DEFAULT_DIFF } from './helpers/diff-engines.js';
import { effect } from 'ulive';

const apiTarget = APIS.main;
const POOL = ['a', 'b', 'c', 'd'];

/** all ordered subsets of POOL (length 0..4): 1 + 4 + 12 + 24 + 24 = 65 states */
const states = [[]];
{
	const permute = (len) => {
		const walk = (prefix, rest) => {
			if (prefix.length === len) return states.push(prefix);
			for (let i = 0; i < rest.length; i++) walk([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
		};
		walk([], POOL);
	};
	for (let len = 1; len <= POOL.length; len++) permute(len);
}

const label = (node) => node.textContent;
const snap = (nodes) => nodes.map(label).join('');

describe('exhaustive diff transitions', () => {
	beforeEach(() => {
		Object.assign(apiTarget, DEFAULT_API, DEFAULT_DIFF);
		apiTarget.effect = effect;
		apiTarget.is = (v) => v?.peek;
		apiTarget.get = (v) => v.value;
	});
	afterEach(() => {
		Object.assign(apiTarget, DEFAULT_DIFF, DEFAULT_API);
		document.body.replaceChildren();
	});

	for (const engine of ENGINES) {
		test(`${engine.name}: all ${states.length * states.length} state transitions`, () => {
			installEngine(apiTarget, engine, { effect, is: (v) => v?.peek, get: (v) => v.value });
			let done = 0;
			for (const from of states) {
				for (const to of states) {
					const root = document.createElement('div');
					const before = document.createElement('i');
					const after = document.createElement('i');
					const sm = document.createTextNode('');
					const em = document.createTextNode('');
					root.append(before, sm, em, after); // `after` is a static sibling after the end marker
					document.body.append(root);

					// one node object per label per transition; shared labels are shared nodes
					const nodes = new Map();
					const of = (list) => list.map((l) => {
						if (!nodes.has(l)) {
							const el = document.createElement('x');
							el.textContent = l;
							nodes.set(l, el);
						}
						return nodes.get(l);
					});
					const oldNodes = of(from);
					const newNodes = of(to);
					sm.after(...oldNodes);

					// exactly how Live.replace invokes a differ (or its marker-walk fallback)
					try {
						if (apiTarget.diff) apiTarget.diff(root, oldNodes, newNodes, apiTarget.udom || em, apiTarget.udom && em);
						else {
							for (let node = sm.nextSibling; node && node !== em; node = sm.nextSibling) node.remove();
							sm.after(...newNodes);
						}
					} catch (error) {
						throw new Error(`[from=${snap(oldNodes) || '∅'} to=${snap(newNodes) || '∅'}] threw: ${error.message}`);
					}

					// 1. the span between the markers is exactly newNodes
					const span = [];
					for (let n = sm.nextSibling; n && n !== em; n = n.nextSibling) span.push(n);
					for (let i = 0; i < span.length || i < newNodes.length; i++) {
						if (span[i] !== newNodes[i]) {
							throw new Error(
								`[from=${snap(oldNodes) || '∅'} to=${snap(newNodes) || '∅'}] span ${snap(span) || '∅'} !== ${snap(newNodes) || '∅'} at ${i}`
							);
						}
					}
					// 2. markers and static siblings untouched
					if (sm.parentNode !== root || em.parentNode !== root || before.nextSibling !== sm || em.nextSibling !== after) {
						throw new Error(`[from=${snap(oldNodes) || '∅'} to=${snap(newNodes) || '∅'}] markers/siblings moved`);
					}
					// 3. dead old nodes are detached, survivors stay
					for (const node of oldNodes) {
						const want = newNodes.includes(node) ? root : null;
						if (node.parentNode !== want) {
							throw new Error(
								`[from=${snap(oldNodes) || '∅'} to=${snap(newNodes) || '∅'}] node ${label(node)} parent ${node.parentNode ? 'set' : 'null'} want ${want ? 'set' : 'null'}`
							);
						}
					}
					root.remove();
					done++;
				}
			}
			expect(done).toBe(states.length * states.length);
		}, 120_000);
	}
});
