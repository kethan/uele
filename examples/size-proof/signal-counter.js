import { h, api } from 'uele/tiny';
import { signal, effect } from 'ulive';

// Tiny signal integration: all integration and ulive bytes are included.
api.is = value => !!value?.peek;
api.get = value => api.is(value) ? value.value : typeof value === 'function' ? value() : value;
api.sub = (source, next) => effect(() => { next(api.get(source)); });
const Counter = () => {
    const count = signal(0);
    return h('main', null,
        h('h1', null, 'Signal counter'),
        h('output', { 'aria-live': 'polite' }, count),
        h('button', { onclick: () => count.value++ }, 'Increment'),
        h('button', { onclick: () => count.value-- }, 'Decrement'));
};
document.body.append(h(Counter));
