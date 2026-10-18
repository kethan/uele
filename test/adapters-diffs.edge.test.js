/**
 * Edge coverage for the preset/diff plumbing the behavioural suites only
 * reach indirectly: `scoped` disposers (function, `{unsubscribe}`, and
 * missing), `wire` clearing stale hooks, the subscribe-only adapters'
 * `set`/`any`/`get` shapes called directly, nested `batch` on s-js, and
 * the `morphAdapter` node-type matrix plus each diff preset's `end`
 * handling.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal, read, write, effect, batch } from 'uele/reactive';
import { scoped, wire } from 'uele/adapters/util';
import { useRxjs } from 'uele/adapters/rxjs';
import { useNanostores } from 'uele/adapters/nanostores';
import { useTanstackStore } from 'uele/adapters/tanstack';
import { useSjs } from 'uele/adapters/sjs';
import { morphAdapter } from '../diffs/util.js';
import { useRebuild } from 'uele/diffs/rebuild';
import { useFastArrayDiff } from 'uele/diffs/fast-array-diff';
import { useDomdiff } from 'uele/diffs/domdiff';
import { useMorphdom } from 'uele/diffs/morphdom';
import { useNanomorph } from 'uele/diffs/nanomorph';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
});

/* --------------------------------------------------------- adapters/util */

describe('scoped() effect/cleanup plumbing', () => {
	it('disposer calls an unsubscribe-object and runs registered cleanups', () => {
		const log = [];
		const api2 = scoped((fn) => {
			fn();
			return { unsubscribe: () => log.push('unsub') };
		});
		const dispose = api2.effect(() => {
			api2.cleanup(() => log.push('clean'));
		});
		dispose();
		expect(log).toEqual(['unsub', 'clean']);
	});

	it('disposer calls a runner-returned function directly', () => {
		const log = [];
		const api2 = scoped((fn) => {
			fn();
			return () => log.push('off');
		});
		api2.effect(() => {})();
		expect(log).toEqual(['off']);
	});

	it('disposer tolerates a runner that returned nothing', () => {
		const api2 = scoped(() => undefined);
		expect(() => api2.effect(() => {})()).not.toThrow();
	});

	it('cleanup outside an effect, or with no function, is ignored', () => {
		const api2 = scoped((fn) => fn());
		expect(() => api2.cleanup(() => { throw new Error('must not run'); })).not.toThrow();
		const dispose = api2.effect(() => {
			api2.cleanup(undefined);
			api2.cleanup('nope');
		});
		expect(() => dispose()).not.toThrow();
	});

	it('a re-registered cleanup replaces (runs) the previous one', () => {
		const log = [];
		const api2 = scoped((fn) => fn());
		const dispose = api2.effect(() => {
			api2.cleanup(() => log.push('first'));
			api2.cleanup(() => log.push('second'));
		});
		expect(log).toEqual(['first']); // replaced immediately, like an effect cleanup
		dispose();
		expect(log).toEqual(['first', 'second']);
	});

	it('disposing one effect from inside another leaves the outer scope intact', () => {
		const log = [];
		const api2 = scoped((fn) => fn());
		const disposeA = api2.effect(() => {
			api2.cleanup(() => log.push('a'));
		});
		const disposeB = api2.effect(() => {
			disposeA(); // current scope is B's, not A's: A's teardown still runs
			api2.cleanup(() => log.push('b'));
		});
		disposeB();
		expect(log).toEqual(['a', 'b']);
	});

	it('wire() clears hooks a library does not provide', () => {
		const target = { effect: () => {}, signal: () => {} };
		const sig = () => {};
		wire(target, { signal: sig });
		expect(target.signal).toBe(sig);
		expect(target.effect).toBeUndefined();
		expect(target.get).toBeUndefined();
		expect(target.batch).toBeUndefined();
	});
});

/* ------------------------------------------- subscribe-only adapter shapes */

