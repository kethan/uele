/**
 * `uele/hooks` edges (state, async, DOM-event and form hooks): controlled
 * plain values, stale async runs, timer guards, storage corruption and
 * cross-tab events, target shapes (getter / ref / non-element), pagination
 * on a subscribe-only preset, OTP overflow, and form submit paths.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { read, write } from 'uele/reactive';
import { useRxjs } from 'uele/adapters/rxjs';
import { Subject } from 'rxjs';
import {
	useToggle, useDisclosure, useCounter, useControllable, usePrevious, useAsync,
	useHistory, useList, useDebounceFn, useInterval, useTimeout, useCountdown,
	useLocalStorage, useSessionStorage, useEventListener, useClickOutside,
	usePagination, useOTP, useForm, useStopwatch, useNow, useThrottleFn,
	useLatest, useIsMounted, useId, useHover, useFocus, useResizeObserver,
	useThrottle, useTitle, paginationRange
} from 'uele/hooks';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	localStorage.clear();
	sessionStorage.clear();
	window.history.pushState(null, '', '/');
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

/* ------------------------------------------------------------ state hooks */

describe('state hook edges', () => {
	it('useControllable with a plain (non-cell) controlled value', () => {
		const seen = [];
		const [cell, setValue] = useControllable('fixed', 'init', (v) => seen.push(v));
		expect(read(cell)).toBe('fixed'); // plain value lands in the owned cell
		setValue((current) => {
			expect(current).toBe('fixed'); // updater receives the plain value
			return 'next';
		});
		expect(seen).toEqual(['next']);
		const [, setNull] = useControllable(null, 'seed');
		setNull('grown'); // null means uncontrolled
	});

	it('useCounter clamps to min/max and resets', () => {
		const c = useCounter(5, { min: 0, max: 10, step: 2 });
		c.inc(100);
		expect(read(c.count)).toBe(10);
		c.dec(100);
		expect(read(c.count)).toBe(0);
		c.set((v) => v + 3);
		expect(read(c.count)).toBe(3);
		c.reset();
		expect(read(c.count)).toBe(5);
	});

	it('useToggle accepts an explicit boolean; useDisclosure wraps it', () => {
		const [on, toggle] = useToggle(false);
		toggle(true);
		expect(read(on)).toBe(true);
		toggle(false);
		expect(read(on)).toBe(false);
		const d = useDisclosure(false);
		d.show();
		expect(read(d.open)).toBe(true);
		d.hide();
		expect(read(d.open)).toBe(false);
		d.onOpenChange(true);
		expect(read(d.open)).toBe(true);
	});

	it('useId is prefixed and unique; useHover/useFocus bind props flip their cells', () => {
		expect(useId('otp')).toMatch(/^otp-\d+$/);
		expect(useId()).not.toBe(useId());
		const [hovered, hoverProps] = useHover();
		hoverProps.onmouseenter();
		expect(read(hovered)).toBe(true);
		hoverProps.onmouseleave();
		expect(read(hovered)).toBe(false);
		const [focused, focusProps] = useFocus();
		focusProps.onfocus();
		expect(read(focused)).toBe(true);
		focusProps.onblur();
		expect(read(focused)).toBe(false);
	});

	it('usePrevious lags one commit and stops after disposal', () => {
		const source = signal('a');
		const [previous, off] = usePrevious(source);
		write(source, 'b');
		expect(read(previous)).toBe('a');
		write(source, 'c');
		expect(read(previous)).toBe('b');
		off();
		write(source, 'd');
		expect(read(previous)).toBe('b');
	});

	it('useLatest mirrors the source; useIsMounted flips on unmount', () => {
		const source = signal(1);
		const latest = useLatest(source);
		write(source, 2);
		expect(read(latest)).toBe(2);
		const [mounted, isMounted, unmount] = useIsMounted();
		expect(isMounted()).toBe(true);
		unmount();
		expect(read(mounted)).toBe(false);
	});
});

/* ------------------------------------------------------------ async hooks */

