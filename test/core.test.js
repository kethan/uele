/** @vitest-environment jsdom */
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal, effect, Signal } from '@preact/signals-core';
import { api, h, r, props, useLive } from '../core/index.js';
const defaults = { ...api }, stops = [];
const mount = value => {
    const [nodes, update] = useLive(value); document.body.append(...nodes);
    const stop = () => update([]); stops.push(stop); return stop;
};
beforeEach(() => Object.assign(api, defaults));
afterEach(() => {
    stops.splice(0).reverse().forEach(stop => stop());
    Object.keys(api).forEach(key => delete api[key]); Object.assign(api, defaults);
    props.clear(); document.body.replaceChildren();
});
it('renders static content and nested one-time functions without signals', () => {
    const read = vi.fn(() => ['hello', h('b', null, ' world'), () => '!']);
    const node = h('p', { title: () => 'once' }, read);
    expect(node.textContent).toBe('hello world!'); expect(node.title).toBe('once');
    expect(read).toHaveBeenCalledTimes(1); expect(api.sub).toBeUndefined();
});
it('never returns the plain callback result as a disposer', () => {
    const dispose = vi.fn(), next = vi.fn(() => dispose);
    expect(r('plain', next)).toBeUndefined();
    expect(next).toHaveBeenCalledWith('plain', false); expect(dispose).not.toHaveBeenCalled();
});
it('delegates recognition and reads to the installed API', () => {
    const cell = { value: 42 };
    api.is = value => value === cell; api.get = value => value === cell ? value.value : defaults.get(value);
    expect(api.is(cell)).toBe(true); expect(api.get(cell)).toBe(42);
});
it('updates cells, tracked thunks, props and object styles/classes with Preact', () => {
    api.is = value => value instanceof Signal || typeof value === 'function';
    api.get = value => value instanceof Signal ? value.value : defaults.get(value);
    api.sub = (value, next) => effect(() => { next(api.get(value)); });
    const cell = signal(1);
    const node = h('div', { title: cell, class: { active: () => cell.value > 1 }, style: { '--count': cell } }, cell, () => cell.value * 2);
    const stop = mount(node); cell.value = 2;
    expect(node.textContent).toBe('24'); expect(node.title).toBe('2');
    expect(node.className).toBe('active'); expect(node.style.getPropertyValue('--count')).toBe('2');
    stop(); cell.value = 3;
    expect(node.textContent).toBe('24'); expect(node.title).toBe('2');
});
it('classifies a child once before calling api.sub', () => {
    const cell = {};
    api.is = vi.fn(value => value === cell);
    api.sub = vi.fn((_value, next) => { next('ok'); });
    h('div', null, cell);
    expect(api.is.mock.calls.filter(([value]) => value === cell)).toHaveLength(1);
    expect(api.sub).toHaveBeenCalledTimes(1);
});
it('resolves namespace once per element without breaking HTML properties', () => {
    api.ns = vi.fn(tag => tag === 'svg' ? 'http://www.w3.org/2000/svg'
        : tag === 'math' ? 'http://www.w3.org/1998/Math/MathML' : null);
    const input = h('input', { value: 'native', checked: true });
    expect(input.value).toBe('native'); expect(input.checked).toBe(true);
    expect(input.hasAttribute('value')).toBe(false);
    expect(h('svg').namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(h('math').namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(api.ns).toHaveBeenCalledTimes(3);
});
it('handles events, refs, fragments, shorthand children and prop disposers', () => {
    const click = vi.fn(), custom = vi.fn(), ref = vi.fn(), off = vi.fn();
    props.set('owned', () => off);
    const node = h('button', { onclick: click, oncustom: custom, ref, owned: true, className: 'button' }, 'Go');
    const stop = mount(node); node.click(); node.dispatchEvent(new Event('custom')); stop(); stop();
    expect(click).toHaveBeenCalledTimes(1); expect(custom).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith(node, expect.any(Object)); expect(off).toHaveBeenCalledTimes(1);
    expect(node.className).toBe('button'); expect(h('p', 'short').textContent).toBe('short');
    expect(h(h, null, 'fragment')).toEqual(['fragment']);
});
it('supports manual updates and optional diff dispatch', () => {
    api.diff = vi.fn((_parent, old, nodes, end) => { old.forEach(node => node.remove()); end.before(...nodes); });
    const [nodes, update] = useLive('before'); document.body.append(...nodes);
    update(previous => previous + '!'); expect(document.body.textContent).toBe('before!');
    expect(api.diff).toHaveBeenCalledTimes(1); update([]);
});
it('forwards errors and cleanup to a user subscriber', () => {
    const source = {}, reason = Error('source'), error = vi.fn(), cleanup = vi.fn();
    api.is = value => value === source;
    api.sub = (_value, _next, fail, done) => { fail(reason); return done; };
    const stop = r(source, () => {}, error, cleanup);
    expect(error).toHaveBeenCalledWith(reason); stop(); expect(cleanup).toHaveBeenCalledTimes(1);
});

it('removes CSS properties on null and undefined reactive updates', () => {
    api.is = value => value instanceof Signal || typeof value === 'function';
    api.get = value => value instanceof Signal ? value.value : defaults.get(value);
    api.sub = (value, next) => effect(() => { next(api.get(value)); });
    const native = signal('red'), variable = signal('blue'), dashed = signal('12px');
    const node = h('div', { style: { color: native, '--accent': variable, 'font-size': dashed } });
    mount(node);
    native.value = null; variable.value = undefined; dashed.value = null;
    expect(node.style.color).toBe('');
    expect(node.style.getPropertyValue('--accent')).toBe('');
    expect(node.style.getPropertyValue('font-size')).toBe('');
});
it('uses the final synchronous emission and skips equal subsequent emissions', () => {
    const source = {}; let emit;
    api.is = value => value === source;
    api.get = vi.fn(defaults.get);
    api.sub = (_value, next) => { emit = next; next('first'); next('second'); };
    const node = h('div', null, source); mount(node);
    expect(node.textContent).toBe('second');
    emit('third'); const reads = api.get.mock.calls.length;
    emit('third'); expect(api.get).toHaveBeenCalledTimes(reads);
    expect(node.textContent).toBe('third');
});
it('cleans nested regions and preserves moved nodes until discarded', () => {
    api.is = value => value instanceof Signal || typeof value === 'function';
    api.get = value => value instanceof Signal ? value.value : defaults.get(value);
    api.sub = (value, next) => effect(() => { next(api.get(value)); });
    const state = signal('first');
    const child = h('b', null, state);
    const [nodes, update] = useLive(child); document.body.append(...nodes);
    update([child]); state.value = 'second'; expect(child.textContent).toBe('second');
    update([]); state.value = 'late'; expect(child.textContent).toBe('second');
});
it('exports only the six intended API names', async () => {
    const module = await import('../core/index.js');
    expect(Object.keys(module).sort()).toEqual(['add', 'api', 'h', 'props', 'r', 'useLive']);
});
