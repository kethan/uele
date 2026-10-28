/**
 * Wire uele to `oby`. Install before creating reactive content.
 *
 *     import { useOby } from 'uele/adapters/oby';
 *     useOby();
 */
import $ from 'oby';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useOby = (target = api) => {
	let depth = 0;
	const batch = (fn) => {
		depth++;
		try { return fn(); } finally { if (!--depth) $.tick(); }
	};
	const s = scoped((fn) => $.effect(() => { fn(); }, { sync: 'init' }));
	return wire(target, {
		is: $.isObservable, get: (v) => v(), effect: s.effect, cleanup: s.cleanup,
		signal: (v) => $(v), derived: (fn) => $.memo(fn),
		set: (cell, value) => batch(() => cell(() => value)),
		batch, untracked: $.untrack
	});
};