describe('useAsync edges', () => {
	it('a stale run never overwrites a newer one; reset restores initial state', async () => {
		const resolvers = [];
		const a = useAsync(() => new Promise((r) => resolvers.push(r)), { initialData: 'init' });
		const first = a.run();
		const second = a.run();
		await tick(); // run() invokes fn on a microtask: both resolvers exist now
		resolvers[1]('new');
		await second;
		expect(read(a.data)).toBe('new');
		resolvers[0]('stale');
		await first;
		expect(read(a.data)).toBe('new'); // untouched by the late resolution
		a.reset();
		expect(read(a.data)).toBe('init');
		expect(read(a.loading)).toBe(false);
		expect(read(a.error)).toBeNull();
	});

	it('rejections land in error and clear loading', async () => {
		const a = useAsync(async () => { throw new Error('nope'); });
		await a.run();
		expect(read(a.error).message).toBe('nope');
		expect(read(a.loading)).toBe(false);
	});
});

/* ---------------------------------------------------------- history / list */

describe('useHistory and useList remaining paths', () => {
	it('clear() empties both stacks; redo on an empty stack is a no-op', () => {
		const h = useHistory('a');
		h.redo(); // nothing to redo
		expect(read(h.value)).toBe('a');
		h.set('b');
		h.undo();
		expect(read(h.canRedo)).toBe(true);
		h.clear();
		expect(h.past()).toEqual([]);
		expect(h.future()).toEqual([]);
		expect(read(h.canUndo)).toBe(false);
	});

	it('useList insert, updateAt (value and updater), set with an updater', () => {
		const l = useList([1, 3]);
		l.insert(1, 2);
		expect(read(l.list)).toEqual([1, 2, 3]);
		l.updateAt(0, 10);
		l.updateAt(1, (v) => v * 10);
		expect(read(l.list)).toEqual([10, 20, 3]);
		l.set((current) => [...current, 4]);
		expect(read(l.list)).toEqual([10, 20, 3, 4]);
		l.removeAt(0);
		l.clear();
		expect(read(l.list)).toEqual([]);
	});
});

/* --------------------------------------------------------------- timers */

describe('timer hook guards', () => {
	it('useInterval/useTimeout: stop, reset, active, and null delay never auto-starts', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const iv = useInterval(fn, 100);
		expect(iv.active()).toBe(true);
		iv.stop();
		expect(iv.active()).toBe(false);
		vi.advanceTimersByTime(500);
		expect(fn).not.toHaveBeenCalled();
		iv.reset();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		iv.stop(); // keep the restarted interval out of the timeout assertions below
		const idle = useInterval(fn, null);
		expect(idle.active()).toBe(false);

		const to = useTimeout(fn, 50);
		to.stop();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		const idleTo = useTimeout(fn, null);
		expect(idleTo.active()).toBe(false);
		idleTo.start(); // explicit start with null delay still does not schedule
		expect(idleTo.active()).toBe(false);
	});

	it('useCountdown: double start is ignored, pause halts, reset re-seeds, completion fires once', () => {
		vi.useFakeTimers();
		const done = vi.fn();
		const c = useCountdown(3, { onComplete: done });
		c.start();
		c.start(); // guard: already running
		vi.advanceTimersByTime(1000);
		expect(read(c.count)).toBe(2);
		c.pause();
		vi.advanceTimersByTime(3000);
		expect(read(c.count)).toBe(2);
		c.reset(5);
		expect(read(c.count)).toBe(5);
		c.start();
		vi.advanceTimersByTime(5000);
		expect(read(c.count)).toBe(0);
		expect(done).toHaveBeenCalledTimes(1);
		expect(read(c.running)).toBe(false);
	});

	it('useDebounceFn flush with nothing pending is a no-op; cancel drops the call', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const wrapped = useDebounceFn(fn, 100);
		wrapped.flush();
		expect(fn).not.toHaveBeenCalled();
		wrapped('a');
		wrapped.cancel();
		vi.advanceTimersByTime(200);
		expect(fn).not.toHaveBeenCalled();
		wrapped('b');
		wrapped.flush();
		expect(fn).toHaveBeenCalledWith('b');
	});

	it('useThrottleFn trailing call fires with the latest args; cancel drops it', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const wrapped = useThrottleFn(fn, 100);
		wrapped('first'); // leading edge
		wrapped('second'); // trailing, scheduled
		expect(fn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledWith('second');
		wrapped('third');
		wrapped.cancel();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('useStopwatch: start guard, laps, pause and reset', () => {
		vi.useFakeTimers();
		const sw = useStopwatch();
		sw.start();
		sw.start(); // already running: ignored
		vi.advanceTimersByTime(2000);
		expect(read(sw.elapsed)).toBe(2);
		expect(sw.lap()).toEqual([2]);
		vi.advanceTimersByTime(1000);
		expect(sw.lap()).toEqual([2, 3]);
		expect(sw.laps()).toEqual([2, 3]);
		sw.pause();
		vi.advanceTimersByTime(5000);
		expect(read(sw.elapsed)).toBe(3);
		sw.reset();
		expect(read(sw.elapsed)).toBe(0);
		expect(sw.laps()).toEqual([]);
	});

	it('useNow with a null interval never ticks, and its stop is safe', () => {
		const [now, stop] = useNow(null);
		expect(read(now)).toBeInstanceOf(Date);
		expect(stop()).toBe(false);
	});
});

