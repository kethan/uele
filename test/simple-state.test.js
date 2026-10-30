/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';
import { State, state } from '../examples/state/state.js';
import { TodoApp } from '../examples/todos/state.js';
import { h, api, useLive } from 'uele';
const stops = [], defaults = { ...api }, engineDefaults = { ...api.engine };
const mount = value => {
    const [nodes, replace] = useLive(value); document.body.append(...nodes);
    const stop = () => replace([]); stops.push(stop); return stop;
};
afterEach(() => {
    stops.splice(0).reverse().forEach(stop => stop());
    Object.keys(api.engine).forEach(key => delete api.engine[key]); Object.assign(api.engine, engineDefaults);
    Object.keys(api).forEach(key => delete api[key]); Object.assign(api, defaults); document.body.replaceChildren();
});
it('supports reads, writes, notification, several subscribers and stable idempotent unsubscribe', () => {
    const value = State(0), first = vi.fn(), second = vi.fn(), third = vi.fn();
    expect(value()).toBe(0);
    const a = value(first), b = value(second);
    expect(first).not.toHaveBeenCalled(); value(1);
    expect(first).toHaveBeenLastCalledWith(1); expect(second).toHaveBeenLastCalledWith(1);
    a(); a(); const c = value(third); value(2);
    expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenLastCalledWith(2); expect(third).toHaveBeenLastCalledWith(2);
    b(); b(); c(); value(false); expect(value()).toBe(false);
    expect(second).toHaveBeenCalledTimes(2); expect(third).toHaveBeenCalledTimes(1);
});
it('documents the exact minimal State limits rather than silently changing its API', () => {
    const value = State(1);
    expect(value(undefined)).toBe(1); expect(() => value(null)).toThrow(TypeError);
    const subscriber = vi.fn(); value(subscriber); value(1); value(1);
    expect(subscriber).toHaveBeenCalledTimes(2); // writes are not equality-deduplicated
});
it('primes .subscribe observers, releases a failed initial observer and forwards future values', () => {
    const value = state('initial'), seen = vi.fn(), failure = vi.fn(() => { throw Error('observer'); });
    expect(() => value.subscribe(failure)).toThrow('observer');
    const off = value.subscribe(seen); expect(seen).toHaveBeenCalledWith('initial');
    expect(() => value('next')).not.toThrow(); expect(failure).toHaveBeenCalledTimes(1);
    off(); off(); value('late'); expect(seen).toHaveBeenCalledTimes(2);
});
it('full binds State to children, checked, class and style, and disposes them with their owner', () => {
    const value = state('red'), enabled = state(false);
    const node = h('input', { value, checked: enabled, class: { enabled }, style: { color: value } });
    const child = h('p', null, value); const stop = mount(h('main', null, node, child));
    expect(node.value).toBe('red'); expect(child.textContent).toBe('red');
    value('blue'); enabled(true); expect(node.value).toBe('blue'); expect(child.textContent).toBe('blue');
    expect(node.checked).toBe(true); expect(node.className).toBe('enabled'); expect(node.style.color).toBe('blue');
    stop(); value('green'); enabled(false);
    expect(node.value).toBe('blue'); expect(node.checked).toBe(true); expect(child.textContent).toBe('blue');
});
it('State todos add/toggle/delete safely, preserve keyed rows and work as independent app instances', () => {
    const first = TodoApp(), second = TodoApp(), stop = mount(h('div', null, first, second));
    const add = (app, text) => { app.querySelector('input').value = text; app.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true })); };
    add(first, '  '); expect(first.querySelectorAll('li')).toHaveLength(0);
    add(first, 'A'); const retained = first.querySelector('li'); add(first, '<img src=x>');
    expect(first.querySelector('li')).toBe(retained); expect(first.querySelector('img')).toBeNull(); expect(second.querySelectorAll('li')).toHaveLength(0);
    const checkbox = retained.querySelector('input'); checkbox.checked = true; checkbox.dispatchEvent(new Event('change'));
    expect(retained.querySelector('label').classList.contains('state-todo-done')).toBe(true);
    first.querySelectorAll('li')[1].querySelector('button').click(); expect(first.querySelector('li')).toBe(retained);
    retained.querySelector('button').click(); expect(first.querySelectorAll('li')).toHaveLength(0);
    add(first, 'After empty'); add(second, 'Other'); expect(second.querySelectorAll('li')).toHaveLength(1);
    stop(); expect(document.querySelector('li')).toBeNull();
});
