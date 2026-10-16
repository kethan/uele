/**
 * Wire uele to `mobx` - boxed observables and computed values.
 *
 *     import { useMobx } from 'uele/adapters/mobx';
 *     useMobx();
 */
import { api } from 'uele';
import { isBoxedObservable, isComputed, observable, computed, autorun, runInAction } from 'mobx';
import { scoped, wire } from './util.js';

export const useMobx = (target = api) => {
	const s = scoped(autorun);
	return wire(target, {
		is: (v) => isBoxedObservable(v) || isComputed(v),
		get: (v) => v.get(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => observable.box(v),
		derived: (fn) => computed(fn),
		// mobx 7 warns on writes outside an action; uele owns these, so batch them
		set: (cell, v) => runInAction(() => { cell.set(v); })
	});
};
