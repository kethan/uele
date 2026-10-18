/**
 * Wire uele to `@webreflection/signals` - `Signal` instances with a Preact-like API.
 *
 *     import { useSignals } from 'uele/adapters/signals';
 *     useSignals();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch, untracked } from '@webreflection/signals';
import { scoped, wire } from './util.js';

export const useSignals = (target = api) => {
	// the library invokes an effect's return value as its cleanup; uele
	// callbacks may return nodes/values, so the return is swallowed (uele
	// cleans up through api.cleanup and the disposer instead)
	const s = scoped((fn) => effect(() => { fn(); }));
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
