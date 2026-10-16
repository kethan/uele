/**
 * Shared plumbing for the reactivity presets.
 *
 * Every `use…(target = api)` call assigns a COMPLETE reactivity surface to the
 * target (the main `api` by default - pass `uele/lite`'s `api` for the tiny
 * core): hooks a library does not implement are explicitly cleared, so
 * switching presets can never leave a stale hook behind. `scoped` wraps a
 * library effect runner into uele's `(api.effect, api.cleanup)` pair.
 *
 * Beyond the four hooks uele itself needs (`is`, `get`, `effect`, `cleanup`,
 * plus the optional `any`), a preset publishes the AUTHORING hooks
 * `uele/reactive` uses to build signal-agnostic utilities:
 *
 *   `signal(v)`    create a cell         `derived(fn)`  derive a value
 *   `set(cell, v)` write any cell        `batch(fn)`    coalesce writes
 *   `untracked(fn)` read without subscribing
 */
export const scoped = (run) => {
	let current = null;
	return {
		effect: (fn) => {
			const cleanups = [];
			const outer = current;
			current = cleanups;
			let off;
			try {
				off = run(fn);
			} finally {
				current = outer;
			}
			return () => {
				typeof off === 'function' ? off() : off?.unsubscribe?.();
				if (current === cleanups) current = null;
				cleanups.forEach((f) => typeof f === 'function' && f());
				cleanups.length = 0;
			};
		},
		cleanup: (fn) => {
			// usub also calls the hook with `undefined` when no teardown was given
			if (!current || typeof fn !== 'function') return;
			// a re-run replaces the previous teardown, exactly like an effect cleanup
			current.forEach((f) => typeof f === 'function' && f());
			current.length = 0;
			current.push(fn);
		}
	};
};

/** every hook a preset may install; `wire` clears the ones a library has not */
export const HOOKS = {
	is: undefined,
	get: undefined,
	effect: undefined,
	cleanup: undefined,
	any: undefined,
	signal: undefined,
	derived: undefined,
	set: undefined,
	batch: undefined,
	untracked: undefined
};

/** assigns the full surface - unused hooks are cleared, not left stale */
export const wire = (target, overrides) => Object.assign(target, { ...HOOKS }, overrides);
