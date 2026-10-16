/**
 * Diff-engine adapters.
 *
 * uele calls `api.diff(parentNode, oldNodes, newNodes, end[, endForUdom])`
 * whenever a live region replaces its content (see `Live.replace` in
 * `src/index.js`). `api.udom` is the optional second half of the older
 * udomdiff-style contract: when it is set, the call becomes
 * `api.diff(parent, old, new, api.udom, em)` so the engine can use its own DOM
 * helpers.
 *
 * Every adapter below conforms to that contract: after the call, `parent`
 * contains exactly `newNodes` in order, and untouched siblings (including the
 * `em` marker used as the anchor) are where they were.
 */
import udomdiff from 'udomdiff';
import domdiff from 'domdiff';
import swapdom from 'swapdom';
import morphdom from 'morphdom';
import nanomorph from 'nanomorph';
import { getPatch, applyPatch } from 'fast-array-diff';
import { diffArray as thiDiffArray } from '@thi.ng/diff';
import listDiff from 'list-diff2';

// interop: CJS builds expose the differ as `default`, ESM builds as the export
const fn = (mod) => (typeof mod === 'function' ? mod : mod.default);

export const DEFAULT_DIFF = { diff: undefined, udom: undefined };

/* ------------------------------------------------------------------ engines */

/** swapdom is written for this exact signature: (parent, a, b, end) */
const swapdomEngine = (api) => {
	api.diff = swapdom;
};

/**
 * udomdiff takes `(parent, a, b, get, before)` - uele supplies the get callback
 * through `api.udom` and passes the em marker as `before`.
 */
const udomdiffEngine = (api) => {
	api.diff = udomdiff;
	api.udom = (node) => node;
};

/** domdiff takes an options object instead of a node: `{ before: end }` */
const domdiffEngine = (api) => {
	const diff = fn(domdiff);
	api.diff = (parent, oldNodes, newNodes, end) => diff(parent, oldNodes, newNodes, { before: end || null });
};

/**
 * A keyed differ built from fast-array-diff's LCS patches: the patch decides
 * the ordering, the adapter only performs the DOM moves.
 */
