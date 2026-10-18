/**
 * `uele/hooks` browser-API edges, driven with stubbed globals (jsdom has
 * no matchMedia / IntersectionObserver / ResizeObserver / WebSocket /
 * EventSource / geolocation): observer callbacks, realtime transports,
 * focus trap cycling, fullscreen, colour scheme persistence, query
 * params, cookies, touch gestures and animation frames.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { read, write } from 'uele/reactive';
import {
	useMediaQuery, useOnline, useWindowSize, useKeyPress, useHotkey,
	useIntersectionObserver, useResizeObserver, useInView, useWebSocket,
	useEventSource, useBroadcastChannel, useFetch, useGeolocation,
	useDocumentVisibility, useWindowFocus, useScrollPosition, useScrollLock,
	useFocusTrap, useFullscreen, useBreakpoint, useColorScheme, useQueryParam,
	useCookie, useIdle, useLongPress, useSwipe, useAnimationFrame, useTitle
} from 'uele/hooks';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	localStorage.clear();
	window.history.pushState(null, '', '/');
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	delete window.matchMedia;
	delete document.exitFullscreen;
});

/* ------------------------------------------------------------ stub helpers */

const stubMedia = (initialMatches) => {
	const listeners = [];
	const mql = {
		matches: initialMatches,
		addEventListener: (e, fn) => listeners.push(fn),
		removeEventListener: () => {},
		fire: (m) => { mql.matches = m; listeners.forEach((f) => f({ matches: m })); }
	};
	window.matchMedia = () => mql;
	return mql;
};

class FakeIO {
	static last;
	constructor(cb) { this.cb = cb; FakeIO.last = this; }
	observe(el) { this.el = el; }
	disconnect() { this.disconnected = true; }
}
class FakeRO {
	static last;
	constructor(cb) { this.cb = cb; FakeRO.last = this; }
	observe(el) { this.el = el; }
	disconnect() { this.disconnected = true; }
}

/* ------------------------------------------------------------- media/env */

describe('media and environment hooks', () => {
	it('useMediaQuery follows change events on a stubbed mql', () => {
		const mql = stubMedia(true);
		const matches = useMediaQuery('(min-width: 100px)');
		expect(read(matches)).toBe(true);
		mql.fire(false);
		expect(read(matches)).toBe(false);
	});

	it('useOnline, useWindowSize, useDocumentVisibility, useWindowFocus follow their events', () => {
		const online = useOnline();
		window.dispatchEvent(new Event('offline'));
		expect(read(online)).toBe(false);
		window.dispatchEvent(new Event('online'));
		expect(read(online)).toBe(true);

		const size = useWindowSize();
		window.dispatchEvent(new Event('resize'));
		expect(read(size).width).toBe(window.innerWidth);

		const vis = useDocumentVisibility();
		Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
		expect(read(vis)).toBe('hidden');
		Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

		const focused = useWindowFocus();
		window.dispatchEvent(new Event('blur'));
		expect(read(focused)).toBe(false);
		window.dispatchEvent(new Event('focus'));
		expect(read(focused)).toBe(true);
	});

	it('useScrollPosition derives direction from successive scrolls', () => {
		const pos = useScrollPosition();
		const setY = (y) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
		setY(100);
		window.dispatchEvent(new Event('scroll'));
		expect(read(pos)).toEqual({ x: 0, y: 100, direction: 'down' });
		setY(40);
		window.dispatchEvent(new Event('scroll'));
		expect(read(pos).direction).toBe('up');
		window.dispatchEvent(new Event('scroll'));
		expect(read(pos).direction).toBe('none');
		setY(0);
	});

	it('useBreakpoint picks the largest satisfied breakpoint', () => {
		const bp = useBreakpoint({ sm: 10, md: 2000 });
		expect(read(bp)).toBe('sm'); // jsdom innerWidth is 1024
	});
});

/* -------------------------------------------------------------- keyboard */

