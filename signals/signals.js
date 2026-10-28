/**
 * Wire uele to `@webreflection/signals` - `Signal` instances with a Preact-like API.
 *
 *     import { signals } from 'uele/signals/signals';
 *     signals();
 */
import { api } from 'uele';
import { Signal, signal, computed, effect, batch, untracked } from '@webreflection/signals';
import { scoped, install } from './internal.js';

export const signals = (target = api) => {
	// the library invokes an effect's return value as its cleanup; uele
	// callbacks may return nodes/values, so the return is swallowed (uele
	// cleans up through api.cleanup and the disposer instead)
	const s = scoped((fn) => effect(() => { fn(); }));
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
