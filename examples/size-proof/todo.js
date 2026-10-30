import { h, api } from 'uele/tiny';
import { signal, effect } from 'ulive';

// Explicit signal integration; dependency + integration bytes count in the proof.
api.is = value => !!value?.peek || typeof value === 'function';
api.get = value => value?.peek ? value.value : typeof value === 'function' ? value() : value;
api.sub = (source, next) => effect(() => { next(api.get(source)); });

const Todo = () => {
    const items = signal([]);
    let id = 0;
    const input = h('input', { placeholder: 'New todo', 'aria-label': 'New todo' });
    return h('main', null, h('h1', null, 'Todos'),
        h('form', { onsubmit: event => {
            event.preventDefault();
            const text = input.value.trim();
            if (text) {
                items.value = [...items.value, { id: ++id, text, done: signal(false) }];
                input.value = '';
            }
        } }, input, h('button', { type: 'submit' }, 'Add')),
        h('ul', null, () => items.value.map(item => item.node ||= h('li', null,
            h('label', null,
                h('input', { type: 'checkbox', checked: item.done, onchange: event => { item.done.value = event.target.checked; } }),
                h('span', { style: { textDecoration: () => item.done.value ? 'line-through' : 'none' } }, item.text)),
            h('button', { onclick: () => { items.value = items.value.filter(other => other.id !== item.id); } }, 'Delete')))));
};
document.body.append(h(Todo));
