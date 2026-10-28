import { h } from 'uele';
import { store } from 'ustor';
import { region } from './setup.js';

// Configure uele and call connectStore() once in your application bootstrap.
export const createCounter = (initial = 0) => {
    const state = store({
        count: initial,
        get double() { return this.count * 2; }
    });
    const dom = region(h('section', { 'aria-label': 'Store counter' },
        h('button', { type: 'button', onclick: () => state.count++ }, 'Increment'),
        h('output', { 'data-count': '' }, () => state.count),
        // $double exposes the underlying computed cell; a thunk works too.
        h('output', { 'data-double': '' }, state.$double)
    ));
    return { ...dom, state };
};
