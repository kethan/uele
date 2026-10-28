/**
 * `fast-array-diff` - its LCS patch decides the ordering, the preset performs
 * the DOM moves.
 *
 *     import { fastArrayDiff } from 'uele/diffs/fast-array-diff';
 *     fastArrayDiff();
 */
import { api } from 'uele';
import { getPatch, applyPatch } from 'fast-array-diff';

export const fastArrayDiff = (target = api) => {
	target.diff = (parent, oldNodes, newNodes, end) => {
		const ordered = applyPatch(oldNodes, getPatch(oldNodes, newNodes));
		const keep = new Set(ordered);
		oldNodes.forEach((node) => {
			if (!keep.has(node)) parent.removeChild(node);
		});
		let anchor = end || null;
		for (let i = ordered.length - 1; i >= 0; i--) {
			const node = ordered[i];
			if (node.parentNode !== parent || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
			anchor = node;
		}
	};
	target.udom = undefined;
	return target;
};
