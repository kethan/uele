/**
 * Wire uele to `@volynets/reflex`. Install before creating reactive content.
 *
 *     import { reflex } from 'uele/signals/reflex';
 *     reflex();
 */
import { createRuntime, signal, computed, effect, batch, untracked } from '@volynets/reflex';
import { api } from 'uele';
import { scoped, install } from './internal.js';

export const reflex = (target = api) => {
	// Runtime setup belongs to installation, never module import. Eager effects
	// preserve uele's synchronous DOM updates, including native signal writes.
	createRuntime({ effectStrategy: 'eager' });
	const s = scoped((fn) => effect(() => { fn(); }));
	// usub reserves callable .set for callback-style observables. Keep the
	// native setter behind .write on cells produced by this preset.
	const wrap = (node) => {
		const read = () => node();
		read.write = (value) => node.set(() => value);
		return read;
	};
	return install(target, {
		is: (v) => typeof v === 'function', get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (value) => wrap(signal(value)), computed: computed, set: (cell, value) => cell.write(value),
		batch, untracked
	});
};
