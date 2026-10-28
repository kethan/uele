/**
 * Wire uele to `@vue/reactivity` - `ref()`/`computed()` values.
 *
 *     import { vue } from 'uele/signals/vue';
 *     vue();
 */
import { api } from 'uele';
import { isRef, ref, computed, effect, stop } from '@vue/reactivity';
import { scoped, install } from './internal.js';

export const vue = (target = api) => {
	const s = scoped((fn) => {
		const runner = effect(fn);
		return () => stop(runner);
	});
	return install(target, {
		is: isRef,
		get: (v) => v.value,
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => ref(v),
		computed: (fn) => computed(fn),
		set: (cell, v) => { cell.value = v; }
	});
};
