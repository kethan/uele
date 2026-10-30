/**
 * Stage0-style node-identity reconciliation, independently implemented
 * for uele's bounded live regions. Inspired by the algorithm family compared at
 * https://github.com/luwes/js-diff-benchmark (not a wrapper for the framework).
 *
 *     import { stage0 } from 'uele/diffs/stage0';
 *     stage0();
 */
import { api } from 'uele';

const reconcile = (parent, oldNodes, newNodes, end = null) => {
	const positions = new Map(oldNodes.map((node, i) => [node, i]));
	const keep = new Set(newNodes);
	for (const node of oldNodes) if (!keep.has(node)) parent.removeChild(node);
	// Patience sorting records a longest increasing subsequence of old indices.
	// Nodes in this subsequence can stay in place; move only the others.
	const tails = [], previous = new Array(newNodes.length).fill(-1);
	for (let i = 0; i < newNodes.length; i++) {
		const position = positions.get(newNodes[i]);
		if (position === undefined) continue;
		let low = 0, high = tails.length;
		while (low < high) {
			const mid = (low + high) >>> 1;
			if (positions.get(newNodes[tails[mid]]) < position) low = mid + 1;
			else high = mid;
		}
		if (low) previous[i] = tails[low - 1];
		tails[low] = i;
	}
	const stable = new Set();
	for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = previous[i]) stable.add(i);
	let anchor = end;
	for (let i = newNodes.length - 1; i >= 0; i--) {
		if (!stable.has(i)) parent.insertBefore(newNodes[i], anchor);
		anchor = newNodes[i];
	}
};

export const stage0 = (target = api) => {
	target.diff = reconcile;
	return target;
};
