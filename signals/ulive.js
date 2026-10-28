/**
 * Wire uele to `ulive` - signals with `peek`/`value`.
 *
 *     import { ulive } from 'uele/signals/ulive';
 *     ulive();
 */
import { api } from 'uele';
import { signal, computed, effect, batch, untracked } from 'ulive';
import { scoped, install } from './internal.js';

export const ulive = (target = api) => {
	const s = scoped(effect);
	return install(target, {
		is: (v) => v?.peek,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		computed: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; },
		batch,
		untracked
	});
};
