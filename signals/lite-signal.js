/**
 * Wire uele to `@zakkster/lite-signal`. Install before creating reactive content.
 *
 *     import { liteSignal } from 'uele/signals/lite-signal';
 *     liteSignal();
 */
import { createRegistry } from '@zakkster/lite-signal';
import { api } from 'uele';
import { scoped, install } from './internal.js';

export const liteSignal = (target = api, registry = createRegistry({ prealloc: 'lazy', onCapacityExceeded: 'grow' })) => {
	const wrap = (node) => {
		const read = () => node();
		if (node.set) read.write = (value) => node.set(value);
		return read;
	};
	const s = scoped((fn) => registry.effect(() => { fn(); }));
	return install(target, {
		is: (v) => typeof v === 'function', get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (v) => wrap(registry.signal(v)), computed: (fn) => wrap(registry.computed(fn)),
		set: (cell, value) => cell.write(value),
		batch: (fn) => registry.batch(fn), untracked: (fn) => registry.untrack(fn)
	});
};