describe('subscribe-only adapters called directly', () => {
	it('rxjs: set() pushes through .next, any() subscribes and unsubscribes', () => {
		const t = {};
		useRxjs(t);
		const subject = t.signal(1);
		t.set(subject, 5);
		expect(subject.value).toBe(5);
		const seen = [];
		const off = t.any(subject)((v) => seen.push(v));
		t.set(subject, 6);
		off();
		t.set(subject, 7);
		expect(seen).toEqual([5, 6]);
		expect(t.any({})).toBeUndefined();
		expect(t.any(null)).toBeUndefined();
	});

	it('nanostores: set() writes the atom, any() follows it, non-atoms rejected', () => {
		const t = {};
		useNanostores(t);
		const atomCell = t.signal(1);
		t.set(atomCell, 3);
		expect(atomCell.get()).toBe(3);
		const seen = [];
		const off = t.any(atomCell)((v) => seen.push(v));
		t.set(atomCell, 4);
		off();
		expect(seen).toEqual([3, 4]);
		expect(t.any({ subscribe: () => {} })).toBeUndefined(); // no .get -> not a nanostore
	});

	it('tanstack: set() uses setState, get() reads .state or a plain .value', () => {
		const t = {};
		useTanstackStore(t);
		const store = t.signal(1);
		t.set(store, 9);
		expect(store.state).toBe(9);
		expect(t.get(store)).toBe(9);
		expect(t.get({ value: 7 })).toBe(7);
		expect(t.any({ value: 1 })).toBeUndefined();
		const seen = [];
		const off = t.any(store)((v) => seen.push(v));
		t.set(store, 10);
		off();
		expect(seen).toEqual([9, 10]);
	});

	it('s-js: nested batch flushes writes once, at the outer boundary', () => {
		useSjs();
		const cell = signal(0);
		let runs = 0;
		const off = effect(() => {
			read(cell);
			runs++;
		});
		batch(() => {
			batch(() => write(cell, 1));
			write(cell, 2);
		});
		expect(read(cell)).toBe(2);
		expect(runs).toBe(2); // initial run + one coalesced run
		off();
	});
});

/* ------------------------------------------------------------- morphAdapter */

describe('morphAdapter node-type matrix', () => {
	const text = (v) => document.createTextNode(v);
	const el = (tag, v) => {
		const n = document.createElement(tag);
		n.textContent = v;
		return n;
	};
	const setup = (oldNodes) => {
		const parent = document.createElement('div');
		const end = text('');
		oldNodes.forEach((n) => parent.append(n));
		parent.append(end);
		document.body.append(parent);
		return { parent, end };
	};

	it('rewrites changed text in place and keeps identical text untouched', () => {
		const a = text('a');
		const { parent, end } = setup([a]);
		const next = [text('b')];
		morphAdapter(vi.fn())(parent, [a], next, end);
		expect(next[0]).toBe(a);
		expect(a.nodeValue).toBe('b');
		const same = [text('b')];
		morphAdapter(vi.fn())(parent, [a], same, end);
		expect(same[0]).toBe(a);
	});

	it('morphs same-tag elements through the morph function', () => {
		const a = el('div', 'old');
		const { parent, end } = setup([a]);
		const morph = vi.fn((from, to) => { from.textContent = to.textContent; });
		const next = [el('div', 'new')];
		morphAdapter(morph)(parent, [a], next, end);
		expect(morph).toHaveBeenCalled();
		expect(next[0]).toBe(a);
		expect(a.textContent).toBe('new');
	});

	it('swaps nodes of different types or tags, and drops surplus old nodes', () => {
		const a = el('div', 'x');
		const b = el('p', 'drop');
		const { parent, end } = setup([a, b]);
		const span = el('span', 'y');
		const next = [span];
		morphAdapter(vi.fn())(parent, [a, b], next, end);
		expect(next[0]).toBe(span);
		expect(parent.contains(span)).toBe(true);
		expect(parent.contains(a)).toBe(false);
		expect(parent.contains(b)).toBe(false);
	});

	it('swaps in for a detached old node and inserts fresh nodes before the anchor', () => {
		const detached = el('div', 'gone');
		const kept = el('i', 'k');
		const { parent, end } = setup([kept]);
		const fresh = el('b', 'f');
		const replacement = el('u', 'r');
		const next = [kept, replacement, fresh];
		morphAdapter(vi.fn())(parent, [kept, detached], next, end);
		expect(next[1]).toBe(replacement);
		expect([...parent.childNodes].filter((n) => n !== end)).toEqual([kept, replacement, fresh]);
	});

	it('reconciles order when the new list is a permutation', () => {
		const a = el('i', 'a');
		const b = el('i', 'b');
		const { parent, end } = setup([a, b]);
		const next = [b, a];
		morphAdapter(vi.fn())(parent, [a, b], next, end);
		expect([...parent.childNodes].filter((n) => n !== end)).toEqual([b, a]);
	});

	it('works without an anchor and skips surplus old nodes that are detached', () => {
		const a = el('i', 'a');
		const detached = el('i', 'detached');
		const { parent, end } = setup([a]);
		const fresh = el('b', 'fresh');
		const next = [a, fresh];
		// detached is "old" but not in the parent: the swap/removal paths must skip it
		morphAdapter(vi.fn())(parent, [a, detached], next, null);
		expect([...parent.childNodes].filter((n) => n !== end)).toEqual([a, fresh]);
	});

	it('surplus loops: detached surplus old is skipped, surplus new inserts at the end', () => {
		const a = el('i', 'a');
		const detached = el('i', 'detached');
		const { parent } = setup([a]);
		// one swap pair (a kept, nothing shared) plus a detached surplus old node
		const kept = el('i', 'a');
		morphAdapter(vi.fn())(parent, [a, detached], [kept], null);
		expect(parent.contains(detached)).toBe(false);
		// surplus fresh nodes with no anchor append at the end
		const f1 = el('b', '1');
		const f2 = el('b', '2');
		const parent2 = setup([]).parent;
		morphAdapter(vi.fn())(parent2, [], [f1, f2], null);
		expect([...parent2.childNodes].filter((n) => n.nodeType === 1)).toEqual([f1, f2]);
	});
});

