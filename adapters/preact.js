/**
 * Wire uele to `@preact/signals-core` - `Signal` instances; since 1.13 they also expose `.subscribe()`.
 *
 *     import { usePreactSignals } from 'uele/adapters/preact';
 *     usePreactSignals();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch, untracked } from '@preact/signals-core';
import { scoped, wire } from './util.js';

export const usePreactSignals = (target = api) => {
	const s = scoped(effect);
	return wire(target, {
		is: (v) => v instanceof Signal,
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
