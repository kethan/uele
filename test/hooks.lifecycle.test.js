import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import * as hooks from 'uele/hooks';
import { preactSignals } from 'uele/signals/preact';
import { signal, read, effect } from 'uele/reactive';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => { preactSignals(); vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('has one canonical API, with primitives only in uele/reactive', () => {
    for (const name of ['signal', 'computed', 'effect', 'read', 'write', 'useSignal', 'useComputed', 'useEffect', 'useBoolean', 'useArray', 'useClock', 'useRaf', 'usePinInput', 'useDarkMode', 'useScroll', 'useElementSize', 'useIsMounted']) expect(name in hooks).toBe(false);
    expect(hooks.useToggle().value).toBeDefined();
});

it('disposes all listener-owning hooks, once, and preserves persisted data', () => {
    const win = vi.spyOn(window, 'removeEventListener');
    const doc = vi.spyOn(document, 'removeEventListener');
    const media = new EventTarget(); media.matches = false;
    const mql = vi.spyOn(media, 'removeEventListener');
    vi.stubGlobal('matchMedia', () => media);
    const source = signal(1);
    const resources = [hooks.useOnline(), hooks.useWindowSize(), hooks.useDocumentVisibility(), hooks.useWindowFocus(), hooks.useScrollPosition(), hooks.useBreakpoint(), hooks.useMediaQuery('all'), hooks.useColorScheme({ persist: false }), hooks.useQueryParam('owned'), hooks.useFullscreen(), hooks.useLatest(source), hooks.usePrevious(source)];
    const storage = hooks.useLocalStorage('keep', 'initial');
    storage.set('persisted');
    const stored = localStorage.getItem('keep');
    resources.push(storage, hooks.useSessionStorage('session', 'seed'));
    for (const resource of resources) { resource.dispose(); resource.dispose(); }
    expect(win.mock.calls.length).toBeGreaterThan(8);
    expect(doc.mock.calls.length).toBe(2);
    expect(mql.mock.calls.length).toBe(2);
    source.value = 2;
    expect(read(resources[10].latest)).toBe(1);
    expect(localStorage.getItem('keep')).toBe(stored);
    const removes = win.mock.calls.length;
    for (const resource of resources) resource.dispose();
    expect(win).toHaveBeenCalledTimes(removes);
});

it('removes events and makes disposal terminal for timers, binding props and actions', async () => {
    const fn = vi.fn();
    const element = document.createElement('div');
    const event = hooks.useEventListener(element, 'click', fn);
    element.click(); event.dispose(); event.dispose(); element.click();
    expect(fn).toHaveBeenCalledTimes(1);
    const timers = [hooks.useInterval(fn, 10), hooks.useTimeout(fn, 10), hooks.useCountdown(2), hooks.useStopwatch(), hooks.useNow(10), hooks.useIdle(10), hooks.useAnimationFrame(fn)];
    for (const timer of timers) { timer.start?.(); timer.dispose(); timer.dispose(); timer.start?.(); }
    const long = hooks.useLongPress(fn, 10);
    long.props.onmousedown(); long.dispose(); long.props.ontouchstart();
    const debounced = hooks.useDebounceFn(fn, 10);
    debounced(); debounced.dispose(); debounced.dispose(); debounced(); debounced.flush();
    const throttled = hooks.useThrottleFn(fn, 10);
    throttled(); throttled(); throttled.dispose(); throttled.dispose(); throttled();
    const source = signal(1);
    const states = [hooks.useDebounce(source, 10), hooks.useThrottle(source, 10)];
    source.value = 2;
    for (const state of states) { state.dispose(); state.dispose(); }
    const calls = fn.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
});

it('title disposal stops its subscription and restores the original title', () => {
    document.title = 'original';
    const source = signal('first');
    const title = hooks.useTitle(source);
    source.value = 'second'; expect(document.title).toBe('second');
    title.dispose(); title.dispose();
    source.value = 'third'; expect(document.title).toBe('original');
});

it('observer disposal disconnects once and rejects queued callbacks, including in-view', () => {
    const instances = [];
    class Observer {
        disconnect = vi.fn(); observe = vi.fn();
        constructor(callback) { this.callback = callback; instances.push(this); }
    }
    vi.stubGlobal('IntersectionObserver', Observer); vi.stubGlobal('ResizeObserver', Observer);
    const element = document.createElement('div');
    const intersection = hooks.useIntersectionObserver(); intersection.ref(element);
    const resize = hooks.useResizeObserver(); resize.ref(element);
    const view = hooks.useInView(element);
    intersection.dispose(); resize.dispose(); view.dispose();
    for (const resource of [intersection, resize, view]) resource.dispose();
    for (const instance of instances) { expect(instance.disconnect).toHaveBeenCalledTimes(1); instance.callback([{ isIntersecting: true, contentRect: { width: 9, height: 9 } }]); }
    expect(read(intersection.visible)).toBe(false);
    expect(read(resize.size)).toEqual({ width: 0, height: 0 });
    expect(read(view.visible)).toBe(false);
    intersection.ref(element); resize.ref(element); expect(instances).toHaveLength(3);
});

it('clears focus traps and restores locks, and cannot reacquire after disposal', () => {
    document.body.style.overflow = 'scroll';
    const lock = hooks.useScrollLock(); lock.lock(); lock.lock();
    lock.dispose(); lock.dispose(); lock.lock();
    expect(document.body.style.overflow).toBe('scroll');
    const trap = hooks.useFocusTrap();
    const node = document.createElement('div'); node.innerHTML = '<button>focus</button>';
    document.body.append(node); trap.ref(node); trap.dispose(); trap.activate();
    expect(trap.active()).toBe(false); node.remove();
});

it('async disposal rejects stale commits without requiring promise cancellation', async () => {
    let resolve;
    const async = hooks.useAsync(() => new Promise(done => { resolve = done; }));
    const pending = async.run(); await flush();
    async.dispose(); async.dispose(); resolve('late'); await pending;
    expect(read(async.data)).toBeNull(); expect(read(async.loading)).toBe(false);
    expect(await async.run()).toBeUndefined();
    async.reset();
    const invoke = vi.fn(); const queued = hooks.useAsync(invoke);
    const never = queued.run(); queued.dispose(); await never; expect(invoke).not.toHaveBeenCalled();
});

it('cancels async errors and fetches, including fetches that ignore abort', async () => {
    let reject;
    const async = hooks.useAsync(() => new Promise((_, fail) => { reject = fail; }));
    const pending = async.run(); await flush(); async.dispose(); reject(new Error('late')); await pending;
    expect(read(async.error)).toBeNull();
    let resolve; let abortSignal;
    vi.stubGlobal('fetch', vi.fn((url, options) => { abortSignal = options.signal; return new Promise(done => { resolve = done; }); }));
    const request = hooks.useFetch('/api'); const work = request.run(); await flush();
    request.dispose(); request.dispose();
    expect(abortSignal.aborted).toBe(true);
    resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => 'late' }); await work;
    expect(read(request.data)).toBeNull(); expect(await request.run()).toBeUndefined();
});

