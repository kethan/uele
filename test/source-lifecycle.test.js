/** @vitest-environment jsdom */
// Public contracts retained from the retired runtime/compact experiments.
import { afterEach, it, expect, vi } from 'vitest';
import { signal } from '@preact/signals-core';
import { preactSignals } from '../signals/preact.js';
import { h, api, r, useLive } from '../src/index.js';
const engineDefaults = { ...api.engine }, apiDefaults = { ...api }, stops = [];
const mount = value => {
    const [nodes, update] = useLive(value); document.body.append(...nodes);
    const stop = () => update([]); stops.push(stop); return stop;
};
afterEach(() => {
    stops.splice(0).reverse().forEach(stop => stop());
    for (const key of Object.keys(api.engine)) delete api.engine[key];
    Object.assign(api.engine, engineDefaults);
    for (const key of Object.keys(api)) delete api[key];
    Object.assign(api, apiDefaults); document.body.replaceChildren();
});
it('composes signals, thunks, promises and observable sources through production hooks', async () => {
    preactSignals(api);
    const count = signal(1); let emit, active = true;
    const off = vi.fn(() => { active = false; });
    const stream = { subscribe(next) { emit = value => { if (active) next(value); }; next('stream'); return off; } };
    const node = h('div', { title: count, 'data-count': count }, count, () => count.value * 2, Promise.resolve('async'), stream);
    const stop = mount(node); await Promise.resolve();
    expect(node.textContent).toBe('12asyncstream'); count.value = 2; emit('next');
    expect(node.textContent).toBe('24asyncnext'); expect(node.title).toBe('2');
    stop(); count.value = 3; emit('late');
    expect(node.textContent).toBe('24asyncnext'); expect(node.title).toBe('2');
    expect(node.dataset.count).toBe('2'); expect(off).toHaveBeenCalledTimes(1);
});
it.each(['resolve', 'reject'])('does not subscribe to a late promise %s after owned teardown', async outcome => {
    let resolve, reject;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    const nested = { subscribe: vi.fn() };
    const node = h('div', null, pending), stop = mount(node);
    stop(); ({ resolve, reject })[outcome](nested); await Promise.resolve();
    expect(node.textContent).toBe(''); expect(nested.subscribe).not.toHaveBeenCalled();
});
it('normalizes observable object disposers and makes cancellation terminal and idempotent', () => {
    let emit, fail, active = true;
    const unsubscribe = vi.fn(() => { active = false; }), next = vi.fn(), error = vi.fn();
    const stop = r({ subscribe(n, e) { emit = value => { if (active) n(value); }; fail = value => { if (active) e(value); }; return { unsubscribe }; } }, next, error);
    emit(1); fail('first'); stop(); stop(); emit(2); fail('late');
    expect(next).toHaveBeenCalledTimes(1); expect(error).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('preserves the signal library contract for synchronous subscription failures', () => {
    const next = vi.fn(), error = vi.fn();
    expect(() => r({ subscribe() { throw Error('sync'); } }, next, error)).toThrow('sync');
    expect(error).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
});
it('does not subscribe to superseded synchronous initial child emissions', () => {
    const nested = { subscribe: vi.fn(next => { next('old'); return () => {}; }) };
    const outer = { subscribe(next) { next(nested); next('new'); } };
    const stop = mount(h('div', null, outer));
    expect(document.body.textContent).toBe('new');
    expect(nested.subscribe).not.toHaveBeenCalled(); stop();
});
