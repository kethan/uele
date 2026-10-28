/**
 * Wire uele to `usignal` - `Signal` instances; a read is attributed to every enclosing effect.
 *
 *     import { usignal } from 'uele/signals/usignal';
 *     usignal();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch } from 'usignal';
import { scoped, install } from './internal.js';

export const usignal = (target = api) => {
	const s = scoped(effect);
	return install(target, {
		is: (v) => v instanceof Signal,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		computed: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; },
		batch
	});
};