it('abort invalidates even a non-cooperative fetch result', async () => {
    let resolve;
    vi.stubGlobal('fetch', () => new Promise(done => { resolve = done; }));
    const request = hooks.useFetch('/api'); const work = request.run(); await flush();
    request.abort();
    resolve({ ok: true, text: async () => 'late' }); await work;
    expect(read(request.data)).toBeNull(); expect(read(request.loading)).toBe(false);
    request.dispose();
});

it('clipboard disposal handles both pending success and pending failure without DOM fallback', async () => {
    for (const failure of [false, true]) {
        let settle;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise((resolve, reject) => { settle = failure ? reject : resolve; }) } });
        const clipboard = hooks.useClipboard(); const promise = clipboard.copy('hello');
        clipboard.dispose(); settle(); await promise;
        expect(read(clipboard.copied)).toBe(false);
        expect(await clipboard.copy('ignored')).toBeUndefined();
    }
    const clipboard = hooks.useClipboard(); clipboard.dispose();
    expect(vi.getTimerCount()).toBe(0);
});

it('geolocation disposal invalidates callbacks and does not refresh again', () => {
    let success, fail;
    const getCurrentPosition = vi.fn((ok, error) => { success = ok; fail = error; });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    const geo = hooks.useGeolocation({ immediate: true }); geo.dispose(); geo.dispose();
    success({ coords: { latitude: 1 } }); fail(new Error('late')); geo.refresh();
    expect(read(geo.position)).toBeNull(); expect(read(geo.error)).toBeNull(); expect(read(geo.loading)).toBe(false);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
});

