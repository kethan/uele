/**
 * Wire uele to `@reactively/core`. Install before creating reactive content.
 *
 *     import { useReactively } from 'uele/adapters/reactively';
 *     useReactively();
 */
import { Reactive, stabilize } from '@reactively/core';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useReactively = (target = api) => {
	let depth = 0;
	const batch = (fn) => {
		depth++;
		try { return fn(); } finally { if (!--depth) stabilize(); }
	};
	const s = scoped((fn) => {
		const observer = new Reactive(() => { fn(); }, true);
		observer.get();
		return () => observer.set(undefined);
	});
	return wire(target, {
		is: (v) => v instanceof Reactive, get: (v) => v.get(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (v) => new Reactive(v), derived: (fn) => new Reactive(fn),
		set: (cell, value) => batch(() => cell.set(value)), batch
	});
};