/* --------------------------------------------------------------- storage */

describe('storage hook edges', () => {
	it('corrupt stored JSON falls back to the initial value', () => {
		localStorage.setItem('broken', '{not json');
		const [value] = useLocalStorage('broken', 'fallback');
		expect(read(value)).toBe('fallback');
	});

	it('setValue(null) removes the key; storage events sync across tabs', () => {
		const [value, setValue, remove] = useLocalStorage('k', 'init');
		setValue('saved');
		expect(localStorage.getItem('k')).toBe('"saved"');
		window.dispatchEvent(new StorageEvent('storage', { key: 'k', newValue: '"from-other-tab"' }));
		expect(read(value)).toBe('from-other-tab');
		window.dispatchEvent(new StorageEvent('storage', { key: 'k', newValue: null }));
		expect(read(value)).toBe('init');
		window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '"x"' }));
		expect(read(value)).toBe('init'); // unrelated keys ignored
		remove();
		expect(localStorage.getItem('k')).toBeNull();
		expect(read(value)).toBeNull();
	});

	it('sessionStorage round-trips through the same hook shape', () => {
		const [value, setValue] = useSessionStorage('s', 1);
		setValue((n) => n + 1);
		expect(read(value)).toBe(2);
		expect(sessionStorage.getItem('s')).toBe('2');
	});
});

/* ------------------------------------------------------------ DOM targets */

describe('event target shapes', () => {
	it('useEventListener accepts getters, refs, non-elements and null (window)', () => {
		const el = document.createElement('button');
		document.body.append(el);
		const seen = [];
		const offGetter = useEventListener(() => el, 'click', () => seen.push('getter'));
		const offRef = useEventListener({ current: el }, 'click', () => seen.push('ref'));
		el.click();
		expect(seen).toEqual(['getter', 'ref']);
		offGetter();
		offRef();
		el.click();
		expect(seen).toEqual(['getter', 'ref']);

		const offBad = useEventListener({ noListener: true }, 'click', () => seen.push('bad'));
		expect(() => offBad()).not.toThrow();

		const offWindow = useEventListener(null, 'resize', () => seen.push('window'));
		window.dispatchEvent(new Event('resize'));
		expect(seen).toContain('window');
		offWindow();
	});

	it('useClickOutside ignores inside clicks and stops after teardown', () => {
		const box = document.createElement('div');
		const inner = document.createElement('span');
		box.append(inner);
		document.body.append(box);
		const fn = vi.fn();
		const off = useClickOutside(box, fn);
		inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(fn).not.toHaveBeenCalled();
		document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(fn).toHaveBeenCalledTimes(1);
		off();
		document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(fn).toHaveBeenCalledTimes(1);
	});
});

/* ---------------------------------------------------- pagination and OTP */

