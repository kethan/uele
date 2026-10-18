/**
 * `morphdom` - updates nodes in place (the contract's write-back is handled
 * for you by the shared adapter).
 *
 *     import { useMorphdom } from 'uele/diffs/morphdom';
 *     useMorphdom();
 */
import { api } from 'uele';
import morphdom from 'morphdom';
import { morphAdapter } from './util.js';

export const useMorphdom = (target = api) => {
	/* istanbul ignore next -- CJS interop: the .default side only exists under require() */
	const morph = typeof morphdom === 'function' ? morphdom : morphdom.default;
	target.diff = morphAdapter(morph);
	target.udom = undefined;
	return target;
};
