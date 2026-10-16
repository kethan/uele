/**
 * Wire uele to `ulive` - signals with `peek`/`value`.
 *
 *     import { useUlive } from 'uele/adapters/ulive';
 *     useUlive();
 */
import { api } from 'uele';
import { signal, computed, effect, batch, untracked } from 'ulive';
import { scoped, wire } from './util.js';

export const useUlive = (target = api) => {
	const s = scoped(effect);
	return wire(target, {
		is: (v) => v?.peek,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		derived: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; },
		batch,
		untracked
	});
};
