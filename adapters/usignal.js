/**
 * Wire uele to `usignal` - `Signal` instances; a read is attributed to every enclosing effect.
 *
 *     import { useUsignal } from 'uele/adapters/usignal';
 *     useUsignal();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch } from 'usignal';
import { scoped, wire } from './util.js';

export const useUsignal = (target = api) => {
	const s = scoped(effect);
	return wire(target, {
		is: (v) => v instanceof Signal,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		derived: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; },
		batch
	});
};
