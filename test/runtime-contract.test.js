import { describe, test, expect, vi } from 'vitest';
import { signal } from 'ulive';
import * as full from '../src/index.js';
import * as lite from '../lite/index.js';
import { setupRuntime, mount, deferred, reconcile } from './helpers/runtime.js';

for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  describe(`${name} runtime contract`, () => {
    setupRuntime(runtime);
    const { h, add, r, api, props, useLive, get, is, sub } = runtime;

    test.each([0, '', false])('preserves falsy shorthand children: %s', value => {
      const element = h('div', value, 'tail');
      expect(element.childNodes).toHaveLength(2);
      expect(element.firstChild.nodeValue).toBe(String(value));
      expect(element.lastChild.textContent).toBe('tail');
    });

    test('null/undefined attrs are placeholders, not children', () => {
      expect(h('div', null, 'ok').innerHTML).toBe('ok');
      expect(h('div', undefined, 'ok').innerHTML).toBe('ok');
    });

    test('fragments preserve children and functional components receive unmodified props', () => {
      const children = [h('b', 'first'), ['second']];
      expect(h(h, { ignored: true }, ...children)).toEqual(children);
      const component = vi.fn(({ title, children }) => h('section', { title }, children));
      const attrs = Object.freeze({ title: 'hello', children: 'overridden' });
      expect(h(component, attrs, 'child').outerHTML).toBe('<section title="hello">child</section>');
      expect(component).toHaveBeenCalledWith({ title: 'hello', children: ['child'] });
      expect(attrs.children).toBe('overridden');
    });

    test.each([null, undefined, 1, {}, document.createElement('div')])('unsupported tag returns undefined: %s', tag => {
      expect(h(tag)).toBeUndefined();
    });

    test('invalid names throw DOM errors; component and ref exceptions propagate', () => {
      expect(() => h('bad tag')).toThrow();
      const error = new Error('component failed');
      expect(() => h(() => { throw error; })).toThrow(error);
      expect(() => h('div', { ref: () => { throw error; } })).toThrow(error);
    });

    test('ref receives the exact attrs object and runs after children are attached', () => {
      const ref = vi.fn((node, attrs) => {
        expect(node.textContent).toBe('ready');
        expect(attrs.ref).toBe(ref);
      });
      const attrs = { ref };
      const element = h('div', attrs, 'ready');
      expect(ref).toHaveBeenCalledWith(element, attrs);
      expect(h('div', { ref: 'not-a-function' }).getAttribute('ref')).toBe('not-a-function');
    });

    test.each([['div', 'http://www.w3.org/1999/xhtml'], ['svg', 'http://www.w3.org/2000/svg'], ['circle', 'http://www.w3.org/2000/svg'], ['math', 'http://www.w3.org/1998/Math/MathML'], ['mi', 'http://www.w3.org/1998/Math/MathML']])('creates %s in its namespace', (tag, ns) => {
      expect(h(tag).namespaceURI).toBe(ns);
    });

    test('SVG className is an attribute, including reactive updates', () => {
      const value = signal('icon');
      const svg = h('svg', { className: value, viewBox: '0 0 10 10' });
      expect(svg.getAttribute('class')).toBe('icon');
      expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
      value.value = null;
      expect(svg.hasAttribute('class')).toBe(false);
    });

    test('nested component creation cannot change the parent namespace/property strategy', () => {
      const div = h('div', { textContent: 'replaced' }, () => h('svg'));
      expect(div.textContent).toBe('replaced');
      expect(div.hasAttribute('textContent')).toBe(false);
      const svg = h('svg', { className: 'icon' }, () => h('div'));
      expect(svg.getAttribute('class')).toBe('icon');
    });

    test('property bindings update value and checked without replacing inputs', () => {
      const value = signal('first'), checked = signal(false);
      const input = h('input', { value, checked, type: 'checkbox' });
      const host = mount(input);
      value.value = 'second'; checked.value = true;
      expect(host.firstChild).toBe(input);
      expect(input.value).toBe('second');
      expect(input.checked).toBe(true);
    });

    test.each([null, undefined, false, true, 0, '', 'yes'])('unknown attribute semantics for %s', value => {
      const node = h('div', { 'data-state': value });
      expect(node.getAttribute('data-state')).toBe(value == null || value === false ? null : value === true ? '' : String(value));
    });

    test('reactive attributes remove and restore correctly', () => {
      const attr = signal('ready');
      const node = h('div', { 'data-state': attr });
      for (const value of [false, true, null, undefined, 0, '', 'done']) {
        attr.value = value;
        expect(node.getAttribute('data-state')).toBe(value == null || value === false ? null : value === true ? '' : String(value));
      }
    });

    test('event properties normalize case, pass events and support explicit removal', () => {
      const handler = vi.fn(function (event) { expect(this).toBe(event.currentTarget); });
      const button = h('button', { onClick: handler }, 'click');
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
      button.onclick = null;
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(h('button', { onClick: null }).onclick).toBeNull();
    });

    test('events, style, class and ref take precedence over the custom props registry', () => {
      const custom = vi.fn();
      for (const key of ['onClick', 'style', 'class', 'ref']) props.set(key, custom);
      h('button', { onClick() {}, style: { color: 'red' }, class: { active: true }, ref() {} });
      expect(custom).not.toHaveBeenCalled();
    });

    test('custom props receive raw reactive values and attrs and override native properties', () => {
      const value = signal('hello'), custom = vi.fn();
      props.set('title', custom);
      const attrs = { title: value };
      const element = h('div', attrs);
      expect(custom).toHaveBeenCalledWith(element, value, 'title', attrs);
      expect(element.title).toBe('');
      props.delete('title');
      expect(h('div', { title: 'normal' }).title).toBe('normal');
    });

    test('null style and class do not throw', () => {
      const element = h('div', { style: null, class: null });
      expect(element.style.cssText).toBe('');
      expect(element.hasAttribute('class')).toBe(false);
    });

    test('string and reactive whole-style/class values work', () => {
      const style = signal('color: red'), cls = signal('first');
      const element = h('div', { style, className: cls });
      expect(element.style.color).toBe('red');
      expect(element.className).toBe('first');
      style.value = 'color: blue'; cls.value = 'second';
      expect(element.style.color).toBe('blue');
      expect(element.className).toBe('second');
    });

    test('style objects clear standard properties and CSS variables', () => {
      const color = signal('red'), variable = signal('10px');
      const element = h('div', { style: { color, '--gap': variable, 'background-color': 'black' } });
      expect(element.style.color).toBe('red');
      expect(element.style.backgroundColor).toBe('black');
      expect(element.style.getPropertyValue('--gap')).toBe('10px');
      color.value = null; variable.value = undefined;
      expect(element.style.color).toBe('');
      expect(element.style.getPropertyValue('--gap')).toBe('');
      color.value = 'blue'; variable.value = '0';
      expect(element.style.color).toBe('blue');
      expect(element.style.getPropertyValue('--gap')).toBe('0');
    });

    test('class objects add/remove tokens independently', () => {
      const active = signal(true);
      const element = h('div', { class: { active, inactive: false, static: 1 } });
      expect([...element.classList]).toEqual(['active', 'static']);
      active.value = false;
      expect([...element.classList]).toEqual(['static']);
      expect(() => h('div', { class: { 'invalid token': true } })).toThrow();
    });

    test('add deeply flattens children, preserves nodes, comments and escaped text', () => {
      const node = h('b', 'bold');
      const host = mount(add([0, [1n, [node, null, undefined, true, false, '<script>alert(1)</script>']]]));
      expect(host.childNodes[2]).toBe(node);
      expect([...host.childNodes].slice(3, 7).map(n => n.nodeType)).toEqual([8, 8, 8, 8]);
      expect(host.querySelector('script')).toBeNull();
      expect(host.lastChild.textContent).toBe('<script>alert(1)</script>');
      expect(add([], [[]])).toEqual([]);
      expect(add({ x: 1 })[0].textContent).toBe('[object Object]');
    });

    test('symbol and cyclic array children report native conversion/flattening errors', () => {
      expect(() => add(Symbol('unsupported'))).toThrow(/symbol.*string/);
      const cyclic = []; cyclic.push(cyclic);
      expect(() => add(cyclic)).toThrow(RangeError);
    });

    test('DocumentFragments transfer their children', () => {
      const fragment = document.createDocumentFragment();
      fragment.append(h('b', 'one'), h('i', 'two'));
      const host = mount(add(fragment));
      expect(host.innerHTML).toBe('<b>one</b><i>two</i>');
      expect(fragment.childNodes).toHaveLength(0);
    });

    test('reactive nested arrays replace only their bounded region', () => {
      const value = signal(['one', ['two']]);
      const first = h('b', 'before'), last = h('i', 'after');
      const host = mount(first, add(value), last);
      const markers = [host.childNodes[1], host.childNodes[4]];
      for (const [next, text] of [[[], 'beforeafter'], [[h('span', 'next'), 0], 'beforenext0after'], [null, 'beforeafter'], ['final', 'beforefinalafter']]) {
        value.value = next;
        expect(host.textContent).toBe(text);
        expect(host.firstChild).toBe(first); expect(host.lastChild).toBe(last);
        expect(markers.every(marker => marker.parentNode === host)).toBe(true);
      }
    });

    test('equal emissions do not replace existing text nodes', () => {
      let emit;
      const source = () => 'same';
      api.any = () => next => { emit = next; next('same'); return () => {}; };
      const host = mount(add(source)), text = host.childNodes[1];
      emit('same');
      expect(host.childNodes[1]).toBe(text);
      emit('different');
      expect(host.textContent).toBe('different');
      expect(host.childNodes[1]).not.toBe(text);
    });

    test('Promise children resolve after mounting without disturbing siblings', async () => {
      const pending = deferred();
      const host = mount('before', add(pending.promise), 'after');
      expect(host.textContent).toBe('beforeafter');
      pending.resolve(['loaded', h('b', '!')]);
      await pending.promise;
      expect(host.innerHTML).toBe('beforeloaded<b>!</b>after');
    });

    test('useLive supports functional updates, arrays, comments and nested regions', () => {
      const [inner, setInner] = useLive(0);
      const [outer, setOuter] = useLive(inner);
      const host = mount('before', outer, 'after');
      setInner(v => v + 1); setInner(v => v + 1);
      expect(host.textContent).toBe('before2after');
      setOuter(['x', h('b', 'y')]);
      expect(host.innerHTML).toBe('beforex<b>y</b>after');
      setInner(3); // Removed inner markers cannot affect the outer region.
      expect(host.textContent).toBe('beforexyafter');
      setOuter(null);
      expect(host.innerHTML).toBe('before<!--null-->after');
      setOuter([]);
      expect(host.textContent).toBe('beforeafter');
    });

    test.each(['both', 'start', 'end'])('detached %s markers make updates a safe no-op', which => {
      const [nodes, set] = useLive('initial');
      const host = mount(nodes);
      if (which !== 'end') nodes[0].remove();
      if (which !== 'start') nodes.at(-1).remove();
      expect(() => set('ignored')).not.toThrow();
      expect(host.textContent).toBe('initial');
    });

    test('updates before mounting are not buffered, but updater state advances', () => {
      const [nodes, set] = useLive(1);
      set(2);
      const host = mount(nodes);
      expect(host.textContent).toBe('1');
      set(v => v + 1);
      expect(host.textContent).toBe('3');
    });

    test.each([false, true])('api.diff receives current node arrays and udom mode=%s', udom => {
      const getNode = value => value;
      if (udom) api.udom = getNode;
      api.diff = vi.fn((parent, oldNodes, newNodes, fourth, fifth) => reconcile(parent, oldNodes, newNodes, udom ? fifth : fourth));
      const a = h('input', { value: 'keep' }), b = h('b', 'B');
      const [nodes, set] = useLive([a, b]);
      const host = mount('prefix', nodes, 'suffix');
      const end = nodes.at(-1);
      set([b, a]);
      expect(api.diff).toHaveBeenLastCalledWith(host, [a, b], [b, a], udom ? getNode : end, udom ? end : undefined);
      expect(host.childNodes[2]).toBe(b);
      expect(host.childNodes[3]).toBe(a);
      set([a]);
      expect(api.diff.mock.calls[1][1]).toEqual([b, a]);
      expect(host.textContent).toBe('prefixsuffix');
      expect(a.value).toBe('keep');
    });

    test('r returns static callback results and marks static/reactive values correctly', () => {
      const next = vi.fn(() => 'result');
      expect(r(0, next)).toBe('result');
      expect(next).toHaveBeenLastCalledWith(0, false);
      const value = signal(1);
      const stop = r(value, next);
      expect(next).toHaveBeenLastCalledWith(1, true);
      value.value = 2;
      expect(next).toHaveBeenLastCalledWith(2, true);
      stop(); value.value = 3;
      expect(next).toHaveBeenCalledTimes(3);
      expect(get(() => value)).toBe(3);
      expect(is(value)).toBeTruthy();
      expect(is('plain')).toBeFalsy();
      expect(typeof sub).toBe('function');
    });

    test('r forwards error, cleanup and unsubscribe through a custom adapter', () => {
      const next = vi.fn(), error = vi.fn(), cleanup = vi.fn(), dispose = vi.fn();
      const failure = new Error('source failed');
      api.any = () => (emit, fail, done) => {
        emit(7); fail(failure);
        return () => { dispose(); done(); };
      };
      const stop = r(() => 1, next, error, cleanup);
      expect(next).toHaveBeenCalledWith(7, true);
      expect(error).toHaveBeenCalledWith(failure);
      expect(cleanup).toHaveBeenCalledTimes(1); // Errors terminate and clean up.
      stop();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test('Promise subscriptions report errors, completion and support cancellation', async () => {
      const next = vi.fn(), cleanup = vi.fn(), error = vi.fn();
      const pending = deferred();
      const stop = r(pending.promise, next, error, cleanup);
      stop(); pending.resolve('late'); await pending.promise;
      expect(next).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
      const failure = new Error('offline');
      await r(Promise.reject(failure), next, error);
      expect(error).toHaveBeenCalledWith(failure);
    });
  });
}
