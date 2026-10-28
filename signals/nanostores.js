/**
 * Wire uele to `nanostores` - atoms driven through `.subscribe()`; no effect runner.
 *
 *     import { nanostores } from 'uele/signals/nanostores';
 *     nanostores();
 */
import { api } from 'uele';
import { atom, batch } from 'nanostores';
import { scoped, install } from './internal.js';

export const nanostores = (target = api) => {
	return install(target, {
		is: (v) => !!v?.subscribe && typeof v.get === 'function',
		get: (v) => v?.get?.(),
		any: (src) =>
			src?.subscribe && typeof src.get === 'function' ? (next) => src.subscribe((v) => next(v)) : undefined,
		signal: (v) => atom(v),
		set: (cell, v) => { cell.set(v); },
		batch
	});
};
