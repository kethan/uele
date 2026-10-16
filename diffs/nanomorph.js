/**
 * `nanomorph` - updates nodes in place (write-back handled by the adapter).
 *
 *     import { useNanomorph } from 'uele/diffs/nanomorph';
 *     useNanomorph();
 */
import { api } from 'uele';
import nanomorph from 'nanomorph';
import { morphAdapter } from './util.js';

export const useNanomorph = (target = api) => {
	const morph = typeof nanomorph === 'function' ? nanomorph : nanomorph.default;
	target.diff = morphAdapter(morph);
	target.udom = undefined;
	return target;
};
