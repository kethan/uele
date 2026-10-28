/**
 * Wire uele to `mobx` - boxed observables and computed values.
 *
 *     import { mobx } from 'uele/signals/mobx';
 *     mobx();
 */
import { api } from 'uele';
import { isBoxedObservable, isComputed, observable, computed, autorun, runInAction } from 'mobx';
import { scoped, install } from './internal.js';

export const mobx = (target = api) => {
	const s = scoped(autorun);
	return install(target, {
		is: (v) => isBoxedObservable(v) || isComputed(v),
		get: (v) => v.get(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => observable.box(v),
		computed: (fn) => computed(fn),
		// mobx 7 warns on writes outside an action; uele owns these, so batch them
		set: (cell, v) => runInAction(() => { cell.set(v); })
	});
};
