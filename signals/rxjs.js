/**
 * Wire uele to `rxjs` - driven through `.subscribe()`; no effect runner, so no computed values.
 *
 *     import { rxjs } from 'uele/signals/rxjs';
 *     rxjs();
 */
import { api } from 'uele';
import { BehaviorSubject } from 'rxjs';
import { install } from './internal.js';

export const rxjs = (target = api) => {
	return install(target, {
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
