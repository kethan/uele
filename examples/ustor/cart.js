import { h, useLive } from 'uele';
import { For } from 'uele/flow';
import { store } from 'ustor';

export const createCart = (items = []) => {
    const state = store({
        items: items.map(item => ({ ...item })),
        get total() {
            return this.items.reduce(
                (sum, item) => sum + item.price * item.quantity, 0
            );
        }
    });
    const content = h('section', { 'aria-label': 'Store cart' },
        h('ul', null, For({
            each: () => state.items,
            key: item => item.id,
            fallback: h('li', null, 'Cart is empty'),
            children: item => h('li', { 'data-id': item.id },
                h('span', null, () => `${item.name}: ${item.quantity}`),
                h('button', { type: 'button', onclick: () => item.quantity++ }, '+')
            )
        })),
        h('output', { 'data-total': '' }, () => state.total.toFixed(2))
    );
    // Use unique, stable item IDs. Mutate returned proxies, not the raw input.
    const [nodes, replace] = useLive(content);
    return {
        view: h('div', nodes),
        dispose: () => replace(null),
        state
    };
};
