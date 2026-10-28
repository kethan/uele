/** @vitest-environment jsdom */
import { it, expect, beforeEach, afterEach, vi, describe } from 'vitest';
import { h, useLive, api } from 'uele';
import { read, write, signal } from 'uele/reactive';
import { preactSignals } from 'uele/signals/preact';
import { rxjs } from 'uele/signals/rxjs';
import { nanostores } from 'uele/signals/nanostores';
import { tanstackStore } from 'uele/signals/tanstack';
import { sjs } from 'uele/signals/sjs';
import { Await, Portal, Title } from 'uele/flow';
import { useRouter, Router } from 'uele/router';
import { appProps } from 'uele/props';
import { useInterval } from 'uele/hooks';
import {
    CopyButton, HoverCard, SplitPane, Editable, Dialog, CommandPalette,
    ContextMenu, Lightbox, InfiniteScroll, TimeAgo, CountdownTimer, Toast, Switch
} from 'uele/ui';

const stops = [];
const mount = (node) => {
    const [nodes, replace] = useLive(node);
    document.body.append(...nodes);
    const stop = () => replace(null);
    stops.push(stop);
    return stop;
};
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
beforeEach(() => {
    preactSignals();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    document.title = 'before';
    window.history.replaceState(null, '', '/');
});
afterEach(() => {
    stops.splice(0).reverse().forEach((stop) => stop());
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
    document.body.innerHTML = '';
});