const fastArrayDiffEngine = (api) => {
	api.diff = (parent, oldNodes, newNodes, end) => {
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
};

/**
 * morphdom/nanomorph update nodes **in place**: the old element survives and the
 * node passed in `newNodes` is consumed. uele keeps the array it handed to
 * api.diff as the region's current content, so an in-place engine must write the
 * surviving nodes back into `newNodes` - otherwise the next update acts on nodes
 * that are no longer in the document (see the contract test below).
 *
 * Nodes that appear in both arrays (keyed reuse) are already up to date: they are
 * only moved. The remaining old/new nodes are paired by index and morphed.
 */
const morphEngine = (morph) => (api) => {
	const morphFn = fn(morph);
	api.diff = (parent, oldNodes, newNodes, end) => {
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
};

/**
 * A morph engine used the *naive* way: it morphs the old nodes in place but
 * leaves the array alone. The next update then works on nodes that are no
 * longer in the document, which is exactly what the contract test pins down.
 */
const naiveMorphEngine = (morph) => (api) => {
	const morphFn = fn(morph);
	api.diff = (parent, oldNodes, newNodes, end) => {
		const common = Math.min(oldNodes.length, newNodes.length);
		for (let i = 0; i < common; i++) {
			const from = oldNodes[i];
			const to = newNodes[i];
			if (from === to) continue;
			if (from.nodeType === 3 && to.nodeType === 3) {
				if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
			} else if (from.nodeType === 1 && to.nodeType === 1 && from.nodeName === to.nodeName) {
				morphFn(from, to);
			} else {
				parent.insertBefore(to, from);
				parent.removeChild(from);
			}
		}
		for (let i = common; i < oldNodes.length; i++) parent.removeChild(oldNodes[i]);
		for (let i = common; i < newNodes.length; i++) parent.insertBefore(newNodes[i], end || null);
	};
};

/** the smallest conforming differ: drop everything, insert everything */
const rebuildEngine = (api) => {
	api.diff = (parent, oldNodes, newNodes, end) => {
		oldNodes.forEach((node) => parent.removeChild(node));
		newNodes.forEach((node) => parent.insertBefore(node, end || null));
	};
};

/**
 * `engines` is the matrix the conformance suite iterates over.
 * `keyed: true` means surviving keys keep their nodes (identity reuse).
 */
/**
 * @thi.ng/diff computes the patch (its `dels` set decides which old nodes go);
 * the adapter applies the DOM work with the same move-anchor pass as above.
 */
const thiNgDiffEngine = (api) => {
	api.diff = (parent, oldNodes, newNodes, end) => {
		// signature: diffArray(a, b, mode?, equiv?) - nodes are opaque tokens compared
		// by identity, and the library's `dels` ({ oldIndex: node }) decides what goes
		const { dels } = thiDiffArray(oldNodes, newNodes, undefined, (x, y) => x === y);
		for (const i of Object.keys(dels)) oldNodes[i].remove();
		let anchor = end || null;
		for (let i = newNodes.length - 1; i >= 0; i--) {
			const node = newNodes[i];
			if (node.parentNode !== parent || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
			anchor = node;
		}
	};
};

/**
 * list-diff2 returns an ordered `moves` script ({index, type: 0 remove} /
 * {index, item, type: 1 insert}) that is replayed against the DOM. Its keys
 * must be primitives (they are stringified internally), so nodes are mapped to
 * ids per call.
 */
const listDiff2Engine = (api) => {
	api.diff = (parent, oldNodes, newNodes, end) => {
		// list-diff2 keys items (falsy keys count as unkeyed, so ids start at 1) and
		// its `children` map reports, per old position, the surviving item or null.
		// That removal decision is the library's; the order apply is the shared
		// move-anchor pass (the raw `moves` script only encodes adjacent moves).
		const id = new Map();
		let n = 0;
		const key = (node) => {
			if (!id.has(node)) id.set(node, ++n);
			return id.get(node);
		};
		const wrap = (node) => ({ node, k: key(node) });
		const { children } = listDiff(oldNodes.map(wrap), newNodes.map(wrap), (w) => w.k);
		for (let i = 0; i < children.length; i++) if (children[i] === null) oldNodes[i].remove();
		let anchor = end || null;
		for (let i = newNodes.length - 1; i >= 0; i--) {
			const node = newNodes[i];
			if (node.parentNode !== parent || node.nextSibling !== anchor) parent.insertBefore(node, anchor);
			anchor = node;
		}
	};
};

export const ENGINES = [
	{
		name: 'built-in marker walk (no api.diff)',
		install: () => {},
		keyed: false,
		notes: 'the default: the nodes between the region markers are removed and the new nodes go in after the start marker'
	},
	{
		name: 'swapdom',
		install: swapdomEngine,
		keyed: true,
		notes: 'written for (parent, a, b, end): no adapter needed beyond api.diff'
	},
	{
		name: 'udomdiff (+ api.udom)',
		install: udomdiffEngine,
		keyed: true,
		notes: '(parent, a, b, get, before): uele passes api.udom as the get callback and the em marker as before'
	},
	{
		name: 'domdiff',
		install: domdiffEngine,
		keyed: true,
		notes: '(parent, a, b, { before }) - the end marker goes into the options bag'
	},
	{
		name: 'morphdom (in-place morph)',
		install: morphEngine(morphdom),
		keyed: true,
		notes: 'morphs matched nodes in place and writes the survivors back into the newNodes array'
	},
	{
		name: 'nanomorph (in-place morph)',
		install: morphEngine(nanomorph),
		keyed: true,
		notes: 'same pairing as morphdom, with nanomorph doing the attribute/child merge'
	},
	{
		name: 'fast-array-diff (LCS patch)',
		install: fastArrayDiffEngine,
		keyed: true,
		notes: 'the LCS patch decides the order, the adapter performs the DOM moves'
	},
	{
		name: '@thi.ng/diff (patch dels)',
		install: thiNgDiffEngine,
		keyed: true
	},
	{
		name: 'list-diff2 (moves)',
		install: listDiff2Engine,
		keyed: true
	},
	{
		name: 'rebuild (remove + insert)',
		install: rebuildEngine,
		keyed: false,
		notes: 'the smallest conforming differ - useful as a reference for the contract'
	}
];

/** applies an engine to an api object (main or lite) */
export const installEngine = (api, engine, overrides = {}) => {
	Object.assign(api, DEFAULT_DIFF, { udom: undefined, diff: undefined }, overrides);
	engine.install(api);
	return api;
};

export { naiveMorphEngine, udomdiff, domdiff, swapdom, morphdom, nanomorph, getPatch, applyPatch };
