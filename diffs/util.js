/**
 * Shared plumbing for the diff-engine presets. `morphAdapter` implements the
 * `api.diff` contract on top of an in-place morpher (morphdom/nanomorph):
 * surviving nodes are written back into `newNodes`, because uele keeps the
 * array it handed to `api.diff` as the region's current content.
 */
export const morphAdapter = (morphFn) => (parent, oldNodes, newNodes, end) => {
	const oldSet = new Set(oldNodes);
	const newSet = new Set(newNodes);
	const deadOld = oldNodes.filter((node) => !newSet.has(node));
	const freshNew = newNodes.filter((node) => !oldSet.has(node));
	const common = Math.min(deadOld.length, freshNew.length);

	for (let i = 0; i < common; i++) {
		const from = deadOld[i];
		const to = freshNew[i];
		if (from.nodeType === 3 && to.nodeType === 3) {
			if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
			newNodes[newNodes.indexOf(to)] = from; // in place: the old text node survives
		} else if (from.nodeType === 1 && to.nodeType === 1 && from.nodeName === to.nodeName) {
			morphFn(from, to);
			newNodes[newNodes.indexOf(to)] = from;
		} else {
			// different node types: swap them
			parent.insertBefore(to, from.parentNode === parent ? from : end || null);
			if (from.parentNode === parent) parent.removeChild(from);
			newNodes[newNodes.indexOf(to)] = to;
		}
	}
	for (let i = common; i < deadOld.length; i++) {
		if (deadOld[i].parentNode === parent) parent.removeChild(deadOld[i]);
	}
	for (let i = common; i < freshNew.length; i++) parent.insertBefore(freshNew[i], end || null);

	// reconcile the order: morph engines never move nodes themselves
	let anchor = end || null;
	for (let i = newNodes.length - 1; i >= 0; i--) {
		const node = newNodes[i];
		if (node.parentNode !== parent || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
		anchor = node;
	}
};
