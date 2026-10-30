/**
 * Heckel-style unique-token matching, independently implemented for uele.
 * Algorithm family: https://github.com/luwes/js-diff-benchmark
 * Map keys preserve node identity (unlike string-keyed symbol tables).
 * DOM lists contain each node at most once, so shared tokens are unique matches.
 *
 *     import { heckel } from 'uele/diffs/heckel';
 *     heckel();
 */
import { api } from 'uele';

const reconcile = (parent, oldNodes, newNodes, end = null) => {
	const symbols = new Map();
	for (let i = 0; i < oldNodes.length; i++) symbols.set(oldNodes[i], { old: i, next: -1 });
	for (let i = 0; i < newNodes.length; i++) {
		const node = newNodes[i];
		const symbol = symbols.get(node);
		if (symbol) symbol.next = i;
		else symbols.set(node, { old: -1, next: i });
	}
	for (const node of oldNodes) if (symbols.get(node).next === -1) parent.removeChild(node);
	// Heckel matches can cross (moves). Apply from the end, rather than treating
	// every match as an immovable anchor as a text-only diff might do.
	let anchor = end;
	for (let i = newNodes.length - 1; i >= 0; i--) {
		const node = newNodes[i];
		if (symbols.get(node).old === -1 || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
		anchor = node;
	}
};

export const heckel = (target = api) => {
	target.diff = reconcile;
	return target;
};