describe('usePagination on a subscribe-only preset (thunk derivations)', () => {
	it('derived values are callable thunks and goTo clamps and floors', () => {
		useRxjs();
		const p = usePagination({ total: 95, pageSize: 10 });
		expect(p.totalPages()).toBe(10);
		expect(p.canNext()).toBe(true);
		expect(p.range()).toContain(1);
		p.goTo(0);
		expect(read(p.page)).toBe(1);
		p.goTo(999);
		expect(read(p.page)).toBe(10);
		expect(p.canNext()).toBe(false);
		p.goTo(2.9);
		expect(read(p.page)).toBe(2);
		p.prev();
		expect(read(p.page)).toBe(1);
		expect(p.canPrev()).toBe(false);
		p.last();
		expect(read(p.page)).toBe(10);
		p.first();
		expect(read(p.page)).toBe(1);
	});
});

describe('useOTP edges', () => {
	it('non-digits clear a box, overflow paste is clipped, clear resets', () => {
		const done = vi.fn();
		const otp = useOTP(3, { onComplete: done });
		otp.setDigit(0, 'x');
		expect(otp.code()).toBe('');
		otp.setDigit(2, '45'); // only one box left: the 5 is clipped
		expect(read(otp.digits[2])).toBe('4');
		expect(otp.isComplete()).toBe(false);
		otp.setDigit(0, '12');
		expect(otp.code()).toBe('124');
		expect(done).toHaveBeenCalledWith('124');
		expect(otp.isComplete()).toBe(true);
		otp.clear();
		expect(otp.code()).toBe('');
	});
});

/* ------------------------------------------------------------------ forms */

describe('useForm remaining paths', () => {
	it('register blur marks touched; setError drives isValid; reset accepts new values', () => {
		const form = useForm({ initialValues: { name: '' } });
		const reg = form.register('name');
		expect(reg.name).toBe('name');
		reg.onblur();
		expect(read(form.touched)).toEqual({ name: true });
		form.setError('name', 'Required');
		expect(form.isValid()).toBe(false);
		form.setValue('name', 'Ada');
		expect(form.values()).toEqual({ name: 'Ada' });
		form.reset({ name: 'Grace' });
		expect(form.values()).toEqual({ name: 'Grace' });
		expect(read(form.errors)).toEqual({});
	});

	it('handleSubmit without an event validates and toggles submitting around onSubmit', async () => {
		const submit = vi.fn(async (values) => values);
		const form = useForm({
			initialValues: { name: '' },
			validate: (v) => (v.name ? {} : { name: 'Required' }),
			onSubmit: submit
		});
		form.field('name');
		expect(form.handleSubmit()).toBe(false); // invalid: no submit
		expect(submit).not.toHaveBeenCalled();
		expect(read(form.touched)).toEqual({ name: true });
		form.setValue('name', 'Ada');
		const pending = form.handleSubmit();
		expect(read(form.submitting)).toBe(true);
		await pending;
		expect(read(form.submitting)).toBe(false);
		expect(submit).toHaveBeenCalledWith({ name: 'Ada' });
		expect(form.validate()).toEqual({});
	});
});

/* -------------------------------------------------- coverage mop-up batch */

describe('mop-up: immediate async, updater forms, null-delay start', () => {
	it('useAsync with immediate:true runs on creation', async () => {
		const a = useAsync(async () => 'ready', { immediate: true });
		await tick(); await tick();
		expect(read(a.data)).toBe('ready');
		expect(read(a.loading)).toBe(false);
	});

	it('useHistory.set accepts an updater; useList.set accepts a plain array', () => {
		const hst = useHistory('a');
		hst.set((v) => `${v}b`);
		expect(read(hst.value)).toBe('ab');
		const l = useList([1]);
		l.set([7, 8]); // plain (non-function) set: the alternate branch
		expect(read(l.list)).toEqual([7, 8]);
	});

	it('useInterval start() with a null delay stays inactive', () => {
		vi.useFakeTimers();
		try {
			const fn = vi.fn();
			const idle = useInterval(fn, null);
			idle.start(); // start() re-checks the null delay and stays stopped
			expect(idle.active()).toBe(false);
			vi.advanceTimersByTime(1000);
			expect(fn).not.toHaveBeenCalled();
		} finally { vi.useRealTimers(); }
	});
});

