/**
 * Wire uele to `rescript-signals`. Install before creating reactive content.
 *
 *     import { useRescriptSignals } from 'uele/adapters/rescript-signals';
 *     useRescriptSignals();
 */
import * as Signal from 'rescript-signals/src/signals/Signal.res.mjs';
import * as Computed from 'rescript-signals/src/signals/Computed.res.mjs';
import * as Effect from 'rescript-signals/src/signals/Effect.res.mjs';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useRescriptSignals = (target = api) => {
	// Use callable wrappers: the package's generated node records are opaque.
	const cells = new WeakSet();
	const wrap = (node, writable = false) => {
		const read = () => Signal.get(node);
		if (writable) read.write = (value) => Signal.set(node, value);
		cells.add(read);
		return read;
	};
	const s = scoped((fn) => Effect.runWithDisposer(() => { fn(); }).dispose);
	return wire(target, {
		is: (v) => typeof v === 'function' && cells.has(v), get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (v) => wrap(Signal.make(v), true), derived: (fn) => wrap(Computed.make(fn)),
		set: (cell, value) => cell.write(value), batch: Signal.batch
	});
};
