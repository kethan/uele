/**
 * Wire uele to `rxjs` - driven through `.subscribe()`; no effect runner, so no derived values.
 *
 *     import { useRxjs } from 'uele/adapters/rxjs';
 *     useRxjs();
 */
import { api } from 'uele';
import { BehaviorSubject } from 'rxjs';
import { scoped, wire } from './util.js';

export const useRxjs = (target = api) => {
	return wire(target, {
		is: (v) => !!v?.subscribe && typeof v.pipe === 'function',
		get: (v) => v?.value,
		any: (src) =>
			src?.subscribe
				? (next) => {
						const s = src.subscribe((v) => next(v));
						return () => s.unsubscribe();
				  }
				: undefined,
		signal: (v) => new BehaviorSubject(v),
		set: (cell, v) => { cell.next(v); }
	});
};
