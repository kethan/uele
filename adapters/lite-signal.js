/**
 * Wire uele to `@zakkster/lite-signal`. Install before creating reactive content.
 *
 *     import { useLiteSignal } from 'uele/adapters/lite-signal';
 *     useLiteSignal();
 */
import { createRegistry } from '@zakkster/lite-signal';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useLiteSignal = (target = api, registry = createRegistry({ prealloc: 'lazy', onCapacityExceeded: 'grow' })) => {
	const wrap = (node) => {
		const read = () => node();
		if (node.set) read.write = (value) => node.set(value);
		return read;
	};
	const s = scoped((fn) => registry.effect(() => { fn(); }));
	return wire(target, {
		is: (v) => typeof v === 'function', get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (v) => wrap(registry.signal(v)), derived: (fn) => wrap(registry.computed(fn)),
		set: (cell, value) => cell.write(value),
		batch: (fn) => registry.batch(fn), untracked: (fn) => registry.untrack(fn)
	});
};
