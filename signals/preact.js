/**
 * Wire uele to `@preact/signals-core` - `Signal` instances; since 1.13 they also expose `.subscribe()`.
 *
 *     import { preactSignals } from 'uele/signals/preact';
 *     preactSignals();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch, untracked } from '@preact/signals-core';
import { scoped, install } from './internal.js';

export const preactSignals = (target = api) => {
	const s = scoped(effect);
	return install(target, {
		is: (v) => v instanceof Signal,
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