describe('keyboard hooks', () => {
	it('useKeyPress tracks pressed state case-insensitively and stops after teardown', () => {
		const fn = vi.fn();
		const [pressed, off] = useKeyPress('Enter', fn);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ENTER' }));
		expect(read(pressed)).toBe(true);
		expect(fn).toHaveBeenCalled();
		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
		expect(read(pressed)).toBe(false);
		off();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
		expect(read(pressed)).toBe(false);
	});

	it('useHotkey matches combos, modifiers and aliases, and rejects near-misses', () => {
		const fn = vi.fn();
		const off = useHotkey('ctrl+shift+p', fn);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', ctrlKey: true, shiftKey: true }));
		expect(fn).toHaveBeenCalledTimes(1);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }));
		expect(fn).toHaveBeenCalledTimes(1); // missing shift: no match

		const esc = vi.fn();
		const offEsc = useHotkey('esc', esc);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(esc).toHaveBeenCalledTimes(1);

		const mod = vi.fn();
		const offMod = useHotkey('mod+k', mod);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
		expect(mod).toHaveBeenCalledTimes(1);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
		expect(mod).toHaveBeenCalledTimes(1); // no modifier: no match

		const space = vi.fn();
		const offSpace = useHotkey('space', space);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		expect(space).toHaveBeenCalledTimes(1);
		off();
		offEsc();
		offMod();
		offSpace();
	});
});

/* -------------------------------------------------------------- observers */

describe('observer hooks with stubbed globals', () => {
	it('useIntersectionObserver reports entries, ignores empty ones, disconnects', () => {
		vi.stubGlobal('IntersectionObserver', FakeIO);
		const io = useIntersectionObserver();
		const el = document.createElement('div');
		io.ref(el);
		expect(FakeIO.last.el).toBe(el);
		FakeIO.last.cb([]);
		expect(read(io.visible)).toBe(false); // no first entry: untouched
		FakeIO.last.cb([{ isIntersecting: true }]);
		expect(read(io.visible)).toBe(true);
		expect(read(io.entry).isIntersecting).toBe(true);
		io.disconnect();
		expect(FakeIO.last.disconnected).toBe(true);
		io.ref(null); // tolerated
	});

	it('useResizeObserver reports contentRect and survives empty entry lists', () => {
		vi.stubGlobal('ResizeObserver', FakeRO);
		const ro = useResizeObserver();
		const el = document.createElement('div');
		ro.ref(el);
		FakeRO.last.cb([{ contentRect: { width: 10, height: 20 } }]);
		expect(read(ro.size)).toEqual({ width: 10, height: 20 });
		FakeRO.last.cb([]);
		expect(read(ro.size)).toEqual({ width: 10, height: 20 });
		ro.disconnect();
		expect(FakeRO.last.disconnected).toBe(true);
	});

	it('useInView accepts element, getter and ref targets', () => {
		vi.stubGlobal('IntersectionObserver', FakeIO);
		const el = document.createElement('div');
		for (const target of [el, () => el, { current: el }]) {
			const visible = useInView(target);
			FakeIO.last.cb([{ isIntersecting: true }]);
			expect(read(visible)).toBe(true);
		}
		const idle = useInView();
		expect(read(idle)).toBe(false);
	});
});

/* --------------------------------------------------------------- realtime */

class FakeWebSocket {
	static instances = [];
	constructor(url, protocols) {
		this.url = url;
		this.protocols = protocols;
		this.sent = [];
		FakeWebSocket.instances.push(this);
	}
	send(d) { this.sent.push(d); }
	close() { this.closed = true; }
}
class FakeEventSource {
	static instances = [];
	constructor(url, opts) {
		this.url = url;
		this.opts = opts;
		FakeEventSource.instances.push(this);
	}
	close() { this.closed = true; }
}
class FakeBroadcastChannel {
	static instances = [];
	constructor(name) {
		this.name = name;
		this.posted = [];
		FakeBroadcastChannel.instances.push(this);
	}
	postMessage(d) { this.posted.push(d); }
	close() { this.closed = true; }
}

