/**
 * Signal-library adapters.
 *
 * uele is reactivity-agnostic: everything happens through the `api` object
 * re-exported from `usub` (`api.is`, `api.get`, `api.effect`, plus the optional
 * `api.any` / `api.cleanup` hooks). This module installs ten different signal
 * libraries into that hook and exposes a uniform "cell" API so the conformance
 * suite can drive every library with the same assertions.
 *
 * A cell is whatever the library calls a mutable reactive value: a signal,
 * a ref, an atom, a boxed observable, a BehaviorSubject, a store, a data fn...
 */
import { api } from 'usub';
import { api as tinyApi } from 'usub/tiny';

/** the pristine usub hooks, so a suite can always restore them */
export const DEFAULT_API = {
	is: api.is,
	get: api.get,
	effect: api.effect,
	any: api.any,
	cleanup: api.cleanup
};

/** uele ships two reactivity instances: the main one and `usub/tiny` for lite */
export const APIS = { main: api, lite: tinyApi };

/** installs an adapter's hooks on top of the pristine ones */
export const install = (target, adapter) => Object.assign(target, DEFAULT_API, adapter.overrides);

/**
 * Wraps a library effect runner into the `(api.effect, api.cleanup)` pair uele
 * expects: `effect` returns a disposer and `cleanup` registers a teardown that
 * runs before the next re-run and on dispose.
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

const ulive = async () => {
	const m = await import('ulive');
	const s = scoped(m.effect);
	return {
		name: 'ulive (baseline)',
		reactiveThunks: true,
		notes: 'signals with peek/value, effect() returns a disposer',
		overrides: { is: (v) => v?.peek, get: (v) => v.value, effect: s.effect, cleanup: s.cleanup },
		signal: (v) => m.signal(v),
		set: (cell, v) => {
			cell.value = v;
		},
		read: (cell) => cell.value,
		derived: (cell, fn) => m.computed(() => fn(cell.value)),
		batch: m.batch,
		untracked: m.untracked,
		raw: m
	};
};

const preact = async () => {
	const m = await import('@preact/signals-core');
	const s = scoped(m.effect);
	return {
		name: '@preact/signals-core',
		reactiveThunks: true,
		subscribePath: true,
		notes: 'Signal instances with .value; since 1.13 they also expose .subscribe(), which usub prefers over api.effect',
		overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value, effect: s.effect, cleanup: s.cleanup },
		signal: (v) => m.signal(v),
		set: (cell, v) => {
			cell.value = v;
		},
		read: (cell) => cell.value,
		derived: (cell, fn) => m.computed(() => fn(cell.value)),
		batch: m.batch,
		untracked: m.untracked,
		raw: m
	};
};

const vue = async () => {
	const m = await import('@vue/reactivity');
	// effect() returns a runner object: stop() is the actual disposer
	const s = scoped((fn) => {
		const runner = m.effect(fn);
		return () => m.stop(runner);
	});
	return {
		name: '@vue/reactivity',
		reactiveThunks: true,
		notes: 'ref()/computed() with .value, effect() returns a runner that needs stop()',
		overrides: { is: m.isRef, get: (v) => v.value, effect: s.effect, cleanup: s.cleanup },
		signal: (v) => m.ref(v),
		set: (cell, v) => {
			cell.value = v;
		},
		read: (cell) => cell.value,
		derived: (cell, fn) => m.computed(() => fn(cell.value)),
		scope: () => m.effectScope(),
		stop: m.stop,
		onScopeDispose: m.onScopeDispose,
		raw: m
	};
};

const usignal = async () => {
	const m = await import('usignal');
	const s = scoped(m.effect);
	return {
		name: 'usignal',
		reactiveThunks: true,
		// usignal attributes a read to every enclosing effect, so a thunk that
		// renders a child region also re-runs when that region's signal changes
		nestedReads: 'broadcast',
		notes: 'Signal class with .value, effect() returns a disposer, batch() coalesces',
		overrides: { is: (v) => v instanceof m.Signal, get: (v) => v.value, effect: s.effect, cleanup: s.cleanup },
		signal: (v) => m.signal(v),
		set: (cell, v) => {
			cell.value = v;
		},
		read: (cell) => cell.value,
		derived: (cell, fn) => m.computed(() => fn(cell.value)),
		batch: m.batch,
		raw: m
	};
};

const alien = async () => {
	const m = await import('alien-signals');
	const s = scoped(m.effect);
	return {
		name: 'alien-signals',
		reactiveThunks: true,
		notes: 'signals are plain functions (read: s(), write: s(v)), effect() returns a stop handle',
		overrides: { is: (v) => typeof v === 'function', get: (v) => v(), effect: s.effect, cleanup: s.cleanup },
		signal: (v) => m.signal(v),
		set: (cell, v) => cell(v),
		read: (cell) => cell(),
		derived: (cell, fn) => m.computed(() => fn(cell())),
		batch: (fn) => {
			m.startBatch();
			try {
				return fn();
			} finally {
				m.endBatch();
			}
		},
		raw: m
	};
};

const sjs = async () => {
	const S = (await import('s-js')).default;
	return {
		name: 's-js',
		reactiveThunks: true,
		notes: 'data() functions are read/written by calling them, S.root() owns the disposer, S.cleanup() is used natively',
		overrides: {
			is: (v) => typeof v === 'function',
			get: (v) => v(),
			effect: (fn) => {
				let dispose;
				S.root((d) => {
					dispose = d;
					S.effect(fn);
				});
				return dispose;
			},
			// usub calls the hook with `undefined` when a subscription has no teardown
			cleanup: (fn) => fn && S.cleanup(fn)
		},
		signal: (v) => S.data(v),
		set: (cell, v) => cell(v),
		read: (cell) => cell(),
		// created inside a root so s-js owns (and can dispose) the computation
		derived: (cell, fn) => {
			let node;
			S.root(() => {
				node = S(() => fn(cell()));
			});
			return node;
		},
		raw: S,
		root: S.root
	};
};

const mobx = async () => {
	const m = await import('mobx');
	m.configure({ enforceActions: 'never', useProxies: 'never' });
	const s = scoped(m.autorun);
	return {
		name: 'mobx',
		reactiveThunks: true,
		notes: 'boxed observables and computed values with .get(), autorun() returns a disposer',
		overrides: {
			is: (v) => m.isBoxedObservable(v) || m.isComputed(v),
			get: (v) => v.get(),
			effect: s.effect,
			cleanup: s.cleanup
		},
		signal: (v) => m.observable.box(v),
		set: (cell, v) => cell.set(v),
		read: (cell) => cell.get(),
		derived: (cell, fn) => m.computed(() => fn(cell.get())),
		reaction: m.reaction,
		autorun: m.autorun,
		raw: m
	};
};

const rxjs = async () => {
	const m = await import('rxjs');
	return {
		name: 'rxjs',
		subscribePath: true,
		// consumed through api.any in the tiny core (lite), which has no .subscribe path
		anyPath: true,
		notes: 'usub drives it through .subscribe()/.unsubscribe(); is/get make synchronous reads (map/For) work and api.any covers the tiny core used by `lite`',
		overrides: {
			is: (v) => !!v?.subscribe && typeof v.pipe === 'function',
			get: (v) => v?.value,
			any: (src) =>
				src?.subscribe
					? (next) => {
							const s = src.subscribe((v) => next(v));
							return () => s.unsubscribe();
						}
					: undefined
		},
		// no effect implementation: reactive thunks/components cannot re-run
		reactiveThunks: false,
		signal: (v) => new m.BehaviorSubject(v),
		set: (cell, v) => cell.next(v),
		read: (cell) => cell.value,
		derived: (cell, fn) => cell.pipe(m.map(fn)),
		raw: m
	};
};

const nanostores = async () => {
	const m = await import('nanostores');
	return {
		name: 'nanostores',
		subscribePath: true,
		// consumed through api.any in the tiny core (lite), which has no .subscribe path
		anyPath: true,
		notes: 'atoms/computed stores expose .subscribe(); is/get make synchronous reads work and api.any covers the tiny core used by `lite`',
		overrides: {
			is: (v) => !!v?.subscribe && typeof v.get === 'function',
			get: (v) => v?.get?.(),
			any: (src) =>
				src?.subscribe && typeof src.get === 'function' ? (next) => src.subscribe((v) => next(v)) : undefined
		},
		// no effect implementation: reactive thunks/components cannot re-run
		reactiveThunks: false,
		signal: (v) => m.atom(v),
		set: (cell, v) => cell.set(v),
		read: (cell) => cell.get(),
		derived: (cell, fn) => m.computed(cell, fn),
		batch: m.batch,
		batched: m.batched,
		onMount: m.onMount,
		onStop: m.onStop,
		mapStore: m.map,
		raw: m
	};
};

const tanstack = async () => {
	const m = await import('@tanstack/store');
	return {
		name: '@tanstack/store',
		subscribePath: true,
		// consumed through api.any in the tiny core (lite), which has no .subscribe path
		anyPath: true,
		notes: 'Store with .state/.setState; subscribe() does not emit synchronously, so the first render is empty by design',
		overrides: {
			is: (v) => v instanceof m.Store,
			get: (v) => (v instanceof m.Store ? v.state : v?.value),
			any: (src) =>
				src instanceof m.Store
					? (next) => {
							const sub = src.subscribe(() => next(src.state));
							return () => sub.unsubscribe();
						}
					: undefined
		},
		initialEmission: false,
		reactiveThunks: false,
		signal: (v) => new m.Store(v),
		set: (cell, v) => cell.setState(v),
		read: (cell) => cell.state,
		raw: m
	};
};

/** every library the conformance suite runs against */
export const ADAPTERS = [ulive, preact, vue, usignal, alien, sjs, mobx, rxjs, nanostores, tanstack];
