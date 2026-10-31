import { h, useLive } from 'uele';
import { store } from 'ustor';

// Configure uele and call connectStore() once in your application bootstrap.
export const createCounter = (initial = 0) => {
    const state = store({
        count: initial,
        get double() { return this.count * 2; }
    });
    const content = h('section', { 'aria-label': 'Store counter' },
        h('button', { type: 'button', onclick: () => state.count++ }, 'Increment'),
        h('output', { 'data-count': '' }, () => state.count),
        // $double exposes the underlying computed cell; a thunk works too.
        h('output', { 'data-double': '' }, state.$double)
    );
    const [nodes, replace] = useLive(content);
    return {
        view: h('div', nodes),
        dispose: () => replace(null),
        state
    };
};
