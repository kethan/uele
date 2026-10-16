/**
 * Wire uele to `solid-js` - accessors (signals and memos alike) from the CLIENT build.
 *
 *     import { useSolid } from 'uele/adapters/solid';
 *     useSolid();
 */
import { api } from 'uele';
import * as m from 'solid-js/dist/solid.js';
import { scoped, wire } from './util.js';

export const useSolid = (target = api) => {
	const s = scoped((fn) => {
		let dispose;
		m.createRoot((d) => {
			dispose = d;
			m.createEffect(fn);
		});
		return dispose;
	});
	return wire(target, {
		is: (v) => typeof v === 'function' && v.name.includes('readSignal'),
		get: (v) => v(),
		effect: s.effect,
		cleanup: s.cleanup,
		signal: (v) => {
			const [read, write] = m.createSignal(v);
			read.write = write; // one cell for the facade: read with `cell()`, write with `cell.write(v)`
			return read;
		},
		derived: (fn) => m.createMemo(fn),
		set: (cell, v) => { cell.write(v); },
		batch: m.batch,
		untracked: m.untracked
	});
};