describe.each([['preact', preactSignals], ['rxjs', rxjs], ['nanostores', nanostores], ['tanstack', tanstackStore]])('%s renderer ownership', (_name, install) => {
    beforeEach(() => install());
    it('Portal clears its external region and subscriptions, without touching siblings', () => {
        const target = h('aside', null, 'keep');
        document.body.append(target);
        const value = signal('first');
        const child = h('b', null, value);
        const stop = mount(Portal({ mount: target, children: child }));
        write(value, 'second');
        expect(target.textContent).toBe('keepsecond');
        stop(); stop();
        expect(target.childNodes.length).toBe(1); // no leaked region anchors
        write(value, 'late');
        expect(child.textContent).toBe('second');
    });
    it.each(['resolve', 'reject'])('Await ignores %s after teardown', async (outcome) => {
        const pending = deferred();
        const children = vi.fn((v) => v), onError = vi.fn(() => 'failed');
        const stop = mount(Await({ for: pending.promise, children, catch: onError }));
        stop(); pending[outcome]('late'); await flush();
        expect(children).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });
    it('Title restores the previous title without an engine cleanup hook', () => {
        const stop = mount(Title({ children: 'owned title' }));
        expect(document.title).toBe('owned title');
        stop(); expect(document.title).toBe('before');
    });
    it('document listeners and source subscriptions stop on discard', () => {
        const remove = vi.spyOn(document, 'removeEventListener');
        const open = signal(false), toggled = signal(false);
        const dialog = mount(Dialog({ open, trigger: 'open' }));
        const button = Switch({ model: toggled });
        const stop = mount(h('div', null, CommandPalette(), ContextMenu(), Lightbox(), button));
        const background = button.style.background;
        dialog(); stop();
        write(open, true); write(toggled, true);
        expect(document.body.style.overflow).toBe('');
        expect(button.style.background).toBe(background);
        expect(remove.mock.calls.filter(([event]) => event === 'keydown').length).toBe(3);
        expect(remove).toHaveBeenCalledWith('click', expect.any(Function));
    });
    it('timers and observers stop even on subscribe-only integrations', () => {
        vi.useFakeTimers();
        const disconnect = vi.fn(), load = vi.fn(), done = vi.fn(), close = vi.fn();
        let notify;
        vi.stubGlobal('IntersectionObserver', class {
            constructor(cb) { notify = cb; }
            observe() {}
            disconnect() { disconnect(); }
        });
        const stop = mount(h('div', null,
            TimeAgo({ date: new Date(), interval: 1000 }),
            CountdownTimer({ seconds: 10, onComplete: done }),
            Toast({ duration: 1000, onClose: close }),
            InfiniteScroll({ onLoadMore: load })
        ));
        vi.advanceTimersByTime(0);
        notify([{ isIntersecting: true }]);
        expect(load).toHaveBeenCalledTimes(1);
        stop();
        notify([{ isIntersecting: true }]); // queued observer notification after disconnect
        vi.advanceTimersByTime(20000);
        expect(load).toHaveBeenCalledTimes(1);
        expect(done).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('router lifetime', () => {
    it('has named results, removes its listener, and cannot restart after dispose', async () => {
        const fetch = vi.fn(() => 'home');
        const router = useRouter({ fetch }); stops.push(router.dispose);
        expect(Object.keys(router).sort()).toEqual(['dispose', 'navigate', 'props', 'view']);
        await flush();
        expect(read(router.view)).toBe('home');
        const remove = vi.spyOn(window, 'removeEventListener');
        router.dispose(); router.dispose();
        const event = new MouseEvent('click', { cancelable: true });
        router.props.onclick(event);
        expect(event.defaultPrevented).toBe(false);
        expect(await router.navigate('/next')).toBeUndefined();
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
    it.each(['resolve', 'reject'])('a stale %s cannot overwrite a newer route', async (outcome) => {
        const old = deferred();
        const router = useRouter({ fetch: (request) => new URL(request.url).pathname === '/slow' ? old.promise : 'new' }, '', '404');
        stops.push(router.dispose);
        const pending = router.navigate('/slow');
        await router.navigate('/fast');
        old[outcome]('old'); await pending;
        expect(read(router.view)).toBe('new');
    });
    it.each(['resolve', 'reject'])('disposal invalidates an outstanding %s', async (outcome) => {
        const old = deferred();
        const router = useRouter({ fetch: () => old.promise }, 'initial', '404');
        router.dispose(); old[outcome]('old'); await flush();
        expect(read(router.view)).toBe('initial');
    });
    it('normalizes synchronous fetch errors into notFound', async () => {
        const router = useRouter({ fetch: () => { throw Error('sync failure'); } }, '', '404');
        stops.push(router.dispose);
        await router.navigate('/broken');
        expect(read(router.view)).toBe('404');
    });
    it('Router automatically removes popstate ownership on region teardown', async () => {
        const pending = deferred(), fetch = vi.fn(() => pending.promise);
        const remove = vi.spyOn(window, 'removeEventListener');
        const root = Router({ app: { fetch }, initial: 'initial' });
        const stop = mount(root);
        stop();
        pending.resolve('late'); await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(root.textContent).toBe('initial');
        expect(remove).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
});

describe('remaining UI resources', () => {
    it.each(['resolve', 'reject'])('does not create copy feedback after a late clipboard %s', async (outcome) => {
        vi.useFakeTimers();
        const clipboard = deferred();
        vi.stubGlobal('navigator', { clipboard: { writeText: () => clipboard.promise } });
        const button = CopyButton({ text: 'copy' });
        const stop = mount(button);
        const copying = button.onclick();
        stop(); clipboard[outcome](); await copying;
        expect(button.dataset.copied).toBe('false');
        expect(vi.getTimerCount()).toBe(0);
        expect(document.querySelector('textarea')).toBeNull();
    });
    it('clears existing copy feedback and hover timers', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('navigator', { clipboard: { writeText: async () => {} } });
        const copy = CopyButton({ text: 'copy' });
        const hover = HoverCard({ trigger: 'hover', content: 'card' });
        const stop = mount(h('div', null, copy, hover));
        await copy.onclick();
        hover.onmouseenter(); hover.onfocus(); hover.onmouseleave(); hover.onblur();
        expect(vi.getTimerCount()).toBe(2); // one copy timer and one hover timer
        stop(); expect(vi.getTimerCount()).toBe(0);
    });
    it('removes an active drag and restores scroll/focus ownership', () => {
        vi.useFakeTimers();
        const pane = SplitPane();
        const remove = vi.spyOn(document, 'removeEventListener');
        const stopDrag = mount(pane);
        pane.querySelector('[role=separator]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        stopDrag();
        expect(remove).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(remove).toHaveBeenCalledWith('mouseup', expect.any(Function));
        document.body.style.overflow = 'scroll';
        const stopDialog = mount(Dialog({ defaultOpen: true }));
        expect(document.body.style.overflow).toBe('hidden');
        stopDialog(); expect(document.body.style.overflow).toBe('scroll');
        const editable = Editable({ value: 'edit' });
        const stopEdit = mount(editable);
        editable.querySelector('button').click();
        stopEdit(); expect(vi.getTimerCount()).toBe(0);
    });
    it('application hooks can be owned automatically using the existing use action', () => {
        vi.useFakeTimers(); appProps();
        const callback = vi.fn();
        const timer = useInterval(callback, 1000);
        const stop = mount(h('div', { use: () => timer.dispose }, 'timer'));
        vi.advanceTimersByTime(1000); expect(callback).toHaveBeenCalledTimes(1);
        stop(); vi.advanceTimersByTime(3000); expect(callback).toHaveBeenCalledTimes(1);
    });
    it('the s-js cleanup hook supports explicit effect-owned teardowns', () => {
        sjs();
        const cleanup = vi.fn();
        const stop = api.effect(() => { api.cleanup(cleanup); });
        stop(); expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
