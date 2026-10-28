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
document.querySelector('#demo').append(counter.view, cart.view);
window.addEventListener('pagehide', () => {
    counter.dispose();
    cart.dispose();
}, { once: true });
