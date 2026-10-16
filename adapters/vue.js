/**
 * Wire uele to `@vue/reactivity` - `ref()`/`computed()` values.
 *
 *     import { useVue } from 'uele/adapters/vue';
 *     useVue();
 */
import { api } from 'uele';
import { isRef, ref, computed, effect, stop } from '@vue/reactivity';
import { scoped, wire } from './util.js';

export const useVue = (target = api) => {
	const s = scoped((fn) => {
		const runner = effect(fn);
		return () => stop(runner);
	});
	return wire(target, {
		is: isRef,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => ref(v),
		derived: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; }
	});
};