describe('realtime transports with stubbed globals', () => {
	it('useWebSocket: lifecycle, JSON parsing with raw fallback, send gating', () => {
		FakeWebSocket.instances = [];
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const got = [];
		const ws = useWebSocket('ws://example.test', { protocols: 'chat', onMessage: (d) => got.push(d) });
		const socket = FakeWebSocket.instances[0];
		expect(socket.protocols).toBe('chat');
		expect(read(ws.status)).toBe('connecting');
		expect(ws.send('early')).toBe(false); // not open yet
		socket.onopen();
		expect(read(ws.status)).toBe('open');
		socket.onmessage({ data: '{"a":1}' });
		socket.onmessage({ data: 'plain text' });
		expect(got).toEqual([{ a: 1 }, 'plain text']);
		expect(read(ws.messages)).toEqual([{ a: 1 }, 'plain text']);
		expect(ws.send('hello')).toBe(true);
		expect(ws.send({ b: 2 })).toBe(true);
		expect(socket.sent).toEqual(['hello', '{"b":2}']);
		socket.onerror();
		expect(read(ws.status)).toBe('error');
		socket.onclose();
		expect(read(ws.status)).toBe('closed');
		ws.close();
		expect(ws.socket()).toBeNull();
		expect(ws.send('late')).toBe(false);
	});

	it('useWebSocket with json:false and with no URL', () => {
		FakeWebSocket.instances = [];
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const ws = useWebSocket('ws://x', { json: false });
		const socket = FakeWebSocket.instances[0];
		socket.onopen();
		socket.onmessage({ data: '{"a":1}' });
		expect(read(ws.lastMessage)).toBe('{"a":1}'); // unparsed
		ws.close();
		const idle = useWebSocket('');
		expect(idle.open()).toBeNull();
		expect(read(idle.status)).toBe('closed');
	});

	it('useEventSource: lifecycle, JSON with plain-text fallback, close', () => {
		FakeEventSource.instances = [];
		vi.stubGlobal('EventSource', FakeEventSource);
		const sse = useEventSource('https://example.test/stream', { withCredentials: true });
		const source = FakeEventSource.instances[0];
		expect(source.opts).toEqual({ withCredentials: true });
		expect(read(sse.status)).toBe('connecting');
		source.onopen();
		expect(read(sse.status)).toBe('open');
		source.onmessage({ data: '{"n":1}' });
		source.onmessage({ data: 'hello' });
		expect(read(sse.messages)).toEqual([{ n: 1 }, 'hello']);
		source.onerror();
		expect(read(sse.status)).toBe('error');
		sse.close();
		expect(source.closed).toBe(true);
		expect(read(sse.status)).toBe('closed');
		const idle = useEventSource('');
		expect(read(idle.status)).toBe('closed');
	});

	it('useBroadcastChannel: post, receive, close; unsupported without the global', () => {
		FakeBroadcastChannel.instances = [];
		vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
		const got = [];
		const bc = useBroadcastChannel('tab-sync', { onMessage: (d) => got.push(d) });
		expect(bc.supported).toBe(true);
		const channel = FakeBroadcastChannel.instances[0];
		expect(bc.post({ type: 'ping' })).toBe(true);
		expect(channel.posted).toEqual([{ type: 'ping' }]);
		channel.onmessage({ data: 'pong' });
		expect(got).toEqual(['pong']);
		expect(read(bc.lastMessage)).toBe('pong');
		bc.close();
		expect(channel.closed).toBe(true);

		vi.stubGlobal('BroadcastChannel', undefined);
		const nope = useBroadcastChannel('tab-sync');
		expect(nope.supported).toBe(false);
		expect(nope.post('x')).toBe(false);
	});
});

/* ------------------------------------------------------------------ fetch */

describe('useFetch with a stubbed fetch', () => {
	it('parses JSON, falls back to text, and surfaces HTTP errors', async () => {
		const jsonRes = { ok: true, status: 200, headers: { get: () => 'application/json; charset=utf-8' }, json: async () => ({ a: 1 }), text: async () => '{"a":1}' };
		vi.stubGlobal('fetch', vi.fn(async () => jsonRes));
		const f = useFetch('https://api.test/data');
		await f.run();
		expect(read(f.data)).toEqual({ a: 1 });

		const textRes = { ok: true, status: 200, headers: { get: () => 'text/plain' }, json: async () => ({}), text: async () => 'hello' };
		vi.stubGlobal('fetch', vi.fn(async () => textRes));
		await f.run('https://api.test/other'); // explicit target overrides the hook URL
		expect(read(f.data)).toBe('hello');

		const badRes = { ok: false, status: 500, headers: { get: () => '' }, json: async () => ({}), text: async () => '' };
		vi.stubGlobal('fetch', vi.fn(async () => badRes));
		await f.run();
		expect(read(f.error).message).toBe('fetch failed: 500');
		expect(() => f.abort()).not.toThrow();
	});
});

