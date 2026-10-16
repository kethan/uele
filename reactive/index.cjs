'use strict';

var uele = require('uele');

/**
 * Write a UI primitive or utility ONCE and run it on any signal library.
 *
 *     import { signal, computed, effect, write } from 'uele/reactive';
 *
 *     export const useCounter = (start = 0) => {
 *       const count = signal(start);
 *       const doubled = computed(() => count.value + count.value); // or read(count) * 2
 *       return { count, doubled, inc: () => write(count, read(count) + 1) };
 *     };
 *
 * Every function here delegates to the hooks the active preset installed
 * (`usePreactSignals()`, `useSolid()`, …), so the same code runs on ulive,
 * preact, vue, usignal, alien-signals, s-js, mobx or solid-js - and, for the
 * parts that do not need an effect runner, on rxjs, nanostores and
 * `@tanstack/store` too.
 *
 * Two capabilities are library-dependent. Feature-detect them instead of
 * guessing:
 *   `canEffect()`  - reactive thunks/effects (false for subscribe-only stores)
 *   `canCompute()` - `computed()` (same: needs an effect runner)
 */

const missing = (hook, why) => () => {
	throw new Error(`uele/reactive: the active signal preset has no '${hook}' (${why})`);
};

/** create a cell: a signal, ref, atom, box, subject, store, accessor… */
const signal = (value) => {
	if (!uele.api.signal) return missing('signal', 'install a preset first: import { usePreactSignals } from "uele/adapters/preact"')();
	return uele.api.signal(value);
};

/** derive a value from other cells; the thunk re-runs when they change */
const computed = (fn) => {
	if (!uele.api.derived) return missing('computed', 'the active library is subscribe-only - derive with its own API, or pick an effect-capable preset')();
	return uele.api.derived(fn);
};

/** run `fn` now and again whenever the cells it reads change; returns a disposer */
const effect = (fn) => {
	if (!uele.api.effect) return missing('effect', 'the active library is subscribe-only - there is no effect runner')();
	return uele.api.effect(fn);
};

/** coalesce the writes inside `fn` into one update (no-op when unsupported) */
const batch = (fn) => {
	if (!uele.api.batch) return fn();
	let out;
	uele.api.batch(() => {
		out = fn();
	});
	return out;
};

/** read cells without subscribing to them (no-op passthrough when unsupported) */
const untracked = (fn) => (uele.api.untracked ? uele.api.untracked(fn) : fn());

/** read a cell's current value */
const read = (cell) => uele.api.get(cell);

/** write any cell the active preset produces */
const write = (cell, value) => {
	// 1. a cell this library owns goes through the library's own hook (it may
	//    need it: s-js writes inside a batch, solid writes through `.write`)
	if (uele.api.set && uele.api.is && uele.api.is(cell)) return uele.api.set(cell, value);
	// 2. a function is a setter (solid accessors carry their writer on `.write`)
	if (typeof cell === 'function') return typeof cell.write === 'function' ? cell.write(value) : cell(value);
	// 3. explicit cell interfaces (mobx/nanostores `.set`, rxjs `.next`, tanstack `.setState`)
	if (cell == null || typeof cell !== 'object') return; // nothing to write into
	if (typeof cell.set === 'function') return cell.set(value);
	if (typeof cell.next === 'function') return cell.next(value);
	if (typeof cell.setState === 'function') return cell.setState(value);
	if (typeof cell.write === 'function') return cell.write(value);
	// 4. the active library's own shape, then a plain `.value` box
	if (uele.api.set) return uele.api.set(cell, value);
	if ('value' in cell) cell.value = value;
};

/** is this value a cell of the active library? */
const isCell = (value) => !!uele.api.is?.(value);

/** capabilities of the active preset (see the module docs) */
const canEffect = () => typeof uele.api.effect === 'function';
const canCompute = () => typeof uele.api.derived === 'function';

/** the object the presets configure - for advanced use */
const active = () => uele.api;

exports.active = active;
exports.batch = batch;
exports.canCompute = canCompute;
exports.canEffect = canEffect;
exports.computed = computed;
exports.effect = effect;
exports.isCell = isCell;
exports.read = read;
exports.signal = signal;
exports.untracked = untracked;
exports.write = write;
