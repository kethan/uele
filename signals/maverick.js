/**
 * Wire uele to `@maverick-js/signals`. Install before creating reactive content.
 *
 *     import { maverick } from 'uele/signals/maverick';
 *     maverick();
 */
import { signal, computed, effect, tick, untrack } from '@maverick-js/signals';
import { api } from 'uele';
import { scoped, install } from './internal.js';

export const maverick = (target = api) => {
	let depth = 0;
	const batch = (fn) => {
		depth++;
		try { return fn(); } finally { if (!--depth) tick(); }
	};
	const cells = new WeakSet();
	const wrap = (node) => {
		const read = () => node();
		if (node.set) read.write = (value) => node.set(value);
		cells.add(read);
		return read;
	};
	const s = scoped((fn) => effect(() => { fn(); }));
	return install(target, {
		is: (v) => typeof v === 'function' && cells.has(v), get: (v) => v(), effect: s.effect, cleanup: s.cleanup,
		signal: (value) => wrap(signal(value)), computed: (fn) => wrap(computed(fn)),
		set: (cell, value) => batch(() => cell.write(value)),
		batch, untracked: untrack
	});
};
