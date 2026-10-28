/**
 * Wire uele to `oby`. Install before creating reactive content.
 *
 *     import { oby } from 'uele/signals/oby';
 *     oby();
 */
import $ from 'oby';
import { api } from 'uele';
import { scoped, install } from './internal.js';

export const oby = (target = api) => {
	let depth = 0;
	const batch = (fn) => {
		depth++;
		try { return fn(); } finally { if (!--depth) $.tick(); }
	};
	const s = scoped((fn) => $.effect(() => { fn(); }, { sync: 'init' }));
	return install(target, {
		is: $.isObservable, get: (v) => v(), effect: s.effect, cleanup: s.cleanup,
		signal: (v) => $(v), computed: (fn) => $.memo(fn),
		set: (cell, value) => batch(() => cell(() => value)),
		batch, untracked: $.untrack
	});
};