it('closes transports once, releases handlers and prevents reopening', () => {
    class Transport { close = vi.fn(); postMessage() {} send() {} }
    vi.stubGlobal('WebSocket', Transport); vi.stubGlobal('EventSource', Transport); vi.stubGlobal('BroadcastChannel', Transport);
    const socket = hooks.useWebSocket('ws://test'); const nativeSocket = socket.socket();
    const source = hooks.useEventSource('/events'); const nativeSource = source.source();
    const channel = hooks.useBroadcastChannel('test');
    socket.dispose(); socket.dispose(); source.dispose(); source.dispose(); channel.dispose(); channel.dispose();
    expect(nativeSocket.close).toHaveBeenCalledTimes(1); expect(nativeSource.close).toHaveBeenCalledTimes(1);
    expect(nativeSocket.onmessage).toBeNull(); expect(nativeSource.onmessage).toBeNull();
    expect(socket.socket()).toBeNull(); expect(source.source()).toBeNull();
    expect(socket.open()).toBeUndefined(); expect(channel.post('ignored')).toBeUndefined();
    vi.stubGlobal('BroadcastChannel', undefined);
    hooks.useBroadcastChannel('unsupported').dispose();
});

it('form disposal prevents late submitting updates and synchronous submit errors settle', async () => {
    let resolve;
    const form = hooks.useForm({ onSubmit: () => new Promise(done => { resolve = done; }) });
    const pending = form.handleSubmit(); await flush(); form.dispose(); resolve(); await pending;
    expect(read(form.submitting)).toBe(false);
    const bad = hooks.useForm({ onSubmit: () => { throw new Error('submit'); } });
    await expect(bad.handleSubmit()).rejects.toThrow('submit');
    expect(read(bad.submitting)).toBe(false); bad.dispose();
});

it('a disposed form ignores queued submits and retained blur bindings', async () => {
    const submit = vi.fn();
    const form = hooks.useForm({ initialValues: { name: '' }, onSubmit: submit });
    const props = form.register('name');
    props.onblur(); expect(read(form.touched)).toEqual({ name: true });
    const pending = form.handleSubmit(); form.dispose();
    const before = read(form.touched); props.onblur();
    await pending; expect(submit).not.toHaveBeenCalled(); expect(read(form.touched)).toBe(before);
});

it('null ref callbacks release existing observers and focus traps', () => {
    const disconnected = vi.fn();
    class Observer { constructor() {} observe() {} disconnect() { disconnected(); } }
    vi.stubGlobal('IntersectionObserver', Observer); vi.stubGlobal('ResizeObserver', Observer);
    for (const resource of [hooks.useIntersectionObserver(), hooks.useResizeObserver()]) {
        resource.ref(document.createElement('div')); resource.ref(null); resource.dispose();
    }
    expect(disconnected).toHaveBeenCalledTimes(2);
    const trap = hooks.useFocusTrap(); trap.ref(document.createElement('div')); trap.ref(null);
    expect(trap.active()).toBe(false); trap.dispose();
});

it('fetch honors caller abort signals and releases relay listeners on completion/disposal', async () => {
    let finish, observed;
    vi.stubGlobal('fetch', (url, options) => { observed = options.signal; return new Promise(resolve => { finish = resolve; }); });
    const caller = new AbortController();
    const remove = vi.spyOn(caller.signal, 'removeEventListener');
    const request = hooks.useFetch('/api', { signal: caller.signal });
    const pending = request.run(); await flush(); caller.abort();
    expect(observed.aborted).toBe(true);
    finish({ ok: true, text: async () => 'late' }); await pending;
    expect(read(request.data)).toBeNull(); expect(remove).toHaveBeenCalledTimes(1);
    request.dispose();
    const completed = new AbortController();
    const removeCompleted = vi.spyOn(completed.signal, 'removeEventListener');
    const next = hooks.useFetch('/api'); const second = next.run('/other', { signal: completed.signal }); await flush();
    finish({ ok: true, text: async () => 'done' }); await second;
    expect(read(next.data)).toBe('done'); expect(removeCompleted).toHaveBeenCalledTimes(1);
    next.dispose();
});

it('already-aborted caller signals and environments without AbortController cannot publish late fetch results', async () => {
    const caller = new AbortController(); caller.abort();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => 'late' })));
    const request = hooks.useFetch('/api', { signal: caller.signal });
    await request.run(); expect(read(request.data)).toBeNull(); request.dispose();
    vi.stubGlobal('AbortController', undefined);
    const noController = hooks.useFetch('/api', { signal: caller.signal });
    await noController.run(); expect(read(noController.data)).toBeNull(); noController.dispose();
    const ordinary = hooks.useFetch('/api'); await ordinary.run(); ordinary.dispose();
});