/* --------------------------------------------------------- browser states */

describe('browser state hooks', () => {
	it('useGeolocation resolves success and error through a stubbed API', async () => {
		const position = { coords: { latitude: 1, longitude: 2 } };
		Object.defineProperty(window.navigator, 'geolocation', {
			configurable: true,
			value: { getCurrentPosition: (ok) => ok(position) }
		});
		const geo = useGeolocation({ immediate: true });
		expect(geo.supported).toBe(true);
		expect(read(geo.position)).toBe(position);
		expect(read(geo.loading)).toBe(false);

		Object.defineProperty(window.navigator, 'geolocation', {
			configurable: true,
			value: { getCurrentPosition: (ok, err) => err(new Error('denied')) }
		});
		const geo2 = useGeolocation();
		geo2.refresh();
		expect(read(geo2.error).message).toBe('denied');
		delete window.navigator.geolocation;
	});

	it('useScrollLock reference-counts and restores the previous overflow', () => {
		document.body.style.overflow = 'auto';
		const lock = useScrollLock();
		lock.lock();
		lock.lock();
		expect(read(lock.locked)).toBe(true);
		expect(document.body.style.overflow).toBe('hidden');
		lock.unlock();
		expect(read(lock.locked)).toBe(true); // still one holder
		lock.unlock();
		expect(read(lock.locked)).toBe(false);
		expect(document.body.style.overflow).toBe('auto');
		lock.unlock(); // extra unlock is clamped
		expect(read(lock.locked)).toBe(false);
	});

	it('useFocusTrap cycles Tab and Shift+Tab, ignores other keys and empty containers', () => {
		const box = document.createElement('div');
		box.innerHTML = '<button>one</button><button>two</button><button>three</button>';
		document.body.append(box);
		const [b1, b2, b3] = box.querySelectorAll('button');
		const trap = useFocusTrap();
		trap.ref(box);
		expect(trap.active()).toBe(true);
		expect(document.activeElement).toBe(b1); // activate focuses the first

		b3.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		expect(document.activeElement).toBe(b1); // wrapped forward
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
		expect(document.activeElement).toBe(b3); // wrapped backward
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
		expect(document.activeElement).toBe(b3); // untouched

		const empty = document.createElement('div');
		document.body.append(empty);
		const trap2 = useFocusTrap();
		trap2.ref(empty);
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); // no focusables: no crash
		trap2.deactivate();
		expect(trap2.active()).toBe(false);

		const trap3 = useFocusTrap();
		trap3.activate(); // no container yet: no-op
		expect(trap3.active()).toBe(false);
		trap3.ref(null);
		trap.deactivate();
	});

	it('useFullscreen enters/exits through stubs and syncs on fullscreenchange', () => {
		const el = document.createElement('div');
		el.requestFullscreen = vi.fn();
		document.exitFullscreen = vi.fn();
		const fs = useFullscreen(el);
		expect(fs.supported).toBe(false); // jsdom documentElement has no requestFullscreen
		fs.enter();
		expect(el.requestFullscreen).toHaveBeenCalled();
		fs.toggle(); // not fullscreen: enters again
		expect(el.requestFullscreen).toHaveBeenCalledTimes(2);
		Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
		document.dispatchEvent(new Event('fullscreenchange'));
		expect(read(fs.fullscreen)).toBe(true);
		fs.toggle(); // now exits
		expect(document.exitFullscreen).toHaveBeenCalled();
		Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
		document.dispatchEvent(new Event('fullscreenchange'));
		expect(read(fs.fullscreen)).toBe(false);
	});

	it('useIdle flips after inactivity and resets on activity', () => {
		vi.useFakeTimers();
		const idle = useIdle(1000);
		vi.advanceTimersByTime(500);
		window.dispatchEvent(new Event('mousemove'));
		vi.advanceTimersByTime(999);
		expect(read(idle)).toBe(false);
		vi.advanceTimersByTime(1);
		expect(read(idle)).toBe(true);
	});
});

