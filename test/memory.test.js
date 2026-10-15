/**
 * Memory: what is still reachable after a subtree is unmounted.
 *
 * The oracle is a FinalizationRegistry: `watch(obj)` registers a numeric id for an
 * object and `pending(ids)` counts the ids that were never freed. Tracked objects are
 * never dereferenced and never returned by a scenario - only ids are - because keeping
 * a reference inside the probe is enough to keep an object alive and make the suite
 * lie. Scenarios are functions so their locals are out of scope before the collector
 * runs. Two controls guard the oracle: a dropped object must be collected and a held
 * object must never be reported as freed. Measured retention is always a *difference*
 * between two batches of 20, because conservative stack scanning can keep a handful of
 * objects alive for one collection: a real leak is the size of a batch.
 *
 * uele's own bookkeeping is expected to release everything it no longer shows - the
 * assertion that used to fail here was `Live.replace` keeping the previous nodes in
 * `oldNodes` on the path without `api.diff`, which also meant a differ configured later
 * was handed nodes that were no longer in the document.
 *
 * Subscriptions are a different story: `usub` registers every subscription in a
 * FinalizationRegistry as `register(target, unsub)` and the unsubscriber reaches the
 * callback (which shares a scope with the source, as it must), so the entry keeps the
 * source alive and the source keeps the entry alive - the cycle the README documents
 * under "Cleanup Support". The two tests at the end of `subscription lifetimes` pin
 * that down: the default path retains while the source lives, and a leak-free `api.any`
 * seam proves the rest of uele releases everything.
 *
 * @vitest-environment jsdom
 */
import { describe, expect, test, afterEach } from 'vitest';
import * as main from '../src/index.js';
import { api as mainApi } from 'usub';
import { signal, effect } from 'ulive';
import { Subject } from 'rxjs';

mainApi.effect = effect;
mainApi.is = (v) => v?.peek;
mainApi.get = (v) => v.value;

// ------------------------------------------------------------------ the oracle

const freed = new Set();
const registry = new FinalizationRegistry((id) => freed.add(id));
let seq = 0;
const watch = (obj) => {
	const id = ++seq;
	registry.register(obj, id);
	return id;
};
const pending = (ids) => ids.filter((id) => !freed.has(id)).length;
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async (rounds = 12) => {
	for (let i = 0; i < rounds; i++) {
		globalThis.gc();
		await tick();
	}
};

/** batch, settle, batch again: retention is only ever trusted as a difference */
const measure = async (build) => {
	const first = build();
	await settle();
	const second = build();
	await settle();
	return { size: second.length, first: pending(first), second: pending(second), total: pending([...first, ...second]) };
};

/** conservative stack scanning noise: a leak is the size of a batch, not four objects */
const SLACK = 4;
const held = []; // the "still in use" control
let reachingCleared = 0;
let releasedCleared = 0;
const reaching = new FinalizationRegistry(() => reachingCleared++);
const released = new FinalizationRegistry(() => releasedCleared++);

const mount = (...nodes) => {
	const root = document.createElement('div');
	document.body.append(root);
	root.append(...nodes.flat());
	return root;
};

afterEach(() => {
	document.body.innerHTML = '';
	held.length = 0;
	delete mainApi.any;
});

