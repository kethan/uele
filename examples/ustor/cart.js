import { h, For } from 'uele';
import { store } from 'ustor';
import { region } from './setup.js';

export const createCart = (items = []) => {
    const state = store({
        items: items.map(item => ({ ...item })),
        get total() { return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0); }
    });
    const dom = region(h('section', { 'aria-label': 'Store cart' },
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
    ));
    // Use unique, stable item IDs. Mutate returned proxies, not the raw input.
    return { ...dom, state };
};
