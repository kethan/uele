/**
 * `uele/hooks` — every hook is written once against `uele/reactive` and runs
 * on the active preset (preact signals here; the state hooks are also smoke
 * tested on ulive at the bottom of the file).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h } from 'uele';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { read, write } from 'uele/reactive';
import {
	useSignal, useComputed, useEffect, useId, useToggle, useBoolean, useDisclosure,
	useCounter, useControllable, usePrevious, useAsync, useHistory, useList,
	useDebounce, useDebounceFn, useInterval, useTimeout, useCountdown,
	useLocalStorage, useSessionStorage, useEventListener, useMediaQuery, useOnline,
	useWindowSize, useKeyPress, useHotkey, useClickOutside, useHover, useFocus,
	useClipboard, useIntersectionObserver, useResizeObserver, paginationRange,
	usePagination, useOTP, usePinInput, useForm
} from 'uele/hooks';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	localStorage.clear();
	sessionStorage.clear();
});
afterEach(() => {
	vi.useRealTimers();
});

describe('signal basics', () => {
	it('useSignal / useComputed / useEffect delegate to the preset', () => {
		const count = useSignal(2);
		const doubled = useComputed(() => read(count) * 2);
		expect(read(doubled)).toBe(4);
		let runs = 0;
		const off = useEffect(() => (read(count), runs++));
		write(count, 3);
		expect(read(doubled)).toBe(6);
		expect(runs).toBe(2);
		off();
		write(count, 4);
		expect(runs).toBe(2);
	});

	it('useId is unique and prefixed', () => {
		expect(useId()).not.toBe(useId());
		expect(useId('otp')).toMatch(/^otp-\d+$/);
	});
});

describe('state hooks', () => {
	it('useToggle / useBoolean / useDisclosure', () => {
		const [on, toggle, setOn] = useToggle();
		expect(read(on)).toBe(false);
		toggle();
		expect(read(on)).toBe(true);
		toggle(false);
		expect(read(on)).toBe(false);
		setOn(true);
		expect(read(on)).toBe(true);
		expect(useBoolean).toBe(useToggle);

		const d = useDisclosure();
		expect(read(d.open)).toBe(false);
		d.show();
		expect(read(d.open)).toBe(true);
		d.hide();
		expect(read(d.open)).toBe(false);
		d.toggle();
		expect(read(d.open)).toBe(true);
	});

	it('useCounter clamps and resets', () => {
		const { count, inc, dec, set, reset } = useCounter(1, { min: 0, max: 3, step: 2 });
		inc();
		expect(read(count)).toBe(3);
		inc();
		expect(read(count)).toBe(3);
		dec();
		expect(read(count)).toBe(1);
		set(-5);
		expect(read(count)).toBe(0);
		reset();
		expect(read(count)).toBe(1);
	});

	it('useControllable: uncontrolled owns state, controlled defers, onChange always fires', () => {
		const seen = [];
		const [value, setValue] = useControllable(undefined, 'a', (v) => seen.push(v));
		setValue('b');
		expect(read(value)).toBe('b');
		setValue((v) => v + '!');
		expect(read(value)).toBe('b!');

		const controlled = signal('x');
		const [cValue, cSet] = useControllable(controlled, 'ignored', (v) => seen.push(v));
		expect(read(cValue)).toBe('x');
		cSet('y');
		expect(controlled.value).toBe('y');
		expect(seen).toEqual(['b', 'b!', 'y']);
	});

	it('usePrevious lags one write behind', () => {
		const source = signal(1);
		const [previous] = usePrevious(source);
		expect(read(previous)).toBe(undefined);
		source.value = 2;
		expect(read(previous)).toBe(1);
		source.value = 3;
		expect(read(previous)).toBe(2);
	});

	it('useList performs immutable list operations', () => {
		const { list, push, insert, removeAt, updateAt, clear } = useList([1, 2]);
		push(3);
		expect(read(list)).toEqual([1, 2, 3]);
		insert(0, 0);
		expect(read(list)).toEqual([0, 1, 2, 3]);
		updateAt(1, 9);
		expect(read(list)).toEqual([0, 9, 2, 3]);
		removeAt(0);
		expect(read(list)).toEqual([9, 2, 3]);
		clear();
		expect(read(list)).toEqual([]);
	});

	it('useHistory undoes and redoes', () => {
		const history = useHistory('a');
		history.set('b');
		history.set('c');
		expect(read(history.value)).toBe('c');
		expect(read(history.canUndo)).toBe(true);
		history.undo();
		expect(read(history.value)).toBe('b');
		history.undo();
		history.redo();
		expect(read(history.value)).toBe('b');
		expect(read(history.canRedo)).toBe(true);
		history.set('z');
		expect(read(history.canRedo)).toBe(false);
		history.clear();
		expect(read(history.canUndo)).toBe(false);
	});
});

describe('async and timers', () => {
	it('useAsync tracks data/loading/error and ignores late runs', async () => {
		let resolveSlow;
		const { data, error, loading, run, reset } = useAsync((v) =>
			v === 'slow' ? new Promise((r) => (resolveSlow = () => r('slow'))) : Promise.resolve(v)
		);
		await run('fast');
		expect(read(data)).toBe('fast');
		expect(read(loading)).toBe(false);

		const slow = run('slow');
		const fast = run('quick');
		await fast;
		resolveSlow();
		await slow;
		expect(read(data)).toBe('quick');

		await useAsync(() => Promise.reject(new Error('nope'))).run().catch(() => {});
		const failing = useAsync(() => Promise.reject(new Error('nope')));
		await failing.run();
		expect(read(failing.error).message).toBe('nope');
		reset();
		expect(read(data)).toBe(null);
		expect(read(error)).toBe(null);
	});

	it('useDebounce follows the source after the quiet period', () => {
		vi.useFakeTimers();
		const source = signal('a');
		const [debounced, dispose] = useDebounce(source, 200);
		source.value = 'b';
		source.value = 'c';
		vi.advanceTimersByTime(199);
		expect(read(debounced)).toBe('a');
		vi.advanceTimersByTime(1);
		expect(read(debounced)).toBe('c');
		dispose();
	});

	it('useDebounceFn coalesces, flushes and cancels', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const wrapped = useDebounceFn(fn, 100);
		wrapped(1);
		wrapped(2);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(2);
		wrapped(3);
		wrapped.flush();
		expect(fn).toHaveBeenCalledWith(3);
		wrapped(4);
		wrapped.cancel();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('useInterval and useTimeout start, stop and reset', () => {
		vi.useFakeTimers();
		const tick = vi.fn();
		const interval = useInterval(tick, 100);
		vi.advanceTimersByTime(350);
		expect(tick).toHaveBeenCalledTimes(3);
		interval.stop();
		vi.advanceTimersByTime(200);
		expect(tick).toHaveBeenCalledTimes(3);
		interval.start();
		vi.advanceTimersByTime(100);
		expect(tick).toHaveBeenCalledTimes(4);

		const once = vi.fn();
		const timeout = useTimeout(once, 50);
		vi.advanceTimersByTime(50);
		expect(once).toHaveBeenCalledTimes(1);
		timeout.stop();
	});

	it('useCountdown counts down to onComplete', () => {
		vi.useFakeTimers();
		const done = vi.fn();
		const { count, running, start, pause, reset } = useCountdown(3, { onComplete: done });
		start();
		expect(read(running)).toBe(true);
		vi.advanceTimersByTime(2000);
		expect(read(count)).toBe(1);
		pause();
		vi.advanceTimersByTime(2000);
		expect(read(count)).toBe(1);
		reset(2);
		start();
		vi.advanceTimersByTime(2000);
		expect(read(count)).toBe(0);
		expect(done).toHaveBeenCalledTimes(1);
		expect(read(running)).toBe(false);
	});
});

describe('storage hooks', () => {
	it('useLocalStorage persists JSON and rehydrates', () => {
		const [value, setValue] = useLocalStorage('uele-test', { n: 1 });
		expect(read(value)).toEqual({ n: 1 });
		setValue({ n: 2 });
		expect(JSON.parse(localStorage.getItem('uele-test'))).toEqual({ n: 2 });
		const [again] = useLocalStorage('uele-test', { n: 9 });
		expect(read(again)).toEqual({ n: 2 });
	});

	it('useSessionStorage mirrors the same contract', () => {
		const [value, setValue, remove] = useSessionStorage('k', 'a');
		setValue('b');
		expect(sessionStorage.getItem('k')).toBe('"b"');
		remove();
		expect(sessionStorage.getItem('k')).toBe(null);
		expect(read(value)).toBe(null);
	});
});

describe('DOM and event hooks', () => {
	it('useEventListener attaches and detaches', () => {
		const handler = vi.fn();
		const button = document.createElement('button');
		document.body.append(button);
		const off = useEventListener(button, 'click', handler);
		button.click();
		expect(handler).toHaveBeenCalledTimes(1);
		off();
		button.click();
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('useMediaQuery follows matchMedia (stubbed) and survives its absence', () => {
		const original = window.matchMedia;
		window.matchMedia = (query) => ({
			matches: query.includes('600'),
			addEventListener: () => {},
			removeEventListener: () => {}
		});
		expect(read(useMediaQuery('(min-width: 600px)'))).toBe(true);
		expect(read(useMediaQuery('(min-width: 900px)'))).toBe(false);
		window.matchMedia = original;
		expect(read(useMediaQuery('(min-width: 1px)'))).toBe(false);
	});

	it('useOnline and useWindowSize follow window events', () => {
		const online = useOnline();
		window.dispatchEvent(new Event('offline'));
		expect(read(online)).toBe(false);
		window.dispatchEvent(new Event('online'));
		expect(read(online)).toBe(true);

		const size = useWindowSize();
		window.dispatchEvent(new Event('resize'));
		expect(read(size).width).toBe(window.innerWidth);
	});

	it('useKeyPress and useHotkey match keys and combos', () => {
		const handler = vi.fn();
		const [pressed, off] = useKeyPress('a', handler);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
		expect(read(pressed)).toBe(true);
		expect(handler).toHaveBeenCalledTimes(1);
		window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
		expect(read(pressed)).toBe(false);
		off();

		const hot = vi.fn();
		const offHot = useHotkey('ctrl+k', hot);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
		expect(hot).toHaveBeenCalledTimes(1);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
		expect(hot).toHaveBeenCalledTimes(1);
		offHot();
	});

	it('useClickOutside ignores inside clicks', () => {
		const handler = vi.fn();
		const box = h('div', null, h('span', null, 'in'));
		document.body.append(box);
		const off = useClickOutside(box, handler);
		box.querySelector('span').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(handler).not.toHaveBeenCalled();
		document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(handler).toHaveBeenCalledTimes(1);
		off();
	});

	it('useHover and useFocus bind props drive their cells', () => {
		const [hovered, hoverProps] = useHover();
		const [focused, focusProps] = useFocus();
		const el = h('div', { ...hoverProps, ...focusProps });
		el.dispatchEvent(new MouseEvent('mouseenter'));
		expect(read(hovered)).toBe(true);
		el.dispatchEvent(new MouseEvent('mouseleave'));
		expect(read(hovered)).toBe(false);
		el.dispatchEvent(new Event('focus'));
		expect(read(focused)).toBe(true);
		el.dispatchEvent(new Event('blur'));
		expect(read(focused)).toBe(false);
	});

	it('useClipboard copies and flags transiently', async () => {
		Object.defineProperty(window.navigator, 'clipboard', {
			value: { writeText: vi.fn(() => Promise.resolve()) },
			configurable: true
		});
		const { copied, copy } = useClipboard({ timeout: 20 });
		await copy('hello');
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
		expect(read(copied)).toBe(true);
		await new Promise((r) => setTimeout(r, 30));
		expect(read(copied)).toBe(false);
	});

	it('observer hooks guard missing APIs and react to stubbed entries', () => {
		const io = useIntersectionObserver();
		expect(read(io.visible)).toBe(false);
		io.ref(document.createElement('div')); // no IntersectionObserver in jsdom: must not throw

		let callback;
		globalThis.IntersectionObserver = class {
			constructor(cb) { callback = cb; }
			observe() {}
			disconnect() {}
		};
		const el = document.createElement('div');
		io.ref(el);
		callback([{ isIntersecting: true }]);
		expect(read(io.visible)).toBe(true);
		delete globalThis.IntersectionObserver;

		const ro = useResizeObserver();
		globalThis.ResizeObserver = class {
			constructor(cb) { callback = cb; }
			observe() {}
			disconnect() {}
		};
		ro.ref(el);
		callback([{ contentRect: { width: 10, height: 20 } }]);
		expect(read(ro.size)).toEqual({ width: 10, height: 20 });
		delete globalThis.ResizeObserver;
	});
});

describe('pagination and OTP logic', () => {
	it('paginationRange matches the ui helper', () => {
		expect(paginationRange(3, 3)).toEqual([1, 2, 3]);
		expect(paginationRange(2, 10)).toEqual([1, 2, 3, '…', 10]);
	});

	it('usePagination navigates within bounds', () => {
		const seen = [];
		const p = usePagination({ total: 95, pageSize: 10, onChange: (v) => seen.push(v) });
		expect(read(p.totalPages)).toBe(10);
		expect(read(p.range)).toEqual([1, 2, '…', 10]);
		expect(read(p.canPrev)).toBe(false);
		p.next();
		expect(read(p.page)).toBe(2);
		p.last();
		expect(read(p.page)).toBe(10);
		expect(read(p.canNext)).toBe(false);
		p.goTo(999);
		expect(read(p.page)).toBe(10);
		p.first();
		expect(seen).toEqual([2, 10, 10, 1]);
	});

	it('useOTP fills digits, pastes and completes', () => {
		const done = vi.fn();
		const otp = useOTP(4, { onComplete: done });
		otp.setDigit(0, '1');
		otp.setDigit(1, '2');
		expect(otp.isComplete()).toBe(false);
		otp.setDigit(2, '34');
		expect(otp.code()).toBe('1234');
		expect(otp.isComplete()).toBe(true);
		expect(done).toHaveBeenCalledWith('1234');
		otp.clear();
		expect(otp.code()).toBe('');
		otp.setDigit(0, '9876');
		expect(otp.code()).toBe('9876');
		expect(usePinInput).toBe(useOTP);
	});
});

describe('useForm', () => {
	it('fields, validation, submit and reset', async () => {
		const onSubmit = vi.fn();
		const form = useForm({
			initialValues: { name: '' },
			validate: (v) => (v.name ? {} : { name: 'Required' }),
			onSubmit
		});
		const name = form.field('name');
		expect(read(name)).toBe('');
		expect(form.handleSubmit()).toBe(false);
		expect(read(form.errors).name).toBe('Required');
		expect(form.isValid()).toBe(false);
		expect(onSubmit).not.toHaveBeenCalled();

		write(name, 'Ada');
		await form.handleSubmit();
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' });
		expect(form.isValid()).toBe(true);

		form.setError('name', 'Taken');
		expect(form.isValid()).toBe(false);
		form.reset();
		expect(read(name)).toBe('');
		expect(form.values()).toEqual({ name: '' });
		const reg = form.register('name');
		expect(reg.model).toBe(name);
	});
});

describe('hooks run on another preset (ulive) unchanged', () => {
	it('useCounter + useToggle on ulive cells', async () => {
		(await import('uele/adapters/ulive')).useUlive();
		const { count, inc } = useCounter(5);
		inc();
		expect(read(count)).toBe(6);
		const [on, toggle] = useToggle(true);
		toggle();
		expect(read(on)).toBe(false);
	});
});
