/**
 * `swapdom` - a keyed differ written for exactly uele's `api.diff` signature.
 *
 *     import { swapdom } from 'uele/diffs/swapdom';
 *     swapdom();
 */
import { api } from 'uele';
import engine from 'swapdom';

export const swapdom = (target = api) => {
	target.diff = engine;
	target.udom = undefined;
	return target;
};
