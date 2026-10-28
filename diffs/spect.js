/**
 * Spect-style node-identity reconciliation, independently implemented
 * for uele's bounded live regions. Inspired by the algorithm family compared at
 * https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).
 *
 *     import { useSpect } from 'uele/diffs/spect';
 *     useSpect();
 */
import { api } from 'uele';

const reconcile = (parent, oldNodes, newNodes, end = null) => {
	const keep = new Set(newNodes);
	for (const node of oldNodes) if (!keep.has(node)) parent.removeChild(node);
	let cursor = oldNodes.find((node) => keep.has(node)) || end;
	for (const node of newNodes) {
		if (node === cursor) cursor = cursor.nextSibling;
		else parent.insertBefore(node, cursor);
	}
};

export const useSpect = (target = api) => {
	target.diff = reconcile;
	target.udom = undefined;
	return target;
};
