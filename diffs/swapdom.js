/**
 * `swapdom` - a keyed differ written for exactly uele's `api.diff` signature.
 *
 *     import { useSwapdom } from 'uele/diffs/swapdom';
 *     useSwapdom();
 */
import { api } from 'uele';
import swapdom from 'swapdom';

export const useSwapdom = (target = api) => {
	target.diff = swapdom;
	target.udom = undefined;
	return target;
};