/* -------------------------------------------------------------- diff presets */

describe('diff presets called directly', () => {
	const text = (v) => document.createTextNode(v);
	const setup = () => {
		const parent = document.createElement('div');
		document.body.append(parent);
		return parent;
	};

	it('rebuild drops everything and re-inserts, with and without an anchor', () => {
		const t = {};
		useRebuild(t);
		const parent = setup();
		const a = text('a');
		parent.append(a);
		const b = text('b');
		t.diff(parent, [a], [b], null);
		expect([...parent.childNodes]).toEqual([b]);
		const end = text('');
		parent.append(end);
		const c = text('c');
		t.diff(parent, [b], [c], end);
		expect([...parent.childNodes]).toEqual([c, end]);
	});

	it('fast-array-diff removes, inserts and reorders against an anchor', () => {
		const t = {};
		useFastArrayDiff(t);
		const parent = setup();
		const a = text('a');
		const b = text('b');
		const end = text('');
		parent.append(a, b, end);
		const c = text('c');
		t.diff(parent, [a, b], [b, c], end);
		expect([...parent.childNodes]).toEqual([b, c, end]);
		t.diff(parent, [b, c], [c], null);
		expect([...parent.childNodes].filter((n) => n !== end)).toEqual([c]);
	});

	it('domdiff replaces through its options-object signature', () => {
		const t = {};
		useDomdiff(t);
		const parent = setup();
		const a = text('a');
		parent.append(a);
		const b = text('b');
		t.diff(parent, [a], [b], null);
		expect(parent.textContent).toBe('b');
	});

	it('morphdom and nanomorph write morphed nodes back into the new list', () => {
		for (const install of [useMorphdom, useNanomorph]) {
			const t = {};
			install(t);
			const parent = setup();
			const a = document.createElement('div');
			a.textContent = 'old';
			parent.append(a);
			const b = document.createElement('div');
			b.textContent = 'new';
			const next = [b];
			t.diff(parent, [a], next, null);
			expect(next[0]).toBe(a);
			expect(a.textContent).toBe('new');
		}
	});
});
