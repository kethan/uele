/**
 * Wire uele to `solid-js` - accessors (signals and memos alike) from the CLIENT build.
 *
 *     import { solid } from 'uele/signals/solid';
 *     solid();
 */
import { api } from 'uele';
import * as m from 'solid-js/dist/solid.js';
import { scoped, install } from './internal.js';

export const solid = (target = api) => {
	const s = scoped((fn) => {
		let dispose;
		m.createRoot((d) => {
			dispose = d;
			m.createEffect(fn);
		});
		return dispose;
	});
	return install(target, {
		is: (v) => typeof v === 'function' && v.name.includes('readSignal'),
		get: (v) => v(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => {
			const [read, write] = m.createSignal(v);
			read.write = write; // one cell for the facade: read with `cell()`, write with `cell.write(v)`
			return read;
		},
		computed: (fn) => m.createMemo(fn),
		set: (cell, v) => { cell.write(v); },
		batch: m.batch,
		untracked: m.untracked
	});
};
