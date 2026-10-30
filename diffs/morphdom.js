/**
 * `morphdom` - updates nodes in place; the shared adapter handles pairing and ordering.
 *
 *     import { morphdom } from 'uele/diffs/morphdom';
 *     morphdom();
 */
import { api } from 'uele';
import engine from 'morphdom';
import { morphAdapter } from './util.js';

export const morphdom = (target = api) => {
	/* istanbul ignore next -- CJS interop: the .default side only exists under require() */
	const morph = typeof engine === 'function' ? engine : engine.default;
	target.diff = morphAdapter(morph);
	return target;
};
