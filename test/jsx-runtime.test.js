import { describe, test, expect, vi } from 'vitest';
import * as production from '../jsx-runtime/index.ts';
import * as development from '../jsx-dev-runtime/index.ts';
import * as full from '../src/index.js';
import { signal } from 'ulive';
import { mount, setupRuntime } from './helpers/runtime.js';

for (const [name, runtime] of [['production', production], ['development', development]]) {
  describe(`${name} JSX runtime`, () => {
    setupRuntime(full);
    const { jsx, jsxs, jsxDEV, jsxDev, Fragment, h, createElement } = runtime;
    test('exports classic aliases and automatic runtime aliases', () => {
      expect(h).toBe(full.h);
      expect(createElement).toBe(h);
      expect(Fragment).toBe(h);
      expect(jsxs).toBe(jsx);
      expect(jsxDEV).toBe(jsx);
      expect(jsxDev).toBe(jsx);
      expect(createElement('div', null, 'classic').textContent).toBe('classic');
    });
    test('jsx extracts children without mutating frozen props or rendering the key', () => {
      const attrs = Object.freeze({ id: 'hello', children: 'world' });
      expect(jsx('div', attrs, 'key').outerHTML).toBe('<div id="hello">world</div>');
      expect(attrs.children).toBe('world');
    });
    test('jsx supports omitted/null props, absent and explicit falsy children', () => {
      expect(jsx('div').outerHTML).toBe('<div></div>');
      expect(jsx('div', null).outerHTML).toBe('<div></div>');
      expect(jsx('div', { id: 'empty' }).childNodes.length).toBe(0);
      expect(jsx('div', { children: 0 }).textContent).toBe('0');
      expect(jsx('div', { children: false }).innerHTML).toBe('<!--false-->');
      expect(jsx('div', { children: null }).innerHTML).toBe('<!--null-->');
    });
    test('jsxs renders nested arrays and fragments in source order', () => {
      const children = jsxs(Fragment, { children: [jsx('b', { children: 'one' }), ['two', jsx('i', { children: 'three' })]] });
      expect(jsxs('main', { children }).innerHTML).toBe('<b>one</b>two<i>three</i>');
    });
    test('jsxDEV ignores compiler metadata and forwards children to components', () => {
      const component = vi.fn(({ children, title }) => h('p', { title }, children));
      const element = jsxDEV(component, { title: 'greeting', children: ['hello', 'world'] }, 'key', true, { fileName: 'app.tsx', lineNumber: 1 }, {});
      expect(element.outerHTML).toBe('<p title="greeting">helloworld</p>');
      expect(component).toHaveBeenCalledWith({ title: 'greeting', children: ['hello', 'world'] });
    });
    test('automatic JSX Switch/Match selects only the first matching branch', () => {
      const condition = signal(false);
      const host = mount(full.add(jsxs(full.Switch, { fallback: 'none', children: [
        jsx(full.Match, { when: condition, children: 'first' }),
        jsx(full.Match, { when: true, children: 'second' }),
      ] })));
      expect(host.textContent).toBe('second');
      condition.value = true;
      expect(host.textContent).toBe('first');
    });
    test('automatic JSX For forwards a renderer as its first child', () => {
      const items = signal([1, 2]);
      const host = mount(jsx(full.For, { each: items, children: value => jsx('i', { children: value }) }));
      expect(host.innerHTML).toBe('<i>1</i><i>2</i>');
      items.value = [2, 3];
      expect(host.innerHTML).toBe('<i>2</i><i>3</i>');
    });
    test('automatic JSX counter responds to real click events and signal updates', () => {
      const count = signal(0);
      const host = mount(jsxs('main', { children: [jsx('output', { children: count }), jsx('button', { onClick: () => count.value++, children: '+' })] }));
      host.querySelector('button').click();
      host.querySelector('button').click();
      expect(host.querySelector('output').textContent).toBe('2');
    });
  });
}
