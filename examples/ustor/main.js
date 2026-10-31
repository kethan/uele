import { h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { connectStore } from './setup.js';
import { createCounter } from './counter.js';
import { createCart } from './cart.js';

preactSignals();
connectStore();
const counter = createCounter(1);
const cart = createCart([
    { id: 'book', name: 'Book', price: 12, quantity: 1 },
    { id: 'pen', name: 'Pen', price: 2, quantity: 3 }
]);
let nextId = 1;
const controls = h('div', null,
    h('button', { onclick: () => cart.state.items.push({
        id: `extra-${nextId++}`, name: 'Notebook', price: 5, quantity: 1
    }) }, 'Add item'),
    h('button', { onclick: () => cart.state.items.reverse() }, 'Reverse order'),
    h('button', { onclick: () => cart.state.items.pop() }, 'Remove last')
);
document.querySelector('#demo').append(counter.view, controls, cart.view);
window.addEventListener('pagehide', () => {
    counter.dispose();
    cart.dispose();
}, { once: true });
