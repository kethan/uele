import { describe, test, expect, vi } from 'vitest';
import { signal } from 'ulive';
import * as runtime from '../src/index.js';
import { setupRuntime, mount, reconcile, deferred } from './helpers/runtime.js';

const { h, For, map, api, If, add } = runtime;
for (const mode of ['range', 'diff']) {
  describe(`For stress (${mode})`, () => {
    setupRuntime(runtime);
    const configure = () => { if (mode === 'diff') api.diff = reconcile; };

    test('fragment rows preserve the CURRENT nested list after outer reorder', () => {
      configure();
      const a = { id: 'a', values: signal([1]) }, b = { id: 'b', values: signal([2]) };
      const groups = signal([a, b]);
      const host = mount(h(For, { each: groups, key: group => group.id }, group => [
        h('b', group.id), h(For, { each: group.values }, value => h('i', String(value)))
      ]));
      a.values.value = [3, 4, 5];
      b.values.value = [6, 7];
      const saved = [...host.querySelectorAll('i')];
      groups.value = [b, a];
      expect(host.innerHTML).toBe('<b>b</b><i>6</i><i>7</i><b>a</b><i>3</i><i>4</i><i>5</i>');
      expect([...host.querySelectorAll('i')]).toEqual([saved[3], saved[4], saved[0], saved[1], saved[2]]);
      a.values.value = [9];
      expect(host.innerHTML).toBe('<b>b</b><i>6</i><i>7</i><b>a</b><i>9</i>');
      groups.value = [a];
      expect(host.innerHTML).toBe('<b>a</b><i>9</i>');
      groups.value = [];
      expect(host.textContent).toBe('');
      expect(host.querySelectorAll('i').length).toBe(0);
    });

    test('reactive render functions are subscribed once, not once per reorder', () => {
      configure();
      const label = signal('before'), reads = vi.fn(() => label.value);
      const items = signal([1, 2]);
      const host = mount(For({ each: items, children: [id => id === 1 ? reads : 'two'] }));
      for (let i = 0; i < 50; i++) items.value = i % 2 ? [1, 2] : [2, 1];
      expect(reads).toHaveBeenCalledTimes(1);
      label.value = 'after';
      expect(host.textContent).toBe('aftertwo');
      expect(reads).toHaveBeenCalledTimes(2);
    });

    test('live fallback survives empty emissions and is removed when rows arrive', () => {
      configure();
      const items = signal([]), message = signal('loading');
      const host = mount(For({ each: items, fallback: () => message.value, children: [v => h('i', v)] }));
      message.value = 'still loading';
      items.value = [];
      expect(host.textContent).toBe('still loading');
      items.value = ['ready'];
      expect(host.innerHTML).toBe('<i>ready</i>');
      items.value = [];
      expect(host.textContent).toBe('still loading');
    });

    test('conditional fragment rows preserve expanded content when their outer list moves', () => {
      configure();
      const visible = signal(false), items = signal([1, 2]);
      const host = mount(map(items, id => [h('b', String(id)), h(If, { when: visible }, h('em', String(id)))]));
      visible.value = true;
      const ems = [...host.querySelectorAll('em')];
      items.value = [2, 1];
      expect(host.innerHTML).toBe('<b>2</b><em>2</em><b>1</b><em>1</em>');
      expect([...host.querySelectorAll('em')]).toEqual([ems[1], ems[0]]);
      visible.value = false;
      expect(host.textContent).toBe('21');
    });

    test('Promise fragment rows resolve before and after reorder', async () => {
      configure();
      const first = deferred(), second = deferred(), items = signal([1, 2]);
      const host = mount(map(items, id => [h('b', String(id)), id === 1 ? first.promise : second.promise]));
      first.resolve(h('i', 'first')); await first.promise;
      items.value = [2, 1];
      second.resolve([h('i', 'second'), '!']); await second.promise;
      expect(host.innerHTML).toBe('<b>2</b><i>second</i>!<b>1</b><i>first</i>');
    });

    test('DocumentFragment rows retain all children across reorders', () => {
      configure();
      const items = signal([1, 2]);
      const host = mount(map(items, id => {
        const fragment = document.createDocumentFragment();
        fragment.append(h('b', String(id)), h('i', String(id)));
        return fragment;
      }));
      const saved = [...host.children];
      items.value = [2, 1];
      expect(host.innerHTML).toBe('<b>2</b><i>2</i><b>1</b><i>1</i>');
      expect([...host.children]).toEqual([saved[2], saved[3], saved[0], saved[1]]);
    });

    test('removed keys are evicted; re-added keys render fresh data rather than stale objects', () => {
      configure();
      const items = signal([{ id: 1, text: 'old' }]);
      const render = vi.fn(item => h('input', { value: item.text }));
      const host = mount(map(items, render, '', item => item.id));
      const previous = host.querySelector('input');
      items.value = [];
      items.value = [{ id: 1, text: 'new' }];
      expect(host.querySelector('input')).not.toBe(previous);
      expect(host.querySelector('input').value).toBe('new');
      expect(render).toHaveBeenCalledTimes(2);
    });

    test('duplicate keys fail explicitly instead of silently losing DOM rows', () => {
      configure();
      expect(() => map([1, 1], value => h('li', String(value)))).toThrow(/duplicate key/i);
      const items = signal([1, 2]);
      const host = mount(map(items, value => h('li', String(value))));
      expect(() => { items.value = [2, 2]; }).toThrow(/duplicate key/i);
      expect(host.textContent).toBe('12');
      items.value = [2, 3];
      expect(host.textContent).toBe('23');
    });

    test('same values can render independently with an index key', () => {
      configure();
      const host = mount(map(['a', 'a', 'a'], value => h('i', value), '', (_, index) => index));
      expect(host.querySelectorAll('i').length).toBe(3);
      expect(host.textContent).toBe('aaa');
    });

    test('Map key semantics: 0, strings, NaN, symbols and object identity', () => {
      configure();
      const keys = [0, '0', NaN, Symbol('key'), {}, {}];
      const items = signal(keys);
      const host = mount(map(items, (_, index) => h('i', String(index))));
      const nodes = [...host.children];
      items.value = [...keys].reverse();
      expect([...host.children]).toEqual(nodes.reverse());
      expect(host.textContent).toBe('543210');
    });

    test('two lists sharing one source never steal each other’s nodes', () => {
      configure();
      const items = signal([1, 2, 3]);
      const left = h('section', map(items, v => h('b', String(v))));
      const right = h('section', map(items, v => h('b', String(v))));
      mount(left, right);
      items.value = [3, 1, 4];
      expect(left.textContent).toBe('314'); expect(right.textContent).toBe('314');
      expect(left.firstElementChild).not.toBe(right.firstElementChild);
    });

    test('40 nested fragment lists update at every depth without recreating surviving rows', () => {
      configure();
      const levels = Array.from({ length: 40 }, (_, level) => ({ values: signal([level]), renders: vi.fn() }));
      const tree = depth => h(For, { each: levels[depth].values }, value => {
        levels[depth].renders(value);
        return [h('span', { 'data-depth': depth }, String(value)), depth < levels.length - 1 ? tree(depth + 1) : h('b', 'leaf')];
      });
      const host = mount(tree(0));
      expect(host.querySelectorAll('span').length).toBe(40);
      const leaf = host.querySelector('b');
      // Empty nested list, restore it, then reorder an ancestor after the inner replacement.
      levels[39].values.value = [];
      expect(host.querySelector('b')).toBeNull();
      levels[39].values.value = [99];
      expect(host.querySelector('[data-depth="39"]').textContent).toBe('99');
      levels[0].values.value = [0];
      expect(host.querySelector('[data-depth="39"]').textContent).toBe('99');
      expect(host.querySelector('b')).not.toBe(leaf);
      expect(levels[0].renders).toHaveBeenCalledTimes(1);
    });

    test('three-level branching lists survive inner churn followed by outer reversal', () => {
      configure();
      const groups = Array.from({ length: 4 }, (_, id) => ({ id, rows: signal(Array.from({ length: 4 }, (_, row) => ({ id: `${id}.${row}`, cells: signal([0, 1, 2]) }))) }));
      const outer = signal(groups);
      const host = mount(h(For, { each: outer }, group => [h('b', String(group.id)),
        h(For, { each: group.rows }, row => [h('em', row.id), h(For, { each: row.cells }, cell => h('i', `${row.id}.${cell}`))])
      ]));
      for (let round = 0; round < 30; round++) {
        for (const group of groups) {
          for (const row of group.rows.peek()) row.cells.value = round % 3 ? [2, 4, 0] : [];
          group.rows.value = [...group.rows.peek()].reverse();
        }
        outer.value = [...outer.peek()].reverse();
        const expected = outer.peek().flatMap(group => [String(group.id), ...group.rows.peek().flatMap(row => [row.id, ...row.cells.peek().map(cell => `${row.id}.${cell}`)])]).join('');
        expect(host.textContent).toBe(expected);
      }
      expect(host.querySelectorAll('b').length).toBe(4);
    });
  });
}
