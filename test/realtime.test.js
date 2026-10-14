import { describe, test, expect, vi } from 'vitest';
import { signal, batch } from 'ulive';
import * as runtime from '../src/index.js';
import * as lite from '../lite/index.js';
import { setupRuntime, mount, reconcile, deferred } from './helpers/runtime.js';

const { h, api, add, r, sub, is, map, If, Switch, Match, props, useLive } = runtime;

describe('real-time application scenarios', () => {
  setupRuntime(runtime);

  test('README counter: repeated clicks, negative values and independent instances', () => {
    const counter = () => {
      const [count, set] = useLive(0);
      return h('section', [h('button', { onClick: () => set(n => n - 1) }, '-'),
        h('output', count), h('button', { onClick: () => set(n => n + 1) }, '+')]);
    };
    const host = mount(counter(), counter());
    const [minus, plus, otherMinus] = host.querySelectorAll('button');
    for (let i = 0; i < 100; i++) plus.click();
    for (let i = 0; i < 102; i++) minus.click();
    expect([...host.querySelectorAll('output')].map(n => n.textContent)).toEqual(['-2', '0']);
    otherMinus.click();
    expect([...host.querySelectorAll('output')].map(n => n.textContent)).toEqual(['-2', '-1']);
  });

  test('form workflow: input validation, preventDefault, submit, keyed todo toggle and delete', () => {
    const draft = signal(''), todos = signal([]);
    let nextId = 0;
    props.set('validate', (node, validate) => node.addEventListener('input', () => {
      node.setCustomValidity(validate(node.value));
    }));
    const input = h('input', {
      value: draft,
      validate: value => value.trim().length < 3 ? 'At least three characters' : '',
      onInput: event => { draft.value = event.target.value; },
    });
    const submit = h('button', { type: 'submit', disabled: () => draft.value.trim().length < 3 }, 'Add');
    const form = h('form', {
      onSubmit: event => {
        event.preventDefault();
        if (!form.checkValidity()) return;
        todos.value = [...todos.value, { id: ++nextId, title: draft.value.trim(), done: signal(false) }];
        draft.value = '';
      },
    }, input, submit);
    const list = h('ul', null, map(todos, todo => h('li', { 'data-id': todo.id, class: { done: todo.done } },
      h('input', { type: 'checkbox', checked: todo.done, onChange: event => { todo.done.value = event.target.checked; } }),
      todo.title,
      h('button', { onClick: () => { todos.value = todos.value.filter(item => item.id !== todo.id); } }, 'Delete')
    ), h('li', 'No tasks'), todo => todo.id));
    const host = mount(form, list, h('output', null, () => `${todos.value.length} tasks`));
    const type = value => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
    expect(submit.disabled).toBe(true);
    type('ab');
    expect(input.validationMessage).toBe('At least three characters');
    expect(submit.disabled).toBe(true);
    type('  Buy milk  ');
    expect(input.checkValidity()).toBe(true);
    expect(submit.disabled).toBe(false);
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    expect(submit.disabled).toBe(true);
    expect(list.textContent).toBe('Buy milkDelete');
    expect(host.querySelector('output').textContent).toBe('1 tasks');
    const row = list.querySelector('li'), checkbox = row.querySelector('input');
    checkbox.click();
    expect(row.classList.contains('done')).toBe(true);
    type('Read a book'); submit.click();
    expect(list.querySelector('li')).toBe(row);
    expect(host.querySelector('output').textContent).toBe('2 tasks');
    row.querySelector('button').click();
    list.querySelector('button').click();
    expect(list.textContent).toBe('No tasks');
    expect(host.querySelector('output').textContent).toBe('0 tasks');
  });

  test('live dashboard: fake-clock ticks, batched values, conditional status and timer disposal', async () => {
    vi.useFakeTimers();
    const ticks = signal(0), temperature = signal(20), online = signal(true);
    const host = mount(h('main', null,
      h('output', null, () => `${ticks.value}:${temperature.value}`),
      h(If, { when: online, fallback: 'offline' }, 'online'),
      h('span', { class: { hot: () => temperature.value >= 23 }, style: { '--reading': temperature } })
    ));
    const interval = setInterval(() => batch(() => {
      ticks.value++;
      temperature.value++;
    }), 1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(host.querySelector('output').textContent).toBe('3:23');
    expect(host.querySelector('span').classList.contains('hot')).toBe(true);
    expect(host.querySelector('span').style.getPropertyValue('--reading')).toBe('23');
    online.value = false;
    expect(host.textContent).toBe('3:23offline');
    clearInterval(interval);
    await vi.advanceTimersByTimeAsync(5000);
    expect(host.querySelector('output').textContent).toBe('3:23');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('async request state transitions: loading, success, failure and retry', async () => {
    const status = signal('idle'), result = signal('');
    const host = mount(h('section', null, h(Switch, { fallback: 'idle' },
      h(Match, { when: () => status.value === 'loading' }, 'Loading…'),
      h(Match, { when: () => status.value === 'ready' }, () => h('strong', result)),
      h(Match, { when: () => status.value === 'error' }, 'Try again')
    )));
    const load = async request => {
      status.value = 'loading';
      try { result.value = await request; status.value = 'ready'; }
      catch { status.value = 'error'; }
    };
    expect(host.textContent).toBe('idle');
    const success = deferred(), task = load(success.promise);
    expect(host.textContent).toBe('Loading…');
    success.resolve('Hello'); await task;
    expect(host.querySelector('strong').textContent).toBe('Hello');
    await load(Promise.reject(new Error('offline')));
    expect(host.textContent).toBe('Try again');
    await load(Promise.resolve('Recovered'));
    expect(host.textContent).toBe('Recovered');
  });

  test.each(['range', 'diff'])('seeded list churn retains identity and order through 250 updates (%s)', mode => {
    if (mode === 'diff') api.diff = reconcile;
    let seed = 123456789;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const items = signal([]), created = new Map();
    const render = vi.fn(id => {
      const node = h('input', { value: String(id), 'data-id': id });
      created.set(id, node);
      return node;
    });
    const host = mount('before', map(items, render, 'empty'), 'after');
    let previous = new Set(), expectedRenders = 0;
    for (let step = 0; step < 250; step++) {
      const pool = Array.from({ length: 25 }, (_, id) => id);
      // Fisher–Yates avoids non-transitive random sort comparators.
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const next = pool.slice(0, Math.floor(random() * 26));
      expectedRenders += next.filter(id => !previous.has(id)).length;
      previous = new Set(next);
      items.value = next;
      const nodes = [...host.querySelectorAll('input')];
      expect(nodes.map(node => Number(node.dataset.id))).toEqual(next);
      nodes.forEach((node, i) => expect(node).toBe(created.get(next[i])));
      expect(host.firstChild.textContent).toBe('before');
      expect(host.lastChild.textContent).toBe('after');
      if (!next.length) expect(host.textContent).toBe('beforeemptyafter');
    }
    expect(render).toHaveBeenCalledTimes(expectedRenders);
  });

  test('1,000-item list reversals preserve user-edited DOM values', () => {
    const initial = Array.from({ length: 1000 }, (_, index) => index);
    const items = signal(initial), render = vi.fn(id => h('input', { value: String(id) }));
    const host = mount(map(items, render));
    const first = host.querySelector('input');
    first.value = 'local edit';
    items.value = [...initial].reverse();
    expect(host.querySelectorAll('input')).toHaveLength(1000);
    expect(host.querySelectorAll('input')[999]).toBe(first);
    expect(first.value).toBe('local edit');
    expect(render).toHaveBeenCalledTimes(1000);
  });
});

describe('external reactive source integration (full runtime)', () => {
  setupRuntime(runtime);

  test.each(['function', 'object'])('observable subscriptions accept %s disposers and pass errors/cleanup', kind => {
    let emit, fail;
    const unsubscribe = vi.fn(), next = vi.fn(), error = vi.fn(), cleanup = vi.fn();
    const source = { subscribe(onValue, onError) {
      emit = onValue; fail = onError; onValue('initial');
      return kind === 'function' ? unsubscribe : { unsubscribe };
    } };
    expect(is(source)).toBeTruthy();
    const stop = r(source, next, error, cleanup);
    emit('next');
    const failure = new Error('stream failed'); fail(failure);
    expect(next.mock.calls).toEqual([['initial', true], ['next', true]]);
    expect(error).toHaveBeenCalledWith(failure);
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('Symbol.observable sources update mounted children and attributes', () => {
    const listeners = new Set();
    const source = { [Symbol.observable]: () => ({ subscribe(next) {
      listeners.add(next); next('initial'); return () => listeners.delete(next);
    } }) };
    const host = mount(h('div', { 'data-message': source }, source));
    listeners.forEach(next => next('socket message'));
    expect(host.textContent).toBe('socket message');
    expect(host.firstChild.dataset.message).toBe('socket message');
    listeners.clear();
  });

  test('async iterable renders successive chunks, not their concatenation', async () => {
    vi.useFakeTimers();
    async function* messages() {
      yield 'connecting';
      await new Promise(resolve => setTimeout(resolve, 100));
      yield h('b', 'message one');
      await new Promise(resolve => setTimeout(resolve, 100));
      yield ['message ', 'two'];
    }
    const host = mount('before', add(messages()), 'after');
    await vi.advanceTimersByTimeAsync(0);
    expect(host.textContent).toBe('beforeconnectingafter');
    await vi.advanceTimersByTimeAsync(100);
    expect(host.innerHTML).toBe('before<b>message one</b>after');
    await vi.advanceTimersByTimeAsync(100);
    expect(host.textContent).toBe('beforemessage twoafter');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('async iterable cancellation stops delivery and closes the iterator on its next yield', async () => {
    vi.useFakeTimers();
    const next = vi.fn(), closed = vi.fn();
    async function* messages() {
      try {
        yield 'first';
        await new Promise(resolve => setTimeout(resolve, 100));
        yield 'late';
      } finally { closed(); }
    }
    const stop = sub(messages(), next);
    await vi.advanceTimersByTimeAsync(0);
    expect(next).toHaveBeenCalledWith('first');
    stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(next).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  test('async iterable completion and failure callbacks', async () => {
    vi.useFakeTimers();
    const next = vi.fn(), cleanup = vi.fn(), error = vi.fn();
    async function* complete() { yield 1; yield 2; }
    sub(complete(), next, error, cleanup);
    await vi.advanceTimersByTimeAsync(0);
    expect(next.mock.calls).toEqual([[1], [2]]);
    expect(cleanup).toHaveBeenCalledTimes(1);
    const failure = new Error('stream broke');
    async function* broken() { throw failure; }
    sub(broken(), next, error, cleanup);
    await vi.advanceTimersByTimeAsync(0);
    expect(error).toHaveBeenCalledWith(failure);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  test('DOM removal alone is not explicit subscription disposal', () => {
    const value = signal('initial');
    const element = h('div', { title: value }, value);
    mount(element); element.remove();
    value.value = 'detached update';
    expect(element.title).toBe('detached update');
    expect(element.textContent).toBe('detached update');
    // This is deliberately not an assertion about nondeterministic GC.
  });

  test('a stale Promise resolving in a removed live region cannot overwrite its replacement', async () => {
    const pending = deferred();
    const [nodes, set] = useLive(pending.promise);
    const host = mount(nodes);
    set('new content');
    pending.resolve('stale content'); await pending.promise;
    expect(host.textContent).toBe('new content');
  });

  test('lite intentionally does not recognize observables or async iterables', () => {
    expect(lite.is({ subscribe() {} })).toBeFalsy();
    expect(lite.is({ async *[Symbol.asyncIterator]() {} })).toBeFalsy();
    expect(is({ subscribe() {} })).toBeTruthy();
    expect(is({ async *[Symbol.asyncIterator]() {} })).toBeTruthy();
  });
});
