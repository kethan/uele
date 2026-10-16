/**
 * Wire uele to `nanostores` - atoms driven through `.subscribe()`; no effect runner.
 *
 *     import { useNanostores } from 'uele/adapters/nanostores';
 *     useNanostores();
 */
import { api } from 'uele';
import { atom, batch } from 'nanostores';
import { scoped, wire } from './util.js';

export const useNanostores = (target = api) => {
	return wire(target, {
		is: (v) => !!v?.subscribe && typeof v.get === 'function',
		get: (v) => v?.get?.(),
		any: (src) =>
			src?.subscribe && typeof src.get === 'function' ? (next) => src.subscribe((v) => next(v)) : undefined,
		signal: (v) => atom(v),
		set: (cell, v) => { cell.set(v); },
		batch
	});
};