/* ------------------------------------------------------- scheme/url/cookie */

describe('useColorScheme', () => {
	it('follows the OS when nothing is stored; a stored value wins and sticks', () => {
		const mql = stubMedia(true); // OS dark
		const cs = useColorScheme();
		expect(read(cs.scheme)).toBe('dark');
		cs.setScheme('light');
		expect(localStorage.getItem('uele-scheme')).toBe('light');
		mql.fire(false); // OS flips light: stored override wins, no change
		expect(read(cs.scheme)).toBe('light');
	});

	it('persists via setScheme (including updater form); persist:false stays in memory', () => {
		stubMedia(false);
		const cs = useColorScheme({ initial: 'light' });
		cs.setScheme((s) => (s === 'light' ? 'dark' : 'light'));
		expect(read(cs.dark)).toBe(true);
		expect(localStorage.getItem('uele-scheme')).toBe('dark');
		cs.toggle();
		expect(read(cs.scheme)).toBe('light');

		const mem = useColorScheme({ persist: false, key: 'other', initial: 'light' });
		mem.setScheme('dark');
		expect(localStorage.getItem('other')).toBeNull();
	});

	it('survives a throwing localStorage (private mode)', () => {
		stubMedia(false);
		const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('nope'); });
		const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('nope'); });
		const cs = useColorScheme();
		expect(read(cs.scheme)).toBe('light'); // fell back to the OS value
		expect(() => cs.setScheme('dark')).not.toThrow();
		expect(read(cs.scheme)).toBe('dark');
		get.mockRestore();
		set.mockRestore();
	});
});

describe('useQueryParam and useCookie', () => {
	it('query param: initial from URL, set/delete round-trip, popstate syncs', () => {
		window.history.pushState(null, '', '/?tab=init&x=1');
		const [value, setValue] = useQueryParam('tab', 'fallback');
		expect(read(value)).toBe('init');
		setValue('next');
		expect(new URL(window.location.href).searchParams.get('tab')).toBe('next');
		setValue((v) => v + '!');
		expect(read(value)).toBe('next!');
		setValue('');
		expect(new URL(window.location.href).searchParams.has('tab')).toBe(false);
		window.history.pushState(null, '', '/?tab=from-history');
		window.dispatchEvent(new PopStateEvent('popstate'));
		expect(read(value)).toBe('from-history');
		setValue(null);
		expect(read(value)).toBeNull();
	});

	it('cookie: reads an existing value (with = inside), writes, deletes', () => {
		document.cookie = 'session=abc==; path=/';
		const [value, setValue] = useCookie('session', 'none');
		expect(read(value)).toBe('abc==');
		setValue('xyz');
		expect(read(value)).toBe('xyz');
		expect(document.cookie).toContain('session=xyz');
		setValue((v) => v + '2');
		expect(document.cookie).toContain('session=xyz2');
		setValue(null);
		expect(read(value)).toBe('');
		const fresh = useCookie('missing', 'defaulted');
		expect(read(fresh[0])).toBe('defaulted');
	});
});

/* -------------------------------------------------------------- gestures */