describe('the oracle', () => {
	const drop = () => {
		const ids = [];
		for (let i = 0; i < 20; i++) ids.push(watch({ big: new Array(64).fill(1) }));
		return ids;
	};
	const keep = () => {
		const ids = [];
		for (let i = 0; i < 20; i++) {
			const value = { big: new Array(64).fill(1) };
			held.push(value);
			ids.push(watch(value));
		}
		return ids;
	};

	test('a dropped object is collected', async () => {
		const run = await measure(drop);
		expect(run.total).toBeLessThanOrEqual(SLACK);
	});

	test('a referenced object is never reported as collected', async () => {
		const run = await measure(keep);
		expect(run.first).toBe(20); // no false "freed": the oracle cannot over report
		expect(run.total).toBeGreaterThan(run.size);
		expect(held.length).toBe(40);
	});

	test('a registered held value that can reach its target is never released', async () => {
		// the exact shape usub builds: `registry.register(target, unsub)` where the
		// unsubscriber reaches the callback, which reaches the source again. The held value
		// keeps the target alive, the target keeps the entry alive, and neither the target
		// nor the unsubscriber are ever collected - so the region a signal subscription
		// renders stays reachable for as long as the process lives. The README documents
		// this under "Cleanup Support", with the MutationObserver + `unmount` recipe as the
		// workaround for long lived stores.
		const build = () => {
			const target = {};
			const heldValue = () => target; // a disposer closes over its source
			reaching.register(target, heldValue);
			return [watch(target)];
		};
		const ids = build();
		await settle();
		expect(pending(ids)).toBe(1);
		expect(reachingCleared).toBe(0);
	});

	test('the same registration is released when the held value cannot reach the target', async () => {
		const build = () => {
			const target = {};
			const unrelated = {};
			released.register(target, () => unrelated); // the disposer does not close over the source
			return [watch(target)];
		};
		const ids = build();
		await settle();
		expect(pending(ids)).toBe(0);
		expect(releasedCleared).toBe(1); // the entry cleared, so the held value went with it
	});
});

// ----------------------------------------------------- what uele stops showing

describe('ulee releases the nodes it replaces', () => {
	test('a live region drops the nodes of every update', async () => {
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const [nodes, set] = main.useLive('a');
				const root = mount(main.add(nodes));
				for (const value of ['b', 'c', 'd']) {
					ids.push(watch(root.childNodes[1]));
					set(value);
				}
				expect(root.textContent).toBe('d');
				expect(root.childNodes.length).toBe(3);
				root.remove();
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.size).toBe(60); // three replaced nodes per region
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});

	test('a region that replaces a nested region drops the nested nodes', async () => {
		// no signal anywhere: the inner region is built from a plain value and its setter is
		// dropped, so the only reference left to its nodes is the outer region's oldNodes
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const [inner] = main.useLive('inner');
				const [outer, setOuter] = main.useLive(inner);
				const root = mount(main.add(outer));
				expect(root.childNodes.length).toBe(5); // outer markers + the nested region
				ids.push(watch(root.childNodes[1]), watch(root.childNodes[2]), watch(root.childNodes[3]));
				setOuter('outer');
				expect(root.childNodes.length).toBe(3); // only the outer markers are left
				root.remove();
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.size).toBe(60);
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});

	test('a detached region holds a constant number of nodes over 1000 updates', () => {
		const cell = signal('a');
		const [nodes] = main.useLive(cell);
		const root = mount(main.add(nodes));
		const sm = root.firstChild;
		const em = root.lastChild;
		root.remove();
		for (let i = 0; i < 1000; i++) {
			cell.value = 'v' + i;
			expect(root.childNodes.length).toBe(5);
		}
		expect(root.firstChild).toBe(sm);
		expect(root.lastChild).toBe(em);
		expect(root.textContent).toBe('v999');
	});

	test('keyed rows removed with a differ are released', async () => {
		mainApi.diff = (parent, oldNodes, newNodes, end) => {
			oldNodes.forEach((node) => parent.removeChild(node));
			newNodes.forEach((node) => parent.insertBefore(node, end || null));
		};
		try {
			const cycle = () => {
				const ids = [];
				for (let k = 0; k < 20; k++) {
					const items = signal([1, 2, 3]);
					const root = mount(main.For({ each: items, children: [(v) => main.h('i', null, String(v))] }));
					const before = [...root.querySelectorAll('i')];
					items.value = [4, 5, 6];
					const after = new Set(root.querySelectorAll('i'));
					before.filter((node) => !after.has(node)).forEach((node) => ids.push(watch(node)));
					root.remove();
				}
				return ids;
			};
			const run = await measure(cycle);
			expect(run.size).toBe(60); // 20 lists x 3 replaced rows
			expect(run.second).toBeLessThanOrEqual(SLACK);
		} finally {
			delete mainApi.diff;
		}
	});

	test('resolved promises and lazy modules release their placeholders', async () => {
		const cycle = async () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				let resolve;
				const promise = new Promise((r) => (resolve = r));
				const root = mount(main.add(promise));
				ids.push(watch(root.childNodes[1]));
				resolve(main.h('i', null, 'done'));
				const file = () => Promise.resolve({ default: () => main.h('b', null, 'ready') });
				const other = mount(main.add(main.lazy(file, main.h('u', null, 'loading'))({})));
				ids.push(watch(other.childNodes[1]));
				await tick();
				await tick();
				expect(root.textContent).toBe('done');
				expect(other.textContent).toBe('ready');
				root.remove();
				other.remove();
			}
			return ids;
		};
		const first = await cycle();
		await settle();
		const second = await cycle();
		await settle();
		expect(pending(second)).toBeLessThanOrEqual(SLACK);
		expect(pending([...first, ...second])).toBeLessThanOrEqual(2 * SLACK);
	});

	test('plain trees, listeners and attribute maps are released', async () => {
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const root = mount(
					main.h('div', { class: { on: true, off: false }, style: { width: '1px' }, 'data-x': 'x', onclick: () => {} }, main.h('p', null, 'text'))
				);
				ids.push(watch(root), watch(root.firstChild), watch(root.firstChild.firstChild));
				root.remove();
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.size).toBe(60);
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});
});

