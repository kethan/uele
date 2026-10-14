import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as full from '../src/index.js';
import * as lite from '../lite/index.js';
import { setupRuntime, mount } from './helpers/runtime.js';
import { signal } from 'ulive';

describe('subscription protocol termination', () => {
  setupRuntime(full);
  test('synchronous observable completion releases the returned disposer once', () => {
    const stop = vi.fn(), cleanup = vi.fn(), next = vi.fn();
    const cancel = full.sub({ subscribe(emit, error, complete) { emit('one'); complete(); return stop; } }, next, undefined, cleanup);
    expect(next).toHaveBeenCalledWith('one'); expect(stop).toHaveBeenCalledTimes(1); expect(cleanup).toHaveBeenCalledTimes(1);
    cancel(); expect(stop).toHaveBeenCalledTimes(1);
  });
  test('late values and errors are ignored after observable cancellation', () => {
    let emit, error;
    const next = vi.fn(), fail = vi.fn();
    const cancel = full.sub({ subscribe(n, e) { emit = n; error = e; return { unsubscribe() {} }; } }, next, fail);
    cancel(); emit('late'); error(new Error('late')); expect(next).not.toHaveBeenCalled(); expect(fail).not.toHaveBeenCalled();
  });
  test('api.any delivers raw nested sources and ignores late callbacks after cancellation', () => {
    let emit;
    full.api.any = () => next => { emit = next; return () => {}; };
    const next = vi.fn(), nested = () => 1;
    const cancel = full.sub(() => 0, next);
    emit(nested); expect(next).toHaveBeenCalledWith(nested);
    cancel(); emit(2); expect(next).toHaveBeenCalledTimes(1);
  });
  test('observ-style callable/set sources receive their native subscription arguments', () => {
    const next = vi.fn(), stop = vi.fn();
    const source = vi.fn((value, emit) => { expect(value).toBeUndefined(); emit('initial'); return stop; });
    source.set = () => {};
    const cancel = full.sub(source, next);
    expect(next).toHaveBeenCalledWith('initial'); cancel(); expect(stop).toHaveBeenCalledTimes(1);
  });
  test('synchronous subscribe exceptions run cleanup and propagate', () => {
    const cleanup = vi.fn();
    expect(() => full.sub({ subscribe() { throw new Error('broken source'); } }, () => {}, undefined, cleanup)).toThrow('broken source');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('throwing unsubscribe still runs completion cleanup and is not called twice', () => {
    const stop = vi.fn(() => { throw new Error('broken dispose'); }), cleanup = vi.fn();
    const cancel = full.sub({ subscribe: () => stop }, () => {}, undefined, cleanup);
    expect(cancel).toThrow('broken dispose'); expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cancel).not.toThrow(); expect(stop).toHaveBeenCalledTimes(1);
  });
  test('error callbacks may throw without preventing disposal', () => {
    let fail;
    const stop = vi.fn(), cleanup = vi.fn();
    full.sub({ subscribe(n, e) { fail = e; return stop; } }, () => {}, () => { throw new Error('error handler'); }, cleanup);
    expect(() => fail(new Error('source'))).toThrow('error handler');
    expect(stop).toHaveBeenCalledTimes(1); expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('async iterator discovery errors throw synchronously and run cleanup', () => {
    const cleanup = vi.fn(), error = new Error('iterator discovery');
    const source = { get [Symbol.asyncIterator]() { throw error; } };
    expect(() => full.sub(source, () => {}, undefined, cleanup)).toThrow(error);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('async iterator acquisition errors use the error callback and clean up once', () => {
    const cleanup = vi.fn(), fail = vi.fn(), error = new Error('iterator acquisition');
    let reads = 0;
    const source = { get [Symbol.asyncIterator]() {
      if (++reads === 2) throw error;
      return () => {};
    } };
    const cancel = full.sub(source, () => {}, fail, cleanup);
    expect(fail).toHaveBeenCalledWith(error);
    expect(cleanup).toHaveBeenCalledTimes(1);
    cancel(); expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('missing error handlers still release failed subscriptions', async () => {
    const cleanup = vi.fn();
    full.sub(Promise.reject(new Error('expected')), () => {}, undefined, cleanup);
    await Promise.resolve(); expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('missing api.effect and unsupported sources have safe cancellation', () => {
    full.api.effect = undefined;
    expect(() => full.sub(() => 1, () => {})()).not.toThrow();
    for (const value of [null, undefined, 0, {}, { then: undefined }]) expect(() => full.sub(value, () => {})()).not.toThrow();
  });
  test('api.cleanup receives an idempotent completion hook for an effect binding', () => {
    const cleanup = vi.fn(); full.api.cleanup = vi.fn();
    const cancel = full.sub(signal(1), () => {}, undefined, cleanup);
    expect(full.api.cleanup).toHaveBeenCalledWith(expect.any(Function));
    const finish = full.api.cleanup.mock.calls[0][0];
    finish(); cancel(); finish(); expect(cleanup).toHaveBeenCalledTimes(1);
  });
  test('cancellation inside an emission cleans nested work created in that emission', () => {
    const source = signal(0), child = signal('text'); let cancel;
    cancel = full.sub(source, value => {
      if (value) {
        full.h('b', { title: child }, child);
        cancel();
      }
    });
    source.value = 1;
    expect(() => { child.value = 'late'; cancel(); }).not.toThrow();
  });
});

describe('render scope failure cleanup', () => {
  setupRuntime(full);
  test('all render-owned custom stops run when one throws', () => {
    const version = signal(0); let good = 0;
    full.props.set('bad', () => () => { throw new Error('bad stop'); });
    full.props.set('good', () => () => { good++; });
    const root = mount(full.h('main', null, () => { version.value; return full.h('b', { bad: true, good: true }); }));
    expect(() => { version.value++; }).toThrow(AggregateError);
    expect(good).toBe(1);
    expect(() => full.dispose(root)).not.toThrow();
  });
  test('initial render failure cleans already-created custom resources', () => {
    let stopped = 0;
    full.props.set('owned', () => () => stopped++);
    expect(() => full.h('main', null, () => {
      full.h('b', { owned: true }); throw new Error('render failure');
    })).toThrow('render failure');
    expect(stopped).toBe(1);
  });
});

describe('lite protocol boundary', () => {
  let saved;
  beforeEach(() => { saved = { ...lite.api }; });
  afterEach(() => { Object.keys(lite.api).forEach(key => delete lite.api[key]); Object.assign(lite.api, saved); });
  test('unsupported observable/iterator subscriptions are inert in lite', () => {
    const subscribe = vi.fn();
    const cancel = lite.sub({ subscribe }, () => {}); cancel(); expect(subscribe).not.toHaveBeenCalled();
  });
});

for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  describe(`${name} completed async render lifetime`, () => {
    setupRuntime(runtime);
    test('Promise completion does not dispose the reactive subtree it just rendered', async () => {
      const label = signal('before');
      const root = mount(runtime.h('main', null, Promise.resolve(() => runtime.h('b', { title: label }, label))));
      await Promise.resolve();
      expect(root.textContent).toBe('before');
      label.value = 'after';
      expect(root.textContent).toBe('after'); expect(root.querySelector('b').title).toBe('after');
      runtime.dispose(root); label.value = 'stopped';
      expect(root.textContent).toBe('after');
    });
  });
}
