import { h } from 'uele';
import { For } from 'uele/flow';
import { state } from '../state/state.js';

// No signal package, preset, dependency tracking or api configuration.
export const TodoApp = () => {
    const items = state([]);
    let id = 0;
    const input = h('input', { placeholder: 'New todo', 'aria-label': 'New todo' });
    return h('main', null,
        h('style', null, '.state-todo-done span{text-decoration:line-through}'),
        h('h1', null, 'Simple State todos'),
        h('form', { onsubmit: event => {
            event.preventDefault();
            const text = input.value.trim();
            if (text) {
                items([...items(), { id: ++id, text, done: state(false) }]);
                input.value = '';
            }
        } }, input, h('button', { type: 'submit' }, 'Add')),
        h('ul', { 'aria-label': 'Todo list' }, For({ each: items, key: item => item.id, children: item =>
            h('li', null,
                h('label', { class: { 'state-todo-done': item.done } },
                    h('input', { type: 'checkbox', checked: item.done, onchange: event => item.done(event.target.checked) }),
                    h('span', null, item.text)),
                h('button', { onclick: () => items(items().filter(other => other.id !== item.id)) }, 'Delete'))
        })));
};

export const mountTodos = (target = document.body) => {
    const app = TodoApp();
    target.append(app);
    return app;
};
