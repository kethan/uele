/**
 * Wire uele to `@tanstack/store` - `Store` with `.state`/`.setState()`; `subscribe()` is not synchronous.
 *
 *     import { useTanstackStore } from 'uele/adapters/tanstack';
 *     useTanstackStore();
 */
import { api } from 'uele';
import { Store } from '@tanstack/store';
import { scoped, wire } from './util.js';

/**
 * `Store.subscribe()` does not emit synchronously, so a cell created by this
 * adapter would render empty until its first change. `Cell` replays its value
 * to every new subscriber; it is still a `Store`, so `is`/`any` accept it.
 */
export class Cell extends Store {
	subscribe(listener) {
		listener(this.state);
		return super.subscribe(listener);
	}
}

export const useTanstackStore = (target = api) => {
	return wire(target, {
		is: (v) => v instanceof Store,
		get: (v) => (v instanceof Store ? v.state : v?.value),
		any: (src) =>
			src instanceof Store
				? (next) => {
						const sub = src.subscribe(() => next(src.state));
						return () => sub.unsubscribe();
				  }
				: undefined,
		signal: (v) => new Cell(v),
		set: (cell, v) => { cell.setState(v); }
	});
};
