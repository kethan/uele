/**
 * Wire uele to `@reactively/core`. Install before creating reactive content.
 *
 *     import { reactively } from 'uele/signals/reactively';
 *     reactively();
 */
import { Reactive, stabilize } from '@reactively/core';
import { api } from 'uele';
import { scoped, install } from './internal.js';

export const reactively = (target = api) => {
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
	return install(target, {
		is: (v) => v instanceof Reactive, get: (v) => v.get(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (v) => new Reactive(v), computed: (fn) => new Reactive(fn),
		set: (cell, value) => batch(() => cell.set(value)), batch
	});
};
