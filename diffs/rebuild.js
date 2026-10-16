/**
 * The smallest conforming differ: drop everything, insert everything. Fine for
 * tiny lists and a useful baseline in tests.
 *
 *     import { useRebuild } from 'uele/diffs/rebuild';
 *     useRebuild();
 */
import { api } from 'uele';

export const useRebuild = (target = api) => {
	target.diff = (parent, oldNodes, newNodes, end) => {
		oldNodes.forEach((node) => parent.removeChild(node));
		newNodes.forEach((node) => parent.insertBefore(node, end || null));
	};
	target.udom = undefined;
	return target;
};
