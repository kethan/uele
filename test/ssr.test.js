/**
 * Server-side / no-DOM behaviour: every public entry must import and run
 * in plain Node — no `window`, no `document`. Hooks degrade to inert
 * cells, the router navigates nowhere, and the reactive facade reports
 * missing capabilities instead of crashing.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

describe('reactive facade with no preset installed', () => {
	it('signal() explains what to install; plain writes still land', async () => {
		const { signal, write, isCell } = await import('uele/reactive');
		expect(() => signal(0)).toThrow(/install a preset/);
		expect(isCell({})).toBe(false);
		const box = { value: 1 };
		write(box, 42); // no api.set anywhere: the plain-box fallback writes it
		expect(box.value).toBe(42);
		write({}, 1); // an object with no cell shape at all: silently ignored
	});
});

describe('subscribe-only presets report their capabilities honestly', () => {
	it('computed/effect throw descriptive errors; batch/untracked pass through', async () => {
		const { useRxjs } = await import('uele/adapters/rxjs');
		useRxjs();
		const { signal, read, write, computed, effect, batch, untracked, canEffect, canCompute } = await import('uele/reactive');
		const cell = signal(2);
		write(cell, 3);
		expect(read(cell)).toBe(3);
		expect(canEffect()).toBe(false);
		expect(canCompute()).toBe(false);
		expect(() => computed(() => 1)).toThrow(/subscribe-only/);
		expect(() => effect(() => {})).toThrow(/subscribe-only/);
		expect(batch(() => 'ran')).toBe('ran');
		expect(untracked(() => 'also ran')).toBe('also ran');
	});
});

describe('router without a window', () => {
	it('navigate() is a no-op and useRouter resolves against localhost', async () => {
		const { createRouter, useRouter, navigate } = await import('uele/router');
		expect(() => navigate('/anywhere')).not.toThrow();
		const app = createRouter();
		app.get('/', () => 'home-node');
		const [view, linkProps, go] = useRouter(app, 'initial', 'not-found-node');
		expect(linkProps().onclick).toBeTypeOf('function');
		const result = await go('/');
		expect(result).toBeUndefined(); // navigate() returns the fetch promise chain
		const { read } = await import('uele/reactive');
		expect(read(view)).toBe('home-node');
		await go('/missing');
		expect(read(view)).toBe('not-found-node');
	});
});

describe('hooks without a DOM', () => {
	it('browser hooks degrade to inert state', async () => {
		const { useRxjs } = await import('uele/adapters/rxjs');
		useRxjs();
		const { read } = await import('uele/reactive');
		const hooks = await import('uele/hooks');

		const ws = hooks.useWebSocket('');
		expect(read(ws.status)).toBe('closed');
		expect(ws.send('x')).toBe(false);
		expect(ws.open()).toBeNull();
		ws.close();

		const sse = hooks.useEventSource('');
		expect(read(sse.status)).toBe('closed');
		sse.close();

		const geo = hooks.useGeolocation();
		expect(geo.supported).toBe(false);
		geo.refresh(); // no-op, no throw

		const media = hooks.useMediaQuery('(min-width: 10px)');
		expect(read(media)).toBe(false);

		const size = hooks.useWindowSize();
		expect(read(size)).toEqual({ width: 0, height: 0 });

		expect(read(hooks.useDocumentVisibility())).toBe('visible');
		expect(read(hooks.useWindowFocus())).toBe(true);
		expect(read(hooks.useScrollPosition())).toEqual({ x: 0, y: 0, direction: 'none' });
		expect(read(hooks.useBreakpoint())).toBe('base');

		const lock = hooks.useScrollLock();
		lock.lock();
		expect(read(lock.locked)).toBe(false); // nowhere to apply the lock
		lock.unlock();

		const raf = hooks.useAnimationFrame(() => {});
		raf.start(); // no requestAnimationFrame: stays stopped
		expect(read(raf.running)).toBe(false);
		raf.stop();

		const title = hooks.useTitle('node title');
		title.restore(); // guarded, no document to write to

		const [param, setParam] = hooks.useQueryParam('tab', 'one');
		expect(read(param)).toBe('one');
		setParam('two'); // writes the cell, skips the URL work
		expect(read(param)).toBe('two');

		const [cookie, setCookie] = hooks.useCookie('session', 'abc');
		expect(read(cookie)).toBe('abc');
		setCookie('def');
		expect(read(cookie)).toBe('def');

		const online = hooks.useOnline();
		expect(typeof read(online)).toBe('boolean');
	}, 10000);

	it('timers still run server-side', async () => {
		const { read } = await import('uele/reactive');
		const hooks = await import('uele/hooks');
		const idle = hooks.useIdle(5);
		expect(read(idle)).toBe(false);
		await new Promise((r) => setTimeout(r, 25));
		expect(read(idle)).toBe(true);
	});

	it('storage, null-target and document-guarded hooks take their server branches', async () => {
		const { read } = await import('uele/reactive');
		const hooks = await import('uele/hooks');

		// storage hooks get a null store server-side; the cross-tab listener is a no-op
		const [local, setLocal, removeLocal] = hooks.useLocalStorage('k', 'v0');
		expect(read(local)).toBe('v0');
		setLocal('v1');
		expect(read(local)).toBe('v1');
		removeLocal();
		const [session] = hooks.useSessionStorage('k2', 's0');
		expect(read(session)).toBe('s0');

		// a null target resolves through the no-window side of target resolution
		const off = hooks.useEventListener(null, 'click', () => {});
		expect(typeof off).toBe('function');
		off();

		// focus-trap/fullscreen document guards: activation wires nothing up
		const trap = hooks.useFocusTrap();
		trap.activate({ querySelector: () => null });
		expect(trap.active()).toBe(true);
		trap.deactivate();
		expect(trap.active()).toBe(false);

		const fs = hooks.useFullscreen();
		expect(fs.supported).toBe(false);
		expect(read(fs.fullscreen)).toBe(false);
	});
});

describe('themes without a DOM', () => {
	it('stylesheet renders CSS text and the OS scheme defaults to light', async () => {
		const { stylesheet, prefersColorScheme, createTheme } = await import('uele/themes');
		expect(prefersColorScheme()).toBe('light');
		const css = stylesheet(createTheme({ appearance: 'dark' }), ':root');
		expect(css).toContain(':root {');
		expect(css).toContain('--uele-bg: #0b1220;');
	});
});
