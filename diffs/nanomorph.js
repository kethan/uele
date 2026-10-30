/**
 * `nanomorph` - updates nodes in place; the shared adapter handles pairing and ordering.
 *
 *     import { nanomorph } from 'uele/diffs/nanomorph';
 *     nanomorph();
 */
import { api } from 'uele';
import engine from 'nanomorph';
import { morphAdapter } from './util.js';

export const nanomorph = (target = api) => {
	/* istanbul ignore next -- CJS interop: the .default side only exists under require() */
	const morph = typeof engine === 'function' ? engine : engine.default;
	target.diff = morphAdapter(morph);
	return target;
};
