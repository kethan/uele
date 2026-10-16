/**
 * Wire uele to `alien-signals` - plain-function signals: read `s()`, write `s(v)`.
 *
 *     import { useAlienSignals } from 'uele/adapters/alien-signals';
 *     useAlienSignals();
 */
import { api } from 'uele';
import { signal, computed, effect, startBatch, endBatch } from 'alien-signals';
import { scoped, wire } from './util.js';

export const useAlienSignals = (target = api) => {
	const s = scoped(effect);
	return wire(target, {
		is: (v) => typeof v === 'function',
		get: (v) => v(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => signal(v),
		derived: (fn) => computed(fn),
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