describe('touch and press hooks', () => {
	it('useLongPress fires after the delay and cancels on release (mouse and touch)', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const props = useLongPress(fn, 200);
		props.onmousedown();
		vi.advanceTimersByTime(199);
		props.onmouseup();
		vi.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
		props.ontouchstart();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
		props.ontouchend();
		props.onmouseleave();
	});

	it('useSwipe routes by dominant axis and ignores short or unstarted gestures', () => {
		const handlers = { onSwipeRight: vi.fn(), onSwipeLeft: vi.fn(), onSwipeDown: vi.fn(), onSwipeUp: vi.fn() };
		const props = useSwipe({ threshold: 40, ...handlers });
		const end = (x, y) => props.ontouchend({ changedTouches: [{ clientX: x, clientY: y }] });
		props.ontouchend({ changedTouches: [{ clientX: 0, clientY: 0 }] }); // no start: ignored
		props.ontouchstart({ touches: [{ clientX: 0, clientY: 0 }] });
		end(100, 10);
		expect(handlers.onSwipeRight).toHaveBeenCalledWith({ dx: 100, dy: 10 });
		props.ontouchstart({ touches: [{ clientX: 100, clientY: 0 }] });
		end(0, 5);
		expect(handlers.onSwipeLeft).toHaveBeenCalled();
		props.ontouchstart({ touches: [{ clientX: 0, clientY: 0 }] });
		end(5, 90);
		expect(handlers.onSwipeDown).toHaveBeenCalled();
		props.ontouchstart({ touches: [{ clientX: 0, clientY: 90 }] });
		end(5, 0);
		expect(handlers.onSwipeUp).toHaveBeenCalled();
		props.ontouchstart({ touches: [{ clientX: 0, clientY: 0 }] });
		end(10, 10); // below threshold
		expect(handlers.onSwipeRight).toHaveBeenCalledTimes(1);
	});

	it('useAnimationFrame loops with deltas through a stubbed rAF and stops cleanly', () => {
		let callback;
		vi.stubGlobal('requestAnimationFrame', (fn) => { callback = fn; return 7; });
		const cancel = vi.fn();
		vi.stubGlobal('cancelAnimationFrame', cancel);
		const frames = [];
		const raf = useAnimationFrame((time, delta) => frames.push([time, delta]));
		raf.start();
		raf.start(); // already running: no double loop
		callback(100);
		callback(250);
		expect(frames).toEqual([[100, 0], [250, 150]]);
		raf.stop();
		expect(cancel).toHaveBeenCalledWith(7);
		expect(read(raf.running)).toBe(false);
	});

	it('useTitle follows a cell and renders null as empty', async () => {
		const { signal } = await import('@preact/signals-core');
		const title = signal('First');
		useTitle(title);
		expect(document.title).toBe('First');
		write(title, 'Second');
		await tick();
		expect(document.title).toBe('Second');
		useTitle(null);
		expect(document.title).toBe('');
	});
});

/* -------------------------------------------------- coverage mop-up batch */

describe('mop-up: getters, mismatched keys, mid-list Tab, stopped rAF', () => {
	it('useEventSource/useWebSocket expose their live instances', () => {
		FakeEventSource.instances = [];
		vi.stubGlobal('EventSource', FakeEventSource);
		const sse = useEventSource('https://api.test/feed');
		expect(sse.source()).toBe(FakeEventSource.instances[0]);

		FakeWebSocket.instances = [];
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const ws = useWebSocket('ws://example.test');
		expect(ws.socket()).toBe(FakeWebSocket.instances[0]);
	});

	it('useKeyPress/useHotkey ignore non-matching keys', () => {
		const fn = vi.fn();
		const [pressed, off] = useKeyPress('k', fn);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); // not the wanted key
		expect(read(pressed)).toBe(false);
		expect(fn).not.toHaveBeenCalled();
		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' }));
		expect(read(pressed)).toBe(false);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
		expect(read(pressed)).toBe(true);
		off();
	});

	it('useHotkey fires on alt-modified combos', () => {
		const fn = vi.fn();
		const off = useHotkey('alt+k', fn);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' })); // missing alt
		expect(fn).not.toHaveBeenCalled();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', altKey: true }));
		expect(fn).toHaveBeenCalledTimes(1);
		off();
	});

	it('useFocusTrap leaves mid-list Tab alone', () => {
		const box = document.createElement('div');
		box.innerHTML = '<button>one</button><button>two</button><button>three</button>';
		document.body.append(box);
		const [b1, b2] = box.querySelectorAll('button');
		const trap = useFocusTrap();
		trap.ref(box);
		b2.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })); // not on last: untouched
		expect(document.activeElement).toBe(b2);
		trap.deactivate();
	});

	it('useAnimationFrame loop does not reschedule after stop', () => {
		let callback;
		vi.stubGlobal('requestAnimationFrame', (fn) => { callback = fn; return 9; });
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		const frames = [];
		const raf = useAnimationFrame((t) => frames.push(t));
		raf.start();
		callback(50); // runs the loop once, reschedules
		expect(frames).toEqual([50]);
		raf.stop();
		const pending = callback;
		callback(100); // stale frame fires after stop: it runs once but must not reschedule
		expect(frames).toEqual([50, 100]);
		expect(callback).toBe(pending);
	});
});

