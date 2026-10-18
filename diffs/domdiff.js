/**
 * `domdiff` - takes an options object instead of a node (`{ before: end }`).
 *
 *     import { useDomdiff } from 'uele/diffs/domdiff';
 *     useDomdiff();
 */
import { api } from 'uele';
import domdiff from 'domdiff';

export const useDomdiff = (target = api) => {
	/* istanbul ignore next -- CJS interop: the .default side only exists under require() */
	const diff = typeof domdiff === 'function' ? domdiff : domdiff.default;
	target.diff = (parent, oldNodes, newNodes, end) => diff(parent, oldNodes, newNodes, { before: end || null });
	target.udom = undefined;
	return target;
};
