import { h, useLive } from 'uele/tiny';

const Counter = () => {
    let count = 0;
    const [nodes, update] = useLive(count);
    return h('main', null,
        h('h1', null, 'Counter'),
        h('output', { 'aria-live': 'polite' }, nodes),
        h('button', { onclick: () => update(++count) }, 'Increment'),
        h('button', { onclick: () => update(--count) }, 'Decrement'));
};
document.body.append(h(Counter));
