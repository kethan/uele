/**
 * Snabbdom-style node-identity reconciliation, independently implemented
 * for uele's bounded live regions. Inspired by the algorithm family compared at
 * https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).
 *
 *     import { snabbdom } from 'uele/diffs/snabbdom';
 *     snabbdom();
 */
import { api } from 'uele';

const reconcile = (parent, oldNodes, newNodes, end = null) => {
	const old = oldNodes.slice();
	let left = 0, right = old.length - 1, first = 0, last = newNodes.length - 1;
	let positions;
	while (left <= right && first <= last) {
		if (!old[left]) { left++; continue; }
		if (!old[right]) { right--; continue; }
		if (old[left] === newNodes[first]) { left++; first++; }
		else if (old[right] === newNodes[last]) { right--; last--; }
		else if (old[left] === newNodes[last]) {
			parent.insertBefore(old[left++], old[right].nextSibling);
			last--;
		} else if (old[right] === newNodes[first]) {
			parent.insertBefore(old[right--], old[left]);
			first++;
		} else {
			positions ||= new Map(old.map((node, i) => [node, i]));
			const node = newNodes[first++];
			const index = positions.get(node);
			parent.insertBefore(node, old[left]);
			if (index !== undefined) old[index] = null;
		}
	}
	const anchor = newNodes[last + 1] || end;
	while (first <= last) parent.insertBefore(newNodes[first++], anchor);
	while (left <= right) {
		const node = old[left++];
		if (node) parent.removeChild(node);
	}
};

export const snabbdom = (target = api) => {
	target.diff = reconcile;
	return target;
};
