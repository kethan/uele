/**
 * Wire uele to `anod`. Install before creating reactive content.
 *
 *     import { useAnod } from 'uele/adapters/anod';
 *     useAnod();
 */
import { c, signal, batch as nativeBatch } from 'anod';
import { api } from 'uele';
import { scoped, wire } from './util.js';

export const useAnod = (target = api) => {
	// Anod tracks explicitly through a computation context, so bridge api.get
	// to context.val while executing a tracked computation.
	let reader, factory = c, depth = 0;
	const pending = new Map();
	const batch = (fn) => {
		let result;
		nativeBatch(() => {
			depth++;
			try { result = fn(); } finally { if (!--depth) pending.clear(); }
		});
		return result;
	};
	const cells = new WeakSet();
	const context = (nextReader, nextFactory, fn) => {
		const oldReader = reader, oldFactory = factory;
		reader = nextReader; factory = nextFactory;
		try { return fn(); } finally { reader = oldReader; factory = oldFactory; }
	};
	const wrap = (node, writable = false) => {
		const read = () => {
			const value = reader ? reader.val(node) : node.get();
			// Anod normally exposes committed values inside a batch. The facade
			// promises read-your-writes for source cells, like the other presets.
			if (depth && pending.has(node)) return pending.get(node);
			if (node.error) throw value;
			return value;
		};
		if (writable) read.write = (value) => {
			if (depth) pending.set(node, value);
			node.set(() => value);
		};
		cells.add(read);
		return read;
	};
	const s = scoped((fn) => {
		const node = factory.effect((ctx) => context(ctx, ctx, () => { fn(); }));
		return () => node.dispose();
	});
	return wire(target, {
		is: (v) => typeof v === 'function' && cells.has(v), get: (v) => v(),
		effect: s.effect, cleanup: s.cleanup,
		signal: (value) => wrap(signal(value), true),
		derived: (fn) => wrap(factory.compute((ctx) => context(ctx, factory, fn))),
		set: (cell, value) => cell.write(value), batch,
		untracked: (fn) => context(undefined, factory, fn)
	});
};
