import { describe, test, expect, vi } from 'vitest';
import { signal } from 'ulive';
import * as full from '../src/index.js';
import * as lite from '../lite/index.js';
import { setupRuntime, mount, deferred } from './helpers/runtime.js';

for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  describe(`${name} deterministic disposal`, () => {
    setupRuntime(runtime);
    const { h, add, useLive, dispose, props } = runtime;

    test('dispose tears down nested text/attribute/style/class subscriptions exactly once', () => {
      const value = signal('red'), next = vi.fn(() => value.value);
      const child = h('span', { title: value, style: { color: value }, class: { active: () => value.value === 'red' } }, next);
      const root = h('section', child);
      mount(root);
      expect(next).toHaveBeenCalledTimes(1);
      dispose(root); dispose(root);
      value.value = 'blue';
      expect(next).toHaveBeenCalledTimes(1);
      expect(child.title).toBe('red');
      expect(child.style.color).toBe('red');
      expect(child.className).toBe('active');
      expect(child.textContent).toBe('red');
    });

    test('explicit disposal of a removed region preserves reused subscriptions', () => {
      const value = signal('first'), removed = vi.fn(() => value.value), retained = vi.fn(() => value.value);
      const a = h('b', null, removed), b = h('i', null, retained);
      const [nodes, set] = useLive([a, b]);
      const host = mount(nodes);
      set([b]);
      dispose(a);
      value.value = 'second';
      expect(removed).toHaveBeenCalledTimes(1);
      expect(retained).toHaveBeenCalledTimes(2);
      expect(host.innerHTML).toBe('<i>second</i>');
      dispose(nodes.filter(node => node.parentNode));
      expect(() => dispose()).not.toThrow();
    });

    test('custom prop cleanup runs once on explicit root disposal', () => {
      const cleanup = vi.fn();
      props.set('owned', () => cleanup);
      const a = h('div', { owned: true }), b = h('div', { owned: true });
      const [nodes, set] = useLive(a);
      mount(nodes, b);
      set([]);
      dispose(a);
      expect(cleanup).toHaveBeenCalledTimes(1);
      dispose(a); // Explicit disposal is idempotent.
      expect(cleanup).toHaveBeenCalledTimes(1);
      dispose(b);
      expect(cleanup).toHaveBeenCalledTimes(2);
    });

    test('dispose cancels Promise delivery while the DOM remains mounted', async () => {
      const pending = deferred();
      const host = mount(add(pending.promise));
      dispose(host);
      pending.resolve('too late'); await pending.promise;
      expect(host.textContent).toBe('');
    });

    test('live regions safely ignore moved, reversed or separated boundary markers', () => {
      const [nodes, set] = useLive('safe');
      const host = mount(nodes);
      host.insertBefore(nodes.at(-1), nodes[0]);
      expect(() => set('ignored')).not.toThrow();
      expect(host.textContent).toBe('safe');
      const other = mount(nodes.at(-1));
      expect(() => set('also ignored')).not.toThrow();
      expect(host.textContent).toBe('safe');
      expect(other.textContent).toBe('');
    });

    test('unchanged nodes keep focus and selection on sibling insertion', () => {
      const input = h('input', { value: 'typed' });
      const [nodes, set] = useLive(input);
      mount(nodes);
      input.focus(); input.setSelectionRange(2, 4);
      set([input, h('b', 'appended')]);
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(4);
    });
  });
}

describe('For subscription ownership', () => {
  setupRuntime(full);
  test('thousands of removed row effects are stopped, not retained by the source', () => {
    const values = signal([0]), pulse = signal(0), reads = vi.fn(() => String(pulse.value));
    const render = vi.fn(() => full.h('i', null, reads));
    const host = mount(full.map(values, render));
    for (let i = 1; i <= 1000; i++) values.value = [i];
    expect(reads).toHaveBeenCalledTimes(1001);
    pulse.value++;
    expect(reads).toHaveBeenCalledTimes(1002); // Only the single live row updates.
    expect(host.textContent).toBe('1');
    full.dispose(host);
    pulse.value++;
    values.value = [1002];
    expect(reads).toHaveBeenCalledTimes(1002);
    expect(render).toHaveBeenCalledTimes(1001);
  });

  test('removing a parent For row stops nested For subscriptions and reactive fallback', () => {
    const outer = signal([1]), inner = signal([1]), label = signal('empty');
    const render = vi.fn(value => full.h('b', String(value)));
    const fallback = vi.fn(() => label.value);
    const host = mount(full.map(outer, () => full.map(inner, render, fallback)));
    inner.value = [];
    expect(fallback).toHaveBeenCalledTimes(1);
    outer.value = [];
    inner.value = [2]; label.value = 'changed';
    expect(render).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(host.textContent).toBe('');
  });
});
