import { describe, test, expect, vi } from 'vitest';
import { signal } from 'ulive';
import * as runtime from '../src/index.js';
import { setupRuntime, mount, deferred, reconcile } from './helpers/runtime.js';

const { h, f, api, If, Show, Match, Switch, Dynamic, lazy, map, For } = runtime;
describe('full runtime helpers', () => {
  setupRuntime(runtime);

  test('f forwards tags, props and children, including custom tags', () => {
    const { button, main, 'my-widget': widget } = f(h);
    const click = vi.fn();
    const node = main([button({ onClick: click }, 'press'), widget('hello')]);
    expect(node.outerHTML).toBe('<main><button>press</button><my-widget>hello</my-widget></main>');
    node.firstChild.click();
    expect(click).toHaveBeenCalledTimes(1);
    const factory = vi.fn();
    f(factory).div({ id: 1 }, 'a', 'b');
    expect(factory).toHaveBeenCalledWith('div', { id: 1 }, 'a', 'b');
  });

  test('Show and Match are If aliases', () => {
    expect(Show).toBe(If); expect(Match).toBe(If);
  });

  test.each([false, null, undefined, 0, '', NaN])('If uses fallback for %s', when => {
    expect(If({ when, children: ['yes'], fallback: 'no' })()).toBe('no');
    expect(If({ when, children: ['yes'] })()).toBe('');
  });

  test('If returns children or calls a render function with boolean true only when selected', () => {
    const render = vi.fn(value => `value:${value}`);
    const when = signal(false);
    const host = mount(h('div', null, h(If, { when, fallback: 'off' }, render)));
    expect(host.textContent).toBe('off');
    expect(render).not.toHaveBeenCalled();
    when.value = 'truthy';
    expect(host.textContent).toBe('value:true');
    expect(render).toHaveBeenLastCalledWith(true);
    when.value = false;
    expect(host.textContent).toBe('off');
    const children = ['a', h('b', 'b')];
    expect(If({ when: [], children })()).toBe(children);
    expect(If({ when: true, children: [] })()).toEqual([]);
  });

  test('Switch short-circuits at the first truthy value and reevaluates conditions', () => {
    const later = vi.fn(() => 'later'), condition = signal(false);
    const first = Match({ when: condition, children: ['first'] });
    const render = Switch({ children: [null, () => false, first, 'static', later], fallback: 'none' });
    expect(render()).toBe('static');
    expect(later).not.toHaveBeenCalled();
    condition.value = true;
    expect(render()).toEqual(['first']);
    expect(Switch({ children: [false, () => 0], fallback: 'fallback' })()).toBe('fallback');
    expect(Switch({ children: [] })()).toBe('');
  });

  test('Switch/Match transition through matching cases and fallback in the DOM', () => {
    const state = signal('idle');
    const host = mount(h('div', null, h(Switch, { fallback: 'idle' },
      h(Match, { when: () => state.value === 'loading' }, 'loading'),
      h(Match, { when: () => state.value === 'ready' }, 'ready'))));
    expect(host.textContent).toBe('idle');
    for (const value of ['loading', 'ready', 'idle']) {
      state.value = value;
      expect(host.textContent).toBe(value);
    }
  });

  test('Dynamic forwards props and children to a component, or returns a value directly', () => {
    const children = ['child'];
    const component = vi.fn((props, kids) => h('p', { title: props.title }, kids));
    const render = Dynamic({ component, title: 'title', children });
    expect(render().outerHTML).toBe('<p title="title">child</p>');
    expect(component).toHaveBeenCalledWith({ title: 'title' }, children);
    const node = h('b', 'static');
    expect(Dynamic({ component: node, children })()).toBe(node);
    expect(Dynamic({ component: null })()).toBeNull();
  });

  test('Dynamic reactive component factory switches mounted content', () => {
    const active = signal(true);
    const host = mount(h('main', null, h(Dynamic, {
      component: () => active.value ? h('b', 'on') : h('i', 'off'),
    })));
    expect(host.innerHTML).toBe('<main><b>on</b></main>');
    active.value = false;
    expect(host.innerHTML).toBe('<main><i>off</i></main>');
  });

  test('lazy defers loading until invoked and forwards the exact props', async () => {
    const pending = deferred(), component = vi.fn(({ name }) => h('p', name));
    const loader = vi.fn(() => pending.promise), render = lazy(loader);
    expect(loader).not.toHaveBeenCalled();
    const props = { name: 'loaded', children: [] };
    const result = render(props);
    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);
    pending.resolve({ default: component });
    expect((await result).outerHTML).toBe('<p>loaded</p>');
    expect(component).toHaveBeenCalledWith(props);
  });

  test.each(['reject', 'missing default', 'component throws', 'async component rejects'])('lazy falls back when %s', kind => {
    const error = new Error('failed');
    const loader = () => kind === 'reject' ? Promise.reject(error) : Promise.resolve(
      kind === 'missing default' ? {} : { default: () => {
        if (kind === 'component throws') throw error;
        return Promise.reject(error);
      } });
    return expect(lazy(loader, 'offline')({})).resolves.toBe('offline');
  });

  test('lazy handles default fallback and synchronous loader failures', async () => {
    expect(await lazy(() => Promise.reject(new Error('offline')))({})).toBe('');
    expect(await lazy(() => { throw new Error('sync'); }, 'fallback')({})).toBe('fallback');
  });

  test('lazy async components resolve into a mounted region', async () => {
    const result = lazy(() => Promise.resolve({ default: async ({ text }) => h('b', text) }))({ text: 'done' });
    const host = mount(h('div', null, result));
    await result;
    expect(host.innerHTML).toBe('<div><b>done</b></div>');
  });

  test.each([[], null, undefined])('map empty/nullish lists use fallback: %s', items => {
    const callback = vi.fn();
    expect(mount(map(items, callback, 'empty')).textContent).toBe('empty');
    expect(callback).not.toHaveBeenCalled();
    expect(mount(map(items, callback)).textContent).toBe('');
  });

  test.each(['range', 'diff'])('keyed map preserves node identity across inserts, reorder, remove and re-add (%s)', mode => {
    if (mode === 'diff') api.diff = reconcile;
    const a = { id: 1 }, b = { id: 2 }, c = { id: 3 };
    const items = signal([a, b]);
    const callback = vi.fn((item, index) => h('input', { value: `${item.id}:${index}` }));
    const host = mount(map(items, callback, 'empty', item => item.id));
    const [first, second] = host.querySelectorAll('input');
    first.value = 'edited by user';
    items.value = [b, a, c];
    const third = host.querySelectorAll('input')[2];
    expect([...host.querySelectorAll('input')]).toEqual([second, first, third]);
    expect(first.value).toBe('edited by user');
    expect(callback).toHaveBeenCalledTimes(3);
    items.value = [c];
    expect(host.querySelector('input')).toBe(third);
    items.value = [];
    expect(host.textContent).toBe('empty');
    items.value = [a];
    expect(host.querySelector('input')).not.toBe(first);
    expect(callback).toHaveBeenCalledTimes(4);
    expect(callback).toHaveBeenNthCalledWith(1, a, 0);
  });

  test.each([0, '', false, null, undefined])('map caches falsy render results: %s', rendered => {
    const items = signal(['key']);
    const callback = vi.fn(() => rendered);
    const host = mount(map(items, callback));
    items.value = ['key'];
    expect(callback).toHaveBeenCalledTimes(1);
    expect(host.childNodes[2].nodeValue).toBe(String(rendered));
  });

  test('map handles nullish reactive lists and transitions back to values', () => {
    const items = signal(null);
    const host = mount(map(items, item => h('b', item), 'empty'));
    for (const value of [[1], undefined, [], [2], null]) {
      items.value = value;
      expect(host.textContent).toBe(value?.length ? String(value[0]) : 'empty');
    }
  });

  test('map default identity keys retain distinct objects; indices are creation-time values', () => {
    const a = {}, b = {};
    const items = signal([a, b]);
    const callback = vi.fn((_, i) => h('span', String(i)));
    const host = mount(map(items, callback));
    items.value = [b, a];
    expect(host.textContent).toBe('10');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test('map key receives item/index; render exceptions propagate', () => {
    const key = vi.fn((_, i) => i);
    const host = mount(map(['a', 'b'], value => value, '', key));
    expect(host.textContent).toBe('ab');
    expect(key).toHaveBeenCalledWith('a', 0);
    expect(key).toHaveBeenCalledWith('b', 1);
    expect(() => map([1], () => { throw new Error('render'); })).toThrow('render');
    expect(() => map({ length: 1 }, () => '')).toThrow();
  });

  test('For delegates renderer, fallback and optional custom key', () => {
    const items = signal([{ id: 1 }]);
    const render = vi.fn(item => h('li', String(item.id)));
    const host = mount(h('ul', null, h(For, { each: items, key: item => item.id, fallback: 'empty' }, render)));
    const row = host.querySelector('li');
    items.value = [{ id: 1 }];
    expect(host.querySelector('li')).toBe(row);
    expect(render).toHaveBeenCalledTimes(1);
    items.value = [];
    expect(host.textContent).toBe('empty');
    expect(mount(For({ each: [1, 2], children: [String] })).textContent).toBe('12');
  });
});

describe('conditional reuse lifecycle', () => {
  setupRuntime(runtime);
  test('prebuilt reactive children keep working after repeated hide/show cycles', () => {
    const visible = signal(true), label = signal('initial');
    const child = h('b', { title: label }, label);
    const host = mount(h('div', null, h(If, { when: visible }, child)));
    for (let i = 0; i < 20; i++) {
      visible.value = false;
      label.value = String(i);
      visible.value = true;
      expect(host.querySelector('b')).toBe(child);
      expect(host.textContent).toBe(String(i));
      expect(child.title).toBe(String(i));
    }
    runtime.dispose(host);
  });
});
