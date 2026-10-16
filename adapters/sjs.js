/**
 * Wire uele to `s-js` - data nodes are read/written by calling them.
 *
 *     import { useSjs } from 'uele/adapters/sjs';
 *     useSjs();
 */
import { api } from 'uele';
import S from 's-js';
import { scoped, wire } from './util.js';

/**
 * s-js cannot batch two different writes to the same node: `S.freeze()` throws
 * `conflicting changes`. So a batch here buffers the writes in a mirror (reads
 * inside the batch still see their own writes) and commits one final value per
 * node at the end, inside a single `freeze` - one notification, no conflict.
 */
let depth = 0;
const pending = new Map();

export const useSjs = (target = api) => {
	return wire(target, {
		is: (v) => typeof v === 'function',
		get: (v) => (depth > 0 && pending.has(v) ? pending.get(v) : v()),
		effect: (fn) => {
			let dispose;
			S.root((d) => {
				dispose = d;
				S.effect(fn);
			});
			return dispose;
		},
		// usub calls the hook with `undefined` when a subscription has no teardown
		cleanup: (fn) => fn && S.cleanup(fn),
		signal: (v) => S.data(v),
		derived: (fn) => {
			let node;
			S.root(() => {
				node = S(fn);
			});
			return node;
		},
		set: (cell, v) => {
			if (depth > 0) pending.set(cell, v);
			else cell(v);
		},
		batch: (fn) => {
			depth++;
			let out;
			try {
				out = fn();
			} finally {
				depth--;
			}
			if (depth === 0 && pending.size) {
				const writes = [...pending];
				pending.clear();
				S.freeze(() => {
					for (const [cell, value] of writes) cell(value);
				});
			}
			return out;
		},
		untracked: (fn) => S.sample(fn)
	});
};
