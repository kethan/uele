/**
 * Map-based list-difference reconciliation, independently implemented for uele.
 * Algorithm family: https://github.com/luwes/js-diff-benchmark
 * Keys are DOM node identities; caller-owned arrays are never modified.
 *
 *     import { useListDifference } from 'uele/diffs/list-difference';
 *     useListDifference();
 */
import { api } from 'uele';

const reconcile = (parent, oldNodes, newNodes, end = null) => {
	const old = oldNodes.slice();
	const positions = new Map(old.map((node, i) => [node, i]));
	const wanted = new Set(newNodes);
	let i = 0;
	for (const node of newNodes) {
		while (i < old.length && (!old[i] || !wanted.has(old[i]))) {
			if (old[i]) parent.removeChild(old[i]);
			i++;
		}
		if (old[i] === node) i++;
		else {
			parent.insertBefore(node, old[i] || end);
			const index = positions.get(node);
			if (index !== undefined) old[index] = null;
		}
	}
	while (i < old.length) {
		const node = old[i++];
		if (node) parent.removeChild(node);
	}
};

export const useListDifference = (target = api) => {
	target.diff = reconcile;
	target.udom = undefined;
	return target;
};