describe('mop-up: pagination math and OTP null digit', () => {
	it('paginationRange clamps zero/NaN and windows both sides', () => {
		expect(paginationRange(3, 0)).toEqual([1]); // totalPages 0 falls back to 1
		expect(paginationRange(0, 5)).toEqual([1, 2, 3, 4, 5]); // page 0 clamps to 1
		expect(paginationRange(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
		expect(paginationRange(1, 20)).toEqual([1, 2, '…', 20]);
		expect(paginationRange(20, 20)).toEqual([1, '…', 19, 20]);
		const p0 = usePagination({ total: 30, pageSize: 0 });
		expect(read(p0.totalPages)).toBe(30); // pageSize 0 falls back to 1 (cell under this preset)
		p0.goTo(Number.NaN); // NaN floors through the || 1 fallback
		expect(read(p0.page)).toBe(1);
	});

	it('usePagination with no total and zero pageSize uses both || fallbacks', () => {
		const p = usePagination({ pageSize: 0 }); // total defaults to 0 as well
		expect(read(p.totalPages)).toBe(1);
	});

	it('useForm without a validate function submits cleanly', async () => {
		const submit = vi.fn(async () => {});
		const form = useForm({ initialValues: { a: '1' }, onSubmit: submit });
		form.field('a'); // fields register lazily
		await form.handleSubmit();
		expect(submit).toHaveBeenCalledWith({ a: '1' });
	});

	it('useOTP setDigit tolerates nullish input', () => {
		const otp = useOTP(2);
		otp.setDigit(0, null);
		expect(otp.code()).toBe('');
		otp.setDigit(0, undefined);
		expect(otp.code()).toBe('');
	});
});

describe('mop-up: throttle value cleanup, triple-call window, form tails', () => {
	it('useThrottle cleanup clears a pending trailing update', () => {
		vi.useFakeTimers();
		try {
			const source = signal(0);
			const [throttled, off] = useThrottle(source, 100);
			write(source, 1); // inside the window: trailing timer scheduled
			off(); // cleanup: timer && clearTimeout(timer)
			vi.advanceTimersByTime(500);
			expect(read(throttled)).toBe(0);
		} finally { vi.useRealTimers(); }
	});

	it('useThrottleFn third call inside the window updates the trailing args without rescheduling', () => {
		vi.useFakeTimers();
		try {
			const fn = vi.fn();
			const wrapped = useThrottleFn(fn, 100);
			wrapped('a'); // leading
			wrapped('b'); // schedules the trailing edge
			wrapped('c'); // timer already pending: args updated, deadline unchanged
			expect(fn).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(99);
			expect(fn).toHaveBeenCalledTimes(1); // the third call did not reschedule
			vi.advanceTimersByTime(1);
			expect(fn).toHaveBeenCalledTimes(2);
			expect(fn).toHaveBeenLastCalledWith('c'); // trailing edge fires with the latest args
		} finally { vi.useRealTimers(); }
	});

	it('useForm: unregistered-initial field, null validate result, partial reset', async () => {
		const submit = vi.fn(async () => {});
		const form = useForm({
			initialValues: { name: 'Ada' },
			validate: () => null, // null result normalizes to {}
			onSubmit: submit
		});
		form.field('extra'); // not in initialValues: '' fallback
		expect(form.values().extra).toBe('');
		form.setValue('name', 'Grace');
		form.reset({ name: 'New' }); // other fields fall back to ''
		expect(form.values()).toEqual({ name: 'New', extra: '' });
		await form.handleSubmit();
		expect(submit).toHaveBeenCalled();
	});
});

describe('mop-up: observer guard and title error channel', () => {
	it('useResizeObserver ref returns early without a ResizeObserver global', () => {
		const ro = useResizeObserver(); // jsdom has no ResizeObserver here
		expect(() => {
			ro.ref(document.createElement('div'));
			ro.ref(null);
		}).not.toThrow();
	});

	it('useTitle swallows subscription errors from an erroring source', () => {
		document.title = '';
		const subject = new Subject();
		useTitle(subject);
		expect(() => subject.error(new Error('boom'))).not.toThrow();
		expect(document.title).toBe('');
	});
});