// -------------------------------------------------------- subscription lifetimes

describe('subscription lifetimes', () => {
	test('an explicitly unsubscribed observable releases its callback', async () => {
		const source = {
			subscribe(next) {
				next('a');
				return { unsubscribe() {} };
			}
		};
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const payload = { big: new Array(64).fill(1) };
				const off = main.sub(source, () => payload);
				ids.push(watch(payload));
				typeof off === 'function' ? off() : off?.unsubscribe?.();
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});

	test('an unsubscribed rxjs Subject releases its callback', async () => {
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const payload = { big: new Array(64).fill(1) };
				main.sub(new Subject(), () => payload)();
				ids.push(watch(payload));
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});

	test('an observable whose subscription does not reach the source is released', async () => {
		// usub registers the unsubscribe function it gets back, not the caller's closure.
		// With a subscription object that does not hold the source (and a source that does
		// not hold the callback) there is no cycle, so the registry entry clears normally -
		// which is what makes the signal case below a property of the cycle, not of the
		// registry itself.
		const source = {
			subscribe() {
				return { unsubscribe() {} };
			}
		};
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const payload = { big: new Array(64).fill(1) };
				main.sub(source, () => payload);
				ids.push(watch(payload));
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.second).toBeLessThanOrEqual(SLACK);
	});

	test('a disposed subscription releases its whole chain (usub 0.9.0)', async () => {
		// usub used to park the effect disposer in its FinalizationRegistry (see the oracle
		// test above for why that entry could never clear): one chain - source plus whatever
		// the callback reached - retained per subscription, forever, even after stop(). The
		// fix - shipped in usub 0.9.0, which uele depends on - only parks subscriptions
		// usub does not own, so
		// everything below must be collected. Zero is exact: any residue is either the old
		// registry cycle back or a new leak of ours.
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const cell = signal('a');
				const payload = { big: new Array(64).fill(1) };
				main.sub(cell, () => payload)();
				ids.push(watch(payload));
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.first).toBe(0);
		expect(run.total).toBe(0);
	});

	test('a dropped source releases its subscribers without an api.any seam', async () => {
		// the other half of the fix: nothing parked means nothing pins the source either -
		// when the test frame drops it (and its payload), both go
		const cycle = () => {
			const ids = [];
			for (let i = 0; i < 20; i++) {
				const cell = signal('a');
				const payload = { big: new Array(64).fill(1) };
				main.sub(cell, () => payload);
				ids.push(watch(payload));
			}
			return ids;
		};
		const run = await measure(cycle);
		expect(run.first).toBe(0);
		expect(run.total).toBe(0);
	});
});

describe('the document is clean afterwards', () => {
	test('mounting, updating and unmounting leave the document as it was', () => {
		expect(document.body.childNodes.length).toBe(0); // every scenario above cleaned up after itself
		const [nodes, set] = main.useLive('a');
		const root = document.createElement('div');
		document.body.append(root);
		root.append(...main.add(nodes));
		const width = document.body.childNodes.length;
		set('b');
		set('c');
		expect(document.body.childNodes.length).toBe(width);
		expect(root.textContent).toBe('c');
		root.remove();
		expect(document.body.childNodes.length).toBe(0);
		expect(document.body.querySelectorAll('*').length).toBe(0);
	});
});