describe('mop-up: environment fallbacks', () => {
	it('useOnline assumes online when navigator itself is absent', () => {
		vi.stubGlobal('navigator', undefined);
		expect(read(useOnline())).toBe(true);
	});

	it('visibility/focus hooks fall back when the document APIs are empty', () => {
		Object.defineProperty(document, 'visibilityState', { value: '', configurable: true });
		expect(read(useDocumentVisibility())).toBe('visible'); // '' falls back
		delete document.visibilityState;
		Object.defineProperty(document, 'hasFocus', { value: undefined, configurable: true });
		expect(read(useWindowFocus())).toBe(true); // missing hasFocus falls back to true
		delete document.hasFocus;
	});
});

describe('mop-up: color scheme edges', () => {
	it('persist:false reads no stored value and follows OS changes', () => {
		const mql = stubMedia(false); // OS light
		const cs = useColorScheme({ persist: false, key: 'mop', initial: 'light' });
		expect(read(cs.scheme)).toBe('light');
		mql.fire(true); // OS flips dark: nothing stored, so scheme follows
		expect(read(cs.scheme)).toBe('dark');
		cs.toggle(); // toggling from dark yields light
		expect(read(cs.scheme)).toBe('light');
	});

	it('a throwing matchMedia degrades to light', () => {
		vi.stubGlobal('matchMedia', () => { throw new Error('unsupported'); });
		const cs = useColorScheme({ persist: false });
		expect(read(cs.scheme)).toBe('light');
	});
});

describe('mop-up: fetch options, abort-less environments, scheme toggle, absent param', () => {
	it('useFetch merges hook-level options into every run; missing content-type reads as text', async () => {
		const seen = [];
		vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
			seen.push([url, opts]);
			return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}), text: async () => 'plain' };
		}));
		const f = useFetch('https://api.test/base', { headers: { 'x-app': 'uele' } });
		await f.run();
		expect(read(f.data)).toBe('plain'); // null content-type falls back to text
		expect(seen[0][1].headers).toEqual({ 'x-app': 'uele' }); // hook options actually sent
		await f.run('https://api.test/other', { headers: { 'x-run': '1' } });
		expect(seen[1][1].headers).toEqual({ 'x-run': '1' }); // per-run opts win
	});

	it('useFetch runs without an AbortController global', async () => {
		vi.stubGlobal('AbortController', undefined);
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => 42, text: async () => '42' })));
		const f = useFetch('https://api.test/x');
		await f.run();
		expect(read(f.data)).toBe(42);
		expect(() => f.abort()).not.toThrow();
	});

	it('toggling from light yields dark; an absent query param yields its initial', () => {
		stubMedia(false); // OS light
		const cs = useColorScheme({ persist: false, initial: 'light' });
		cs.toggle();
		expect(read(cs.scheme)).toBe('dark');

		const [missing] = useQueryParam('absent', 'fb'); // not in the URL
		expect(read(missing)).toBe('fb');
	});
});

describe('mop-up: throwing platform parsers', () => {
	it('useQueryParam falls back to initial when URLSearchParams throws', () => {
		vi.stubGlobal('URLSearchParams', class { constructor() { throw new Error('nope'); } });
		const [value] = useQueryParam('tab', 'fallback');
		expect(read(value)).toBe('fallback');
	});

	it('useCookie falls back to initial when document.cookie throws', () => {
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get() { throw new Error('blocked'); }
		});
		const [value] = useCookie('session', 'anon');
		expect(read(value)).toBe('anon');
		delete document.cookie;
	});
});

