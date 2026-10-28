/**
 * Wire uele to `@tanstack/store` - `Store` with `.state`/`.setState()`; `subscribe()` is not synchronous.
 *
 *     import { tanstackStore } from 'uele/signals/tanstack';
 *     tanstackStore();
 */
import { api } from 'uele';
import { Store } from '@tanstack/store';
import { scoped, install } from './internal.js';

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

export const tanstackStore = (target = api) => {
	return install(target, {
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
