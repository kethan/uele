/**
 * The smallest conforming differ: drop everything, insert everything. Fine for
 * tiny lists and a useful baseline in tests.
 *
 *     import { rebuild } from 'uele/diffs/rebuild';
 *     rebuild();
 */
import { api } from 'uele';

export const rebuild = (target = api) => {
	target.diff = (parent, oldNodes, newNodes, end) => {
		oldNodes.forEach((node) => parent.removeChild(node));
		newNodes.forEach((node) => parent.insertBefore(node, end || null));
	};
	return target;
};
