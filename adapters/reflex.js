/**
 * Wire uele to `@volynets/reflex`. Install before creating reactive content.
 *
 *     import { useReflex } from 'uele/adapters/reflex';
 *     useReflex();
 */
import { createRuntime, signal, computed, effect, batch, untracked } from '@volynets/reflex';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useReflex = (target = api) => {
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
	return wire(target, {
		is: (v) => typeof v === 'function', get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (value) => wrap(signal(value)), derived: computed, set: (cell, value) => cell.write(value),
		batch, untracked
	});
};
