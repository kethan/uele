/** @vitest-environment jsdom */
// Native require is intentional: optional CJS entries must share the *built*
// renderer's teardown registry, not Vitest's ESM module cache.
import { createRequire } from 'node:module';
import { it, expect, beforeEach, afterEach, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { h, useLive } = require('uele');
const { preactSignals } = require('uele/signals/preact');
const { signal, write } = require('uele/reactive');
const { Portal, Title } = require('uele/flow');
const { Router } = require('uele/router');
const { CountdownTimer } = require('uele/ui');

let unmount;
beforeEach(() => { preactSignals(); document.body.innerHTML = ''; unmount = () => {}; });
afterEach(() => { unmount(); vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ''; });
const mount = (node) => {
    const [nodes, replace] = useLive(node);
    document.body.append(...nodes);
    unmount = () => replace([]);
};

it('CJS UI timers use the same renderer-owned cleanup registry', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    mount(CountdownTimer({ seconds: 3, onComplete: complete }));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    vi.advanceTimersByTime(10000);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
});

it('CJS flow clears external bindings and restores titles automatically', () => {
    document.title = 'before';
    const target = h('aside'); document.body.append(target);
    const value = signal('first'), child = h('b', null, value);
    mount(h('div', null, Portal({ mount: target, children: child }), Title({ children: 'owned' })));
    write(value, 'second');
    expect(target.textContent).toBe('second');
    expect(document.title).toBe('owned');
    unmount();
    expect(target.childNodes.length).toBe(0);
    expect(document.title).toBe('before');
    write(value, 'late'); expect(child.textContent).toBe('second');
});

it('CJS Router removes its popstate listener and invalidates pending work', async () => {
    let resolve;
    const pending = new Promise((yes) => { resolve = yes; });
    const fetch = vi.fn(() => pending);
    const remove = vi.spyOn(window, 'removeEventListener');
    const router = Router({ app: { fetch }, initial: 'initial' });
    mount(router); unmount();
    resolve('late'); await pending; await Promise.resolve();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(router.textContent).toBe('initial');
    expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function));
});
