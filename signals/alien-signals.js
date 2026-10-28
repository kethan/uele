/**
 * Wire uele to `alien-signals` - plain-function signals: read `s()`, write `s(v)`.
 *
 *     import { alienSignals } from 'uele/signals/alien-signals';
 *     alienSignals();
 */
import { api } from 'uele';
import { signal, computed, effect, startBatch, endBatch } from 'alien-signals';
import { scoped, install } from './internal.js';

export const alienSignals = (target = api) => {
	const s = scoped(effect);
	return install(target, {
		is: (v) => typeof v === 'function',
		get: (v) => v(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		computed: (fn) => computed(fn),
		set: (cell, v) => { cell(v); },
		batch: (fn) => {
			startBatch();
			try {
				return fn();
			} finally {
				endBatch();
			}
		}
	});
};
