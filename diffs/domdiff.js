/**
 * `domdiff` - takes an options object instead of a node (`{ before: end }`).
 *
 *     import { domdiff } from 'uele/diffs/domdiff';
 *     domdiff();
 */
import { api } from 'uele';
import engine from 'domdiff';

export const domdiff = (target = api) => {
	/* istanbul ignore next -- CJS interop: the .default side only exists under require() */
	const diff = typeof engine === 'function' ? engine : engine.default;
	target.diff = (parent, oldNodes, newNodes, end) => diff(parent, oldNodes, newNodes, { before: end || null });
	return target;
};
