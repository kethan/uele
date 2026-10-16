/**
 * Wave-2 `uele/hooks`: realtime transports (WebSocket/SSE/BroadcastChannel),
 * clocks, throttle, fetch, and the browser-API hooks — all with stubbed
 * globals so nothing touches a network.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { read, write } from 'uele/reactive';
import {
	useNow, useClock, useStopwatch, useThrottle, useThrottleFn, useWebSocket,
	useEventSource, useBroadcastChannel, useFetch, useGeolocation,
	useDocumentVisibility, useWindowFocus, useScrollPosition, useScrollLock,
	useFocusTrap, useFullscreen, useBreakpoint, useColorScheme, useDarkMode,
	useQueryParam, useCookie, useIdle, useLongPress, useSwipe,
	useAnimationFrame, useInView, useTitle, useLatest, useIsMounted, useElementSize
} from 'uele/hooks';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
	localStorage.clear();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('clocks and throttle', () => {
	it('useNow ticks and stops', () => {
		vi.useFakeTimers();
		const [now, stop] = useNow(1000);
		const first = read(now).getTime();
		vi.advanceTimersByTime(3000);
		expect(read(now).getTime()).toBeGreaterThan(first);
		stop();
		const stopped = read(now).getTime();
		vi.advanceTimersByTime(3000);
		expect(read(now).getTime()).toBe(stopped);
		expect(useClock).toBe(useNow);
	});

	it('useStopwatch runs, laps and resets (fake Date)', () => {
		vi.useFakeTimers();
		const sw = useStopwatch();
		sw.start();
		vi.advanceTimersByTime(3000);
		expect(read(sw.elapsed)).toBe(3);
		expect(sw.lap()).toEqual([3]);
		sw.pause();
		vi.advanceTimersByTime(2000);
		expect(read(sw.elapsed)).toBe(3);
		sw.reset();
		expect(read(sw.elapsed)).toBe(0);
		expect(sw.laps()).toEqual([]);
	});

	it('useThrottle leads, trails and disposes', () => {
		vi.useFakeTimers();
		const source = signal(0);
		const [throttled, dispose] = useThrottle(source, 100);
		source.value = 1;
		source.value = 2;
		source.value = 3;
		expect(read(throttled)).toBe(0); // the subscription's first run consumed the leading edge
		vi.advanceTimersByTime(100);
		expect(read(throttled)).toBe(3); // trailing edge publishes the latest value
		dispose();
	});

	it('useThrottleFn rate-limits calls', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const wrapped = useThrottleFn(fn, 100);
		wrapped();
		wrapped();
		expect(fn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		wrapped.cancel();
	});
});

describe('realtime transports (stubbed globals)', () => {
	it('useWebSocket tracks status, parses JSON and sends', () => {
		class FakeSocket {
			static instance;
			constructor(url) { this.url = url; this.sent = []; FakeSocket.instance = this; }
			send(data) { this.sent.push(data); }
			close() { this.onclose?.(); }
		}
		vi.stubGlobal('WebSocket', FakeSocket);
		const ws = useWebSocket('ws://example.test');
		expect(read(ws.status)).toBe('connecting');
		const socket = FakeSocket.instance;
		socket.onopen();
		expect(read(ws.status)).toBe('open');
		socket.onmessage({ data: '{"a":1}' });
		expect(read(ws.lastMessage)).toEqual({ a: 1 });
		socket.onmessage({ data: 'plain' });
		expect(read(ws.messages)).toEqual([{ a: 1 }, 'plain']);
		expect(ws.send({ b: 2 })).toBe(true);
		expect(socket.sent).toEqual(['{"b":2}']);
		ws.close();
		expect(read(ws.status)).toBe('closed');
		expect(ws.send('x')).toBe(false);
	});

	it('useEventSource mirrors the same contract', () => {
		class FakeSource {
			static instance;
			constructor(url) { this.url = url; FakeSource.instance = this; }
			close() {}
		}
		vi.stubGlobal('EventSource', FakeSource);
		const es = useEventSource('https://example.test/feed');
		FakeSource.instance.onopen();
		expect(read(es.status)).toBe('open');
		FakeSource.instance.onmessage({ data: '{"n":1}' });
		expect(read(es.lastMessage)).toEqual({ n: 1 });
		es.close();
		expect(read(es.status)).toBe('closed');
	});

	it('useBroadcastChannel posts and receives', () => {
		class FakeChannel {
			static instance;
			constructor(name) { this.name = name; this.posted = []; FakeChannel.instance = this; }
			postMessage(data) { this.posted.push(data); }
			close() {}
		}
		vi.stubGlobal('BroadcastChannel', FakeChannel);
		const bc = useBroadcastChannel('chat');
		expect(bc.supported).toBe(true);
		expect(bc.post({ hi: 1 })).toBe(true);
		expect(FakeChannel.instance.posted).toEqual([{ hi: 1 }]);
		FakeChannel.instance.onmessage({ data: 'yo' });
		expect(read(bc.lastMessage)).toBe('yo');
	});

	it('transports degrade without the globals', () => {
		vi.stubGlobal('WebSocket', undefined);
		const ws = useWebSocket('ws://nowhere');
		expect(read(ws.status)).toBe('closed');
		expect(ws.send('x')).toBe(false);
	});
});

describe('useFetch', () => {
	it('fetches JSON and surfaces errors', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({ hello: 'world' })
		})));
		const { data, loading, run } = useFetch();
		await run('https://example.test/api');
		expect(read(data)).toEqual({ hello: 'world' });
		expect(read(loading)).toBe(false);

		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, headers: { get: () => '' } })));
		const failing = useFetch();
		await failing.run('https://example.test/bad');
		expect(read(failing.error).message).toContain('500');
	});
});

describe('browser API hooks', () => {
	it('useGeolocation reports a stubbed fix', () => {
		Object.defineProperty(window.navigator, 'geolocation', {
			value: { getCurrentPosition: (ok) => ok({ coords: { latitude: 13, longitude: 80 } }) },
			configurable: true
		});
		const geo = useGeolocation({ immediate: true });
		expect(geo.supported).toBe(true);
		expect(read(geo.position).coords.latitude).toBe(13);
	});

	it('visibility, window focus and scroll position follow events', () => {
		const visibility = useDocumentVisibility();
		document.dispatchEvent(new Event('visibilitychange'));
		expect(read(visibility)).toBe(document.visibilityState);

		const focused = useWindowFocus();
		window.dispatchEvent(new Event('blur'));
		expect(read(focused)).toBe(false);
		window.dispatchEvent(new Event('focus'));
		expect(read(focused)).toBe(true);

		const pos = useScrollPosition();
		window.dispatchEvent(new Event('scroll'));
		expect(read(pos).y).toBe(window.scrollY || 0);
	});

	it('useScrollLock reference-counts the body lock', () => {
		const { lock, unlock, locked } = useScrollLock();
		lock();
		lock();
		expect(document.body.style.overflow).toBe('hidden');
		expect(read(locked)).toBe(true);
		unlock();
		expect(document.body.style.overflow).toBe('hidden');
		unlock();
		expect(document.body.style.overflow).toBe('');
	});

	it('useFocusTrap cycles Tab inside a container', () => {
		const trap = useFocusTrap();
		const box = document.createElement('div');
		box.innerHTML = '<button id="a">A</button><button id="b">B</button>';
		document.body.append(box);
		trap.ref(box);
		const [a, b] = box.querySelectorAll('button');
		b.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
		expect(document.activeElement).toBe(a);
		trap.deactivate();
		expect(trap.active()).toBe(false);
	});

	it('useFullscreen reports support without throwing', () => {
		const fs = useFullscreen();
		expect(typeof fs.supported).toBe('boolean');
		fs.toggle();
		expect(read(fs.fullscreen)).toBe(false);
	});

	it('useBreakpoint returns a known name', () => {
		const bp = useBreakpoint({ sm: 640, md: 768, lg: 1024 });
		expect(['base', 'sm', 'md', 'lg']).toContain(read(bp));
		window.dispatchEvent(new Event('resize'));
		expect(['base', 'sm', 'md', 'lg']).toContain(read(bp));
	});

	it('useColorScheme honours storage then media, toggles and persists', () => {
		localStorage.setItem('uele-scheme', 'dark');
		const cs = useColorScheme();
		expect(read(cs.scheme)).toBe('dark');
		expect(read(cs.dark)).toBe(true);
		cs.toggle();
		expect(read(cs.scheme)).toBe('light');
		expect(localStorage.getItem('uele-scheme')).toBe('light');
		expect(useDarkMode).toBe(useColorScheme);
	});

	it('useQueryParam syncs the URL', () => {
		window.history.pushState(null, '', '/page?tab=a');
		const [tab, setTab] = useQueryParam('tab', 'a');
		expect(read(tab)).toBe('a');
		setTab('b');
		expect(new URLSearchParams(window.location.search).get('tab')).toBe('b');
		setTab('');
		expect(new URLSearchParams(window.location.search).get('tab')).toBe(null);
		window.history.pushState(null, '', '/');
	});

	it('useCookie round-trips through document.cookie', () => {
		const [session, setSession] = useCookie('uele-session', '');
		setSession('abc123');
		expect(read(session)).toBe('abc123');
		const [again] = useCookie('uele-session', '');
		expect(read(again)).toBe('abc123');
		setSession(null);
		expect(read(session)).toBe('');
	});

	it('useIdle flips after inactivity and resets on activity', () => {
		vi.useFakeTimers();
		const idle = useIdle(1000);
		expect(read(idle)).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(read(idle)).toBe(true);
		window.dispatchEvent(new Event('mousemove'));
		expect(read(idle)).toBe(false);
	});

	it('useLongPress fires after the hold, cancels on release', () => {
		vi.useFakeTimers();
		const handler = vi.fn();
		const props = useLongPress(handler, 300);
		props.onmousedown();
		vi.advanceTimersByTime(300);
		expect(handler).toHaveBeenCalledTimes(1);
		props.onmousedown();
		props.onmouseup();
		vi.advanceTimersByTime(300);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('useSwipe classifies directions', () => {
		const left = vi.fn();
		const props = useSwipe({ onSwipeLeft: left, threshold: 30 });
		props.ontouchstart({ touches: [{ clientX: 100, clientY: 10 }] });
		props.ontouchend({ changedTouches: [{ clientX: 40, clientY: 12 }] });
		expect(left).toHaveBeenCalledTimes(1);
	});

	it('useAnimationFrame loops with stubbed raf', () => {
		let queued = null;
		vi.stubGlobal('requestAnimationFrame', (cb) => (queued = cb, 1));
		vi.stubGlobal('cancelAnimationFrame', () => (queued = null));
		const frames = [];
		const raf = useAnimationFrame((t, d) => frames.push([t, d]));
		raf.start();
		queued(100);
		queued(150);
		expect(frames).toEqual([[100, 0], [150, 50]]);
		raf.stop();
		expect(read(raf.running)).toBe(false);
	});

	it('useInView, useTitle, useLatest, useIsMounted, useElementSize', () => {
		let callback;
		globalThis.IntersectionObserver = class {
			constructor(cb) { callback = cb; }
			observe() {}
			disconnect() {}
		};
		const el = document.createElement('div');
		document.body.append(el);
		const inView = useInView(el);
		callback([{ isIntersecting: true }]);
		expect(read(inView)).toBe(true);
		delete globalThis.IntersectionObserver;

		document.title = 'before';
		const title = useTitle('after');
		expect(document.title).toBe('after');
		title.restore();
		expect(document.title).toBe('before');

		const source = signal(1);
		const latest = useLatest(source);
		source.value = 2;
		expect(read(latest)).toBe(2);

		const [mounted, isMounted, unmount] = useIsMounted();
		expect(isMounted()).toBe(true);
		unmount();
		expect(read(mounted)).toBe(false);
		expect(useElementSize).toBeDefined();
	});
});
