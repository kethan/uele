/**
 * `udomdiff` - takes `(parent, a, b, get, before)`; the adapter supplies the identity
 * callback and forwards the end marker as `before`. Core always uses four arguments.
 *
 *     import { udomdiff } from 'uele/diffs/udomdiff';
 *     udomdiff();
 */
import { api } from 'uele';
import engine from 'udomdiff';

const getNode = node => node;

export const udomdiff = (target = api) => {
	target.diff = (parent, oldNodes, newNodes, end) =>
		engine(parent, oldNodes, newNodes, getNode, end);
	return target;
};
