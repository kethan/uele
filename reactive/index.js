/**
 * Write a UI primitive or utility ONCE and run it on any signal library.
 *
 *     import { signal, computed, effect, read, write } from 'uele/reactive';
 *
 *     export const useCounter = (start = 0) => {
 *       const count = signal(start);
 *       const doubled = computed(() => read(count) * 2);
 *       return { count, doubled, inc: () => write(count, read(count) + 1) };
 *     };
 *
 * Every function here delegates to the hooks the active preset installed
 * (`preactSignals()`, `solid()`, …), so the same code runs on ulive,
 * preact, vue, usignal, alien-signals, s-js, mobx or solid-js - and, for the
 * parts that do not need an effect runner, on rxjs, nanostores and
 * `@tanstack/store` too.
 *
 * Two capabilities are library-dependent. Feature-detect them instead of
 * guessing:
 *   `canEffect()`  - reactive thunks/effects (false for subscribe-only stores)
 *   `canCompute()` - `computed()` (same: needs an effect runner)
 */
import { api } from 'uele';

const missing = (hook, why) => () => {
	throw new Error(`uele/reactive: the active signal preset has no '${hook}' (${why})`);
};

/** create a cell: a signal, ref, atom, box, subject, store, accessor… */
export const signal = (value) => {
	if (!api.signal) return missing('signal', 'install a preset first: import { preactSignals } from "uele/signals/preact"')();
	return api.signal(value);
};

/** derive a value from other cells; the thunk re-runs when they change */
export const computed = (fn) => {
	if (!api.computed) return missing('computed', 'the active library is subscribe-only - derive with its own API, or pick an effect-capable preset')();
	return api.computed(fn);
};

/** run `fn` now and again whenever the cells it reads change; returns a disposer */
export const effect = (fn) => {
	if (!api.effect) return missing('effect', 'the active library is subscribe-only - there is no effect runner')();
	return api.effect(fn);
};

/** coalesce the writes inside `fn` into one update (no-op when unsupported) */
export const batch = (fn) => {
	if (!api.batch) return fn();
	let out;
	api.batch(() => {
		out = fn();
	});
	return out;
};

/** read cells without subscribing to them (no-op passthrough when unsupported) */
export const untracked = (fn) => (api.untracked ? api.untracked(fn) : fn());

/** read a cell's current value */
export const read = (cell) => api.get(cell);

/** write any cell the active preset produces */
export const write = (cell, value) => {
	// 1. a cell this library owns goes through the library's own hook (it may
	//    need it: s-js writes inside a batch, solid writes through `.write`)
	if (api.set && api.is && api.is(cell)) return api.set(cell, value);
	// 2. a function is a setter (solid accessors carry their writer on `.write`)
	if (typeof cell === 'function') return typeof cell.write === 'function' ? cell.write(value) : cell(value);
	// 3. explicit cell interfaces (mobx/nanostores `.set`, rxjs `.next`, tanstack `.setState`)
	if (cell == null || typeof cell !== 'object') return; // nothing to write into
	if (typeof cell.set === 'function') return cell.set(value);
	if (typeof cell.next === 'function') return cell.next(value);
	if (typeof cell.setState === 'function') return cell.setState(value);
	if (typeof cell.write === 'function') return cell.write(value);
	// 4. the active library's own shape, then a plain `.value` box
	if (api.set) return api.set(cell, value);
	if ('value' in cell) cell.value = value;
};

/** is this value a cell of the active library? */
export const isCell = (value) => !!api.is?.(value);

/** capabilities of the active preset (see the module docs) */
export const canEffect = () => typeof api.effect === 'function';
export const canCompute = () => typeof api.computed === 'function';

/** the object the presets configure - for advanced use */
export const active = () => api;
