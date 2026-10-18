/**
 * Useful hooks for `uele`, written once against `uele/reactive` — so every
 * hook runs on ANY signal library (ulive, preact, vue, usignal, alien-signals,
 * s-js, mobx, solid, and the subscribe-only rxjs / nanostores / tanstack for
 * the hooks that need no effect runner).
 *
 *     import { useToggle, useLocalStorage, usePagination, useOTP } from "uele/hooks";
 *
 * Hooks return cells (render them directly: `{count}`), plain functions, or a
 * small object of both. DOM hooks that need an element accept the element, a
 * `() => element` getter, a `{ current }` ref object, or return bind props /
 * a `ref` callback you spread on the element. Every listener/timer hook
 * returns (or registers) its own teardown.
 */
import { get, is, sub } from 'uele';
import { signal, computed, read, write, effect, batch, untracked, isCell, canEffect, canCompute } from 'uele/reactive';

/* --------------------------------------------------------------- helpers */

const val = (x) => (x == null || (typeof x !== 'object' && typeof x !== 'function') ? x : get(x));
const targetOf = (t) => {
	if (t == null) return typeof window !== 'undefined' ? window : null;
	if (typeof t === 'function') return t();
	if (typeof t === 'object' && 'current' in t) return t.current;
	return t;
};
const on = (target, event, handler, options) => {
	const el = targetOf(target);
	if (!el?.addEventListener) return () => {};
	el.addEventListener(event, handler, options);
	return () => el.removeEventListener(event, handler, options);
};

/** create a cell (the React-style name for `signal` from `uele/reactive`) */
export const useSignal = (initial) => signal(initial);
/** derive a cell (the React-style name for `computed`) */
export const useComputed = (fn) => computed(fn);
/** run an effect; returns its disposer */
export const useEffect = (fn) => effect(fn);

let idSeq = 0;
/** stable unique id: `useId()` -> `"uele-1"`, `useId("otp")` -> `"otp-2"` */
export const useId = (prefix = 'uele') => `${prefix}-${++idSeq}`;

/* ------------------------------------------------------------ state hooks */

/** `[on, toggle, setOn]` — a boolean cell with a flipper. */
export const useToggle = (initial = false) => {
	const onCell = signal(!!val(initial));
	const toggle = (v) => write(onCell, typeof v === 'boolean' ? v : !read(onCell));
	return [onCell, toggle, (v) => write(onCell, !!v)];
};
/** alias */
export const useBoolean = useToggle;

/** open/close state for dialogs, popovers, menus: `{ open, show, hide, toggle, setOpen }` */
export const useDisclosure = (initial = false) => {
	const [open, toggle, setOpen] = useToggle(initial);
	return { open, toggle, setOpen, show: () => setOpen(true), hide: () => setOpen(false), onOpenChange: setOpen };
};

/** `{ count, inc, dec, set, reset }` — a clamped numeric cell. */
export const useCounter = (initial = 0, { min = -Infinity, max = Infinity, step = 1 } = {}) => {
	const count = signal(val(initial));
	const clamp = (v) => Math.min(max, Math.max(min, v));
	const setCount = (v) => write(count, clamp(typeof v === 'function' ? v(read(count)) : v));
	return {
		count,
		set: setCount,
		inc: (by = step) => setCount((c) => c + by),
		dec: (by = step) => setCount((c) => c - by),
		reset: () => write(count, clamp(val(initial)))
	};
};

/**
 * Controlled-or-uncontrolled state, the Radix pattern:
 * `useControllable(cellOrUndefined, initial, onChange)` -> `[value, setValue]`.
 * Pass a writable cell to control it, `undefined` to let the hook own it.
 * `setValue` accepts a value or an updater function and always fires `onChange`.
 */
export const useControllable = (controlled, initial, onChange) => {
	const inner = signal(initial);
	const isControlled = controlled !== undefined && controlled !== null;
	const cell = isControlled && isCell(controlled) ? controlled : inner;
	if (isControlled && !isCell(controlled)) write(inner, controlled);
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(isControlled && !isCell(controlled) ? controlled : read(cell)) : v;
		if (isCell(controlled)) write(controlled, next);
		else if (!isControlled) write(inner, next);
		else write(inner, next);
		onChange?.(next);
	};
	return [cell, setValue];
};

/** the previous value of a cell (or thunk): updates one commit behind the source */
export const usePrevious = (source) => {
	const previous = signal(undefined);
	let last = val(source);
	const off = sub(source, (v) => {
		if (v !== last) {
			write(previous, last);
			last = v;
		}
	});
	return [previous, off];
};

/* ------------------------------------------------------------- async/data */

/**
 * `{ data, error, loading, run, reset }` — drive a promise-returning fn.
 * A late resolution never overwrites a newer run.
 */
export const useAsync = (fn, { immediate = false, initialData = null } = {}) => {
	const data = signal(initialData);
	const error = signal(null);
	const loading = signal(!!immediate);
	let token = 0;
	const run = (...args) => {
		const mine = ++token;
		write(loading, true);
		write(error, null);
		return Promise.resolve()
			.then(() => fn(...args))
			.then(
				(v) => (mine === token && (write(data, v), write(loading, false)), v),
				(e) => (mine === token && (write(error, e), write(loading, false)), undefined)
			);
	};
	const reset = () => (token++, write(data, initialData), write(error, null), write(loading, false));
	if (immediate) run();
	return { data, error, loading, run, reset };
};

/** undo/redo history over a value: `{ value, set, undo, redo, canUndo, canRedo, clear, past, future }` */
export const useHistory = (initial, capacity = 100) => {
	const value = signal(initial);
	let past = [];
	let future = [];
	const canUndo = signal(false);
	const canRedo = signal(false);
	const sync = () => (write(canUndo, past.length > 0), write(canRedo, future.length > 0));
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(read(value)) : v;
		if (next === read(value)) return;
		past = [...past.slice(-(capacity - 1)), read(value)];
		future = [];
		write(value, next);
		sync();
	};
	return {
		value, set: setValue, canUndo, canRedo,
		undo: () => {
			if (!past.length) return;
			future = [read(value), ...future];
			write(value, past[past.length - 1]);
			past = past.slice(0, -1);
			sync();
		},
		redo: () => {
			if (!future.length) return;
			past = [...past, read(value)];
			write(value, future[0]);
			future = future.slice(1);
			sync();
		},
		clear: () => ((past = []), (future = []), sync()),
		past: () => [...past],
		future: () => [...future]
	};
};

/** list state: `{ list, push, insert, removeAt, updateAt, setAt, clear, set }` — every write is a fresh array */
export const useList = (initial = []) => {
	const list = signal([...val(initial)]);
	const commit = (next) => write(list, next);
	return {
		list,
		set: (v) => commit([...(typeof v === 'function' ? v(read(list)) : v)]),
		push: (...items) => commit([...read(list), ...items]),
		insert: (index, ...items) => commit([...read(list).slice(0, index), ...items, ...read(list).slice(index)]),
		removeAt: (index) => commit(read(list).filter((_, i) => i !== index)),
		updateAt: (index, item) => commit(read(list).map((v, i) => (i === index ? (typeof item === 'function' ? item(v) : item) : v))),
		clear: () => commit([])
	};
};
/** alias */
export const useArray = useList;

/* --------------------------------------------------------- debounce/timers */

/** a cell that follows `source` only after `delay` ms of quiet */
export const useDebounce = (source, delay = 300) => {
	const debounced = signal(val(source));
	let timer;
	const off = sub(source, (v) => {
		clearTimeout(timer);
		timer = setTimeout(() => write(debounced, v), delay);
	});
	return [debounced, () => (clearTimeout(timer), off())];
};

/** debounce any function; the wrapper also has `.cancel()` */
export const useDebounceFn = (fn, delay = 300) => {
	let timer;
	let lastArgs;
	const wrapped = (...args) => {
		lastArgs = args;
		clearTimeout(timer);
		timer = setTimeout(() => fn(...lastArgs), delay);
	};
	wrapped.cancel = () => clearTimeout(timer);
	wrapped.flush = () => {
		if (lastArgs) (clearTimeout(timer), fn(...lastArgs), (lastArgs = null));
	};
	return wrapped;
};

/** `{ start, stop, reset }` around `setInterval`; auto-starts unless `delay` is null */
export const useInterval = (callback, delay = 1000) => {
	let timer = null;
	const stop = () => (timer != null && clearInterval(timer), (timer = null));
	const start = () => {
		stop();
		if (delay != null) timer = setInterval(callback, delay);
	};
	if (delay != null) start();
	return { start, stop, reset: start, active: () => timer != null };
};

/** `{ start, stop, reset }` around `setTimeout` */
export const useTimeout = (callback, delay = 1000) => {
	let timer = null;
	const stop = () => (timer != null && clearTimeout(timer), (timer = null));
	const start = () => {
		stop();
		if (delay != null) timer = setTimeout(() => ((timer = null), callback()), delay);
	};
	if (delay != null) start();
	return { start, stop, reset: start, active: () => timer != null };
};

/** countdown timer: `{ count, running, start, pause, reset }` */
export const useCountdown = (seconds = 60, { onComplete } = {}) => {
	const count = signal(seconds);
	const running = signal(false);
	let timer = null;
	const stop = () => (timer != null && clearInterval(timer), (timer = null), write(running, false));
	const start = () => {
		if (timer != null) return;
		write(running, true);
		timer = setInterval(() => {
			const next = read(count) - 1;
			write(count, Math.max(0, next));
			if (next <= 0) (stop(), onComplete?.());
		}, 1000);
	};
	const pause = () => stop();
	const reset = (to = seconds) => (stop(), write(count, to));
	return { count, running, start, pause, stop, reset };
};

/* -------------------------------------------------------------- storage */

const storageHook = (storage, key, initial) => {
	const readStored = () => {
		try {
			const raw = storage?.getItem(key);
			return raw == null ? val(initial) : JSON.parse(raw);
		} catch {
			return val(initial);
		}
	};
	const cell = signal(readStored());
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(read(cell)) : v;
		write(cell, next);
		try {
			next == null ? storage?.removeItem(key) : storage?.setItem(key, JSON.stringify(next));
		} catch { /* private mode / quota: the cell still holds the value */ }
	};
	const offStorage = typeof window !== 'undefined'
		? on(window, 'storage', (e) => {
				if (e.key === key) write(cell, e.newValue == null ? val(initial) : JSON.parse(e.newValue));
			})
		: () => {};
	return [cell, setValue, () => (offStorage(), setValue(null))];
};
/** `[value, setValue, remove]` persisted to `localStorage` (JSON, cross-tab synced) */
export const useLocalStorage = (key, initial) => storageHook(typeof localStorage !== 'undefined' ? localStorage : null, key, initial);
/** `[value, setValue, remove]` persisted to `sessionStorage` */
export const useSessionStorage = (key, initial) => storageHook(typeof sessionStorage !== 'undefined' ? sessionStorage : null, key, initial);

/* ------------------------------------------------------------ DOM / events */

/** attach a listener to window, an element, a getter or a ref; returns the teardown */
export const useEventListener = (target, event, handler, options) => on(target, event, handler, options);

/** boolean cell for a media query; follows `change` events. Safe without `matchMedia` (stays false). */
export const useMediaQuery = (query) => {
	const matches = signal(false);
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return matches;
	const mql = window.matchMedia(val(query));
	write(matches, !!mql.matches);
	on(mql, 'change', (e) => write(matches, !!e.matches));
	return matches;
};

/** boolean cell: `navigator.onLine`, kept live by `online`/`offline` events */
export const useOnline = () => {
	const online = signal(typeof navigator === 'undefined' ? true : !!navigator.onLine);
	if (typeof window !== 'undefined') {
		on(window, 'online', () => write(online, true));
		on(window, 'offline', () => write(online, false));
	}
	return online;
};

/** `{ width, height }` cell for the window, kept live on `resize` */
export const useWindowSize = () => {
	const size = signal({
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight
	});
	if (typeof window !== 'undefined')
		on(window, 'resize', () => write(size, { width: window.innerWidth, height: window.innerHeight }));
	return size;
};

/**
 * `[pressed, off]` — pressed follows keydown/keyup for `key`; `handler` (optional)
 * fires on keydown. Matching is case-insensitive on `event.key`.
 */
export const useKeyPress = (key, handler) => {
	const pressed = signal(false);
	const wanted = String(val(key)).toLowerCase();
	const offDown = on(window, 'keydown', (e) => {
		if (e.key?.toLowerCase() === wanted) (write(pressed, true), handler?.(e));
	});
	const offUp = on(window, 'keyup', (e) => {
		if (e.key?.toLowerCase() === wanted) write(pressed, false);
	});
	return [pressed, () => (offDown(), offUp())];
};

/**
 * Fire `handler` for a combo like `"ctrl+k"`, `"mod+shift+p"` or `"Escape"`.
 * `mod` is meta on macOS, ctrl elsewhere. Returns the teardown.
 */
export const useHotkey = (combo, handler) =>
	on(window, 'keydown', (e) => {
		const parts = String(val(combo)).toLowerCase().split('+').map((p) => p.trim());
		const key = parts[parts.length - 1];
		const need = (name) => parts.includes(name);
		const mod = need('mod') ? (e.metaKey || e.ctrlKey) : true;
		const ok = mod
			&& (need('ctrl') === !!e.ctrlKey || need('mod'))
			&& (need('meta') === !!e.metaKey || need('mod'))
			&& (!need('shift') || e.shiftKey)
			&& (!need('alt') || e.altKey)
			&& (e.key?.toLowerCase() === key || (key === 'esc' && e.key === 'Escape') || (key === 'space' && e.key === ' '));
		if (ok) handler(e);
	});

/** call `handler` when a pointer-down lands outside the element; returns the teardown */
export const useClickOutside = (element, handler) => {
	const check = (e) => {
		const el = targetOf(element);
		if (el && !el.contains(e.target)) handler(e);
	};
	const off1 = on(document, 'mousedown', check);
	const off2 = on(document, 'touchstart', check);
	return () => (off1(), off2());
};

/** `[hovered, bindProps]` — spread `bindProps` on the element (or pass it as props) */
export const useHover = () => {
	const hovered = signal(false);
	return [hovered, { onmouseenter: () => write(hovered, true), onmouseleave: () => write(hovered, false) }];
};

/** `[focused, bindProps]` — spread `bindProps` on the element */
export const useFocus = () => {
	const focused = signal(false);
	return [focused, { onfocus: () => write(focused, true), onblur: () => write(focused, false) }];
};

/** `{ copied, copy }` — clipboard write with a transient `copied` flag (1500 ms) */
export const useClipboard = ({ timeout = 1500 } = {}) => {
	const copied = signal(false);
	let timer;
	const copy = async (text) => {
		const value = String(val(text));
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			const area = document.createElement('textarea');
			area.value = value;
			document.body.append(area);
			area.select();
			try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
			area.remove();
		}
		write(copied, true);
		clearTimeout(timer);
		timer = setTimeout(() => write(copied, false), timeout);
		return true;
	};
	return { copied, copy };
};

/**
 * `{ visible, entry, ref, disconnect }` — `ref(el)` observes an element.
 * Without `IntersectionObserver` (old browsers, jsdom) `visible` stays false.
 */
export const useIntersectionObserver = (options) => {
	const visible = signal(false);
	const entry = signal(null);
	let observer = null;
	const disconnect = () => observer?.disconnect();
	const ref = (el) => {
		if (!el || typeof IntersectionObserver === 'undefined') return;
		disconnect();
		observer = new IntersectionObserver((entries) => {
			const first = entries[0];
			if (first) (write(entry, first), write(visible, !!first.isIntersecting));
		}, options);
		observer.observe(el);
	};
	return { visible, entry, ref, disconnect };
};

/** `{ size, ref, disconnect }` — element size from `ResizeObserver` (guarded like above) */
export const useResizeObserver = () => {
	const size = signal({ width: 0, height: 0 });
	let observer = null;
	const disconnect = () => observer?.disconnect();
	const ref = (el) => {
		if (!el || typeof ResizeObserver === 'undefined') return;
		disconnect();
		observer = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			if (rect) write(size, { width: rect.width, height: rect.height });
		});
		observer.observe(el);
	};
	return { size, ref, disconnect };
};

/* ------------------------------------------------------ pagination & OTP */

/** the `[1, "…", 4, 5, 6, "…", 20]` window for a pagination bar (pure, shared with `uele/ui`) */
export const paginationRange = (page, totalPages, siblingCount = 1) => {
	const total = Math.max(1, Math.floor(totalPages) || 1);
	const current = Math.min(total, Math.max(1, Math.floor(page) || 1));
	const width = siblingCount * 2 + 5; // first, last, current, two ellipses
	if (total <= width) return Array.from({ length: total }, (_, i) => i + 1);
	const left = Math.max(2, current - siblingCount);
	const right = Math.min(total - 1, current + siblingCount);
	const out = [1];
	if (left > 2) out.push('…');
	for (let p = left; p <= right; p++) out.push(p);
	if (right < total - 1) out.push('…');
	out.push(total);
	return out;
};

/**
 * Pagination logic: `{ page, totalPages, goTo, next, prev, range, canNext, canPrev }`.
 * `totalPages`/`range`/`canNext`/`canPrev` are thunks when the preset has no
 * `computed`, cells when it does — call them or render them either way.
 */
export const usePagination = ({ total = 0, pageSize = 10, initialPage = 1, page: controlled, siblingCount = 1, onChange } = {}) => {
	const [page, setPageRaw] = useControllable(controlled, initialPage, onChange);
	const totalPagesOf = () => Math.max(1, Math.ceil((val(total) || 0) / (val(pageSize) || 1)));
	const goTo = (p) => setPageRaw(Math.min(totalPagesOf(), Math.max(1, Math.floor(p) || 1)));
	const derived = (fn) => (canCompute() ? computed(fn) : fn);
	return {
		page,
		totalPages: derived(totalPagesOf),
		range: derived(() => paginationRange(val(page), totalPagesOf(), siblingCount)),
		canPrev: derived(() => val(page) > 1),
		canNext: derived(() => val(page) < totalPagesOf()),
		goTo,
		next: () => goTo(val(page) + 1),
		prev: () => goTo(val(page) - 1),
		first: () => goTo(1),
		last: () => goTo(totalPagesOf())
	};
};

/**
 * One-time-code logic behind `OTPInput`: per-digit cells plus a joined value.
 * `{ digits, code(), setDigit, clear, isComplete() }`.
 */
export const useOTP = (length = 6, { onComplete } = {}) => {
	const digits = Array.from({ length }, () => signal(''));
	const code = () => digits.map((d) => read(d)).join('');
	const setDigit = (index, ch) => {
		const clean = String(ch ?? '').replace(/\D/g, '');
		if (!clean) return void write(digits[index], '');
		// a paste into one box fills the rest
		clean.split('').forEach((c, i) => digits[index + i] && write(digits[index + i], c));
		if (digits.every((d) => read(d))) onComplete?.(code());
	};
	const clear = () => digits.forEach((d) => write(d, ''));
	return { digits, code, setDigit, clear, isComplete: () => digits.every((d) => !!read(d)) };
};
/** alias */
export const usePinInput = useOTP;

/* ------------------------------------------------------------------ forms */

/**
 * Minimal form state: per-field cells, touched/errors, submit handling.
 *
 *     const form = useForm({ initialValues: { name: "" }, validate: (v) => v.name ? {} : { name: "Required" }, onSubmit });
 *     <Input model={form.field("name")} />  {form.errors}  <Form onSubmit={form.handleSubmit}>…
 */
export const useForm = ({ initialValues = {}, validate, onSubmit } = {}) => {
	const fields = new Map();
	const errors = signal({});
	const touched = signal({});
	const submitting = signal(false);
	const field = (name) => {
		if (!fields.has(name)) fields.set(name, signal(initialValues[name] ?? ''));
		return fields.get(name);
	};
	const values = () => Object.fromEntries([...fields].map(([k, cell]) => [k, read(cell)]));
	const runValidation = () => {
		const errs = validate ? validate(values()) || {} : {};
		write(errors, errs);
		return errs;
	};
	const handleSubmit = (event) => {
		event?.preventDefault?.();
		write(touched, Object.fromEntries([...fields.keys()].map((k) => [k, true])));
		const errs = runValidation();
		if (Object.values(errs).some(Boolean)) return false;
		write(submitting, true);
		return Promise.resolve(onSubmit?.(values())).finally(() => write(submitting, false));
	};
	return {
		field,
		register: (name) => ({ model: field(name), name, onblur: () => write(touched, { ...read(touched), [name]: true }) }),
		values, errors, touched, submitting,
		validate: runValidation,
		handleSubmit,
		setValue: (name, v) => write(field(name), v),
		setError: (name, message) => write(errors, { ...read(errors), [name]: message }),
		reset: (next = initialValues) => {
			fields.forEach((cell, k) => write(cell, next[k] ?? ''));
			write(errors, {});
			write(touched, {});
		},
		isValid: () => !Object.values(read(errors)).some(Boolean)
	};
};

/* ---------------------------------------------------- realtime & clocks */

/** a `Date` cell ticking every `interval` ms (also `useClock`) */
export const useNow = (interval = 1000) => {
	const now = signal(new Date());
	let timer = null;
	if (interval != null && typeof setInterval !== 'undefined') timer = setInterval(() => write(now, new Date()), interval);
	return [now, () => timer != null && clearInterval(timer)];
};
/** alias */
export const useClock = useNow;

/** stopwatch: `{ elapsed (seconds cell), running, start, pause, reset, lap, laps() }` */
export const useStopwatch = () => {
	const elapsed = signal(0);
	const running = signal(false);
	let timer = null;
	let laps = [];
	const start = () => {
		if (timer != null) return;
		write(running, true);
		const startedAt = Date.now() - read(elapsed) * 1000;
		timer = setInterval(() => write(elapsed, Math.floor((Date.now() - startedAt) / 1000)), 250);
	};
	const pause = () => (timer != null && clearInterval(timer), (timer = null), write(running, false));
	const reset = () => (pause(), write(elapsed, 0), (laps = []));
	return { elapsed, running, start, pause, reset, lap: () => (laps.push(read(elapsed)), [...laps]), laps: () => [...laps] };
};

/** throttle a source cell: at most one write per `interval` ms (leading edge) */
export const useThrottle = (source, interval = 300) => {
	const throttled = signal(val(source));
	let last = 0;
	let timer = null;
	let pending;
	const off = sub(source, (v) => {
		const wait = interval - (Date.now() - last);
		if (wait <= 0) {
			last = Date.now();
			write(throttled, v);
		} else {
			pending = v; // trailing edge must publish the LATEST value, not the first delayed one
			if (!timer) timer = setTimeout(() => ((timer = null), (last = Date.now()), write(throttled, pending)), wait);
		}
	});
	return [throttled, () => (timer && clearTimeout(timer), off())];
};

/** throttle any function (leading edge; one trailing edge fires with the latest args); the wrapper also has `.cancel()` */
export const useThrottleFn = (fn, interval = 300) => {
	let last = 0;
	let timer = null;
	let pending = null; // args of the most recent throttled call, used by the trailing edge
	const wrapped = (...args) => {
		const wait = interval - (Date.now() - last);
		if (wait <= 0) {
			last = Date.now();
			fn(...args);
		} else {
			pending = args; // trailing edge must fire with the LATEST args, not the first delayed ones
			if (!timer) timer = setTimeout(() => {
				timer = null;
				last = Date.now();
				const latest = pending;
				pending = null;
				fn(...latest);
			}, wait);
		}
	};
	wrapped.cancel = () => (timer && clearTimeout(timer), (timer = null), (pending = null));
	return wrapped;
};

/**
 * WebSocket state: `{ status, lastMessage, messages, send, close, open }`.
 * `status` is a cell: `'connecting' | 'open' | 'closed' | 'error'`. Messages
 * are JSON-parsed when possible. Without a `WebSocket` global (SSR/tests)
 * everything stays `'closed'` and `send` is a no-op returning `false`.
 */
export const useWebSocket = (url, { onMessage, protocols, json = true } = {}) => {
	const status = signal('closed');
	const lastMessage = signal(null);
	const messages = signal([]);
	let socket = null;
	const parse = (data) => {
		if (!json) return data;
		try { return JSON.parse(data); } catch { return data; }
	};
	const open = () => {
		if (typeof WebSocket === 'undefined' || !url) return null;
		close();
		write(status, 'connecting');
		socket = protocols ? new WebSocket(val(url), protocols) : new WebSocket(val(url));
		socket.onopen = () => write(status, 'open');
		socket.onclose = () => write(status, 'closed');
		socket.onerror = () => write(status, 'error');
		socket.onmessage = (event) => {
			const data = parse(event.data);
			write(lastMessage, data);
			write(messages, [...read(messages), data]);
			onMessage?.(data, event);
		};
		return socket;
	};
	const close = () => {
		try { socket?.close(); } catch { /* already gone */ }
		socket = null;
	};
	const send = (data) => {
		if (!socket || read(status) !== 'open') return false;
		socket.send(typeof data === 'string' ? data : JSON.stringify(data));
		return true;
	};
	if (url) open();
	return { status, lastMessage, messages, send, close, open, socket: () => socket };
};

/**
 * Server-Sent Events: `{ status, lastMessage, messages, close }`.
 * Same contract as `useWebSocket`, over `EventSource` (guarded when absent).
 */
export const useEventSource = (url, { onMessage, withCredentials } = {}) => {
	const status = signal('closed');
	const lastMessage = signal(null);
	const messages = signal([]);
	let source = null;
	if (typeof EventSource !== 'undefined' && url) {
		write(status, 'connecting');
		source = new EventSource(val(url), { withCredentials });
		source.onopen = () => write(status, 'open');
		source.onerror = () => write(status, 'error');
		source.onmessage = (event) => {
			let data = event.data;
			try { data = JSON.parse(data); } catch { /* plain text event */ }
			write(lastMessage, data);
			write(messages, [...read(messages), data]);
			onMessage?.(data, event);
		};
	}
	return { status, lastMessage, messages, close: () => (source?.close(), write(status, 'closed')), source: () => source };
};

/**
 * Cross-tab messaging over `BroadcastChannel`:
 * `{ lastMessage, messages, post, close, supported }` (guarded when absent).
 */
export const useBroadcastChannel = (name, { onMessage } = {}) => {
	const lastMessage = signal(null);
	const messages = signal([]);
	let channel = null;
	let supported = typeof BroadcastChannel !== 'undefined';
	if (supported && name) {
		channel = new BroadcastChannel(val(name));
		channel.onmessage = (event) => {
			write(lastMessage, event.data);
			write(messages, [...read(messages), event.data]);
			onMessage?.(event.data, event);
		};
	}
	return {
		supported, lastMessage, messages,
		post: (data) => (channel ? (channel.postMessage(data), true) : false),
		close: () => channel?.close()
	};
};

/** fetch JSON with loading/error state and aborts: `{ data, error, loading, run, abort }` */
export const useFetch = (url, options) => {
	const base = useAsync(async (target, opts) => {
		const res = await fetch(target ?? val(url), opts);
		if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
		const type = res.headers?.get?.('content-type') || '';
		return type.includes('json') ? res.json() : res.text();
	});
	let controller = null;
	const run = (target, opts) => {
		controller?.abort?.();
		controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
		return base.run(target, { ...options, ...opts, signal: controller?.signal }); // hook-level options are the defaults every run starts from
	};
	return { ...base, run, abort: () => controller?.abort?.() };
};

/* ------------------------------------------------------------ browser APIs */

/** geolocation: `{ position, error, loading, refresh, supported }` */
export const useGeolocation = ({ immediate = false } = {}) => {
	const position = signal(null);
	const error = signal(null);
	const loading = signal(false);
	const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;
	const refresh = () => {
		if (!supported) return;
		write(loading, true);
		navigator.geolocation.getCurrentPosition(
			(pos) => (write(position, pos), write(loading, false)),
			(err) => (write(error, err), write(loading, false))
		);
	};
	if (immediate) refresh();
	return { position, error, loading, refresh, supported };
};

/** `'visible' | 'hidden'` cell for the document, kept live */
export const useDocumentVisibility = () => {
	const visibility = signal(typeof document === 'undefined' ? 'visible' : document.visibilityState || 'visible');
	if (typeof document !== 'undefined') on(document, 'visibilitychange', () => write(visibility, document.visibilityState));
	return visibility;
};

/** boolean cell: whether the window currently has focus */
export const useWindowFocus = () => {
	const focused = signal(typeof document === 'undefined' ? true : document.hasFocus?.() ?? true);
	if (typeof window !== 'undefined') {
		on(window, 'focus', () => write(focused, true));
		on(window, 'blur', () => write(focused, false));
	}
	return focused;
};

/** `{ x, y, direction }` scroll cell for the window */
export const useScrollPosition = () => {
	const pos = signal({ x: 0, y: 0, direction: 'none' });
	let lastY = 0;
	if (typeof window !== 'undefined') {
		on(window, 'scroll', () => {
			const y = window.scrollY || 0;
			write(pos, { x: window.scrollX || 0, y, direction: y > lastY ? 'down' : y < lastY ? 'up' : 'none' });
			lastY = y;
		}, { passive: true });
	}
	return pos;
};
/** alias */
export const useScroll = useScrollPosition;

/** body scroll lock with reference counting: `{ lock, unlock, locked }` */
export const useScrollLock = () => {
	const locked = signal(false);
	let count = 0;
	let previous = '';
	const apply = () => {
		if (typeof document === 'undefined') return;
		if (count > 0 && !read(locked)) (previous = document.body.style.overflow, document.body.style.overflow = 'hidden', write(locked, true));
		else if (count <= 0 && read(locked)) (document.body.style.overflow = previous, write(locked, false));
	};
	return {
		locked,
		lock: () => (count++, apply()),
		unlock: () => (count = Math.max(0, count - 1), apply())
	};
};

/**
 * Focus trap for dialogs/menus: `const trap = useFocusTrap()` then
 * `trap.ref(el)` — Tab/Shift+Tab cycle inside `el`. Returns `{ ref, activate, deactivate }`.
 */
export const useFocusTrap = () => {
	let container = null;
	let activeTrap = false;
	const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
	const handler = (e) => {
		if (!activeTrap || !container || e.key !== 'Tab') return;
		const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.type !== 'hidden');
		if (!items.length) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
		else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
	};
	const deactivate = () => {
		activeTrap = false;
		if (typeof document !== 'undefined') document.removeEventListener('keydown', handler, true);
	};
	const activate = (el) => {
		container = el || container;
		if (!container) return;
		activeTrap = true;
		if (typeof document !== 'undefined') document.addEventListener('keydown', handler, true);
		container.querySelector(FOCUSABLE)?.focus?.();
	};
	return { ref: (el) => el && activate(el), activate, deactivate, active: () => activeTrap };
};

/** fullscreen over an element (or the document): `{ fullscreen, toggle, enter, exit, supported }` */
export const useFullscreen = (target) => {
	const fullscreen = signal(false);
	const supported = typeof document !== 'undefined' && !!document.documentElement?.requestFullscreen;
	const sync = () => write(fullscreen, typeof document !== 'undefined' && !!document.fullscreenElement);
	if (typeof document !== 'undefined') on(document, 'fullscreenchange', sync);
	const enter = () => targetOf(target)?.requestFullscreen?.() || document.documentElement.requestFullscreen?.();
	const exit = () => document.exitFullscreen?.();
	return { fullscreen, supported, enter, exit, toggle: () => (read(fullscreen) ? exit() : enter()) };
};

/** current breakpoint name from a `{ sm: 640, md: 768, … }` map (window-width based) */
export const useBreakpoint = (breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 }) => {
	const sorted = Object.entries(breakpoints).sort((a, b) => a[1] - b[1]);
	const pick = () => {
		const w = typeof window === 'undefined' ? 0 : window.innerWidth;
		let current = 'base';
		for (const [name, min] of sorted) if (w >= min) current = name;
		return current;
	};
	const breakpoint = signal(pick());
	if (typeof window !== 'undefined') on(window, 'resize', () => write(breakpoint, pick()));
	return breakpoint;
};

/**
 * Colour scheme for `uele/themes`: `{ scheme, dark, toggle, setScheme }`.
 * Follows `prefers-color-scheme`, remembers an explicit override in
 * `localStorage` (key `uele-scheme`) unless `persist: false`.
 */
export const useColorScheme = ({ persist = true, key = 'uele-scheme', initial } = {}) => {
	const stored = () => {
		try { return persist ? localStorage.getItem(key) : null; } catch { return null; }
	};
	const media = () => {
		try {
			return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		} catch { return 'light'; }
	};
	const scheme = signal(initial || stored() || media());
	const dark = signal(read(scheme) === 'dark');
	const setScheme = (v) => {
		const next = typeof v === 'function' ? v(read(scheme)) : v;
		write(scheme, next);
		write(dark, next === 'dark');
		try { persist && localStorage.setItem(key, next); } catch { /* private mode */ }
	};
	try {
		if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
			const mql = window.matchMedia('(prefers-color-scheme: dark)');
			on(mql, 'change', () => !stored() && setScheme(media()));
		}
	} catch { /* a throwing matchMedia must not break the hook (media() already degrades) */ }
	return { scheme, dark, setScheme, toggle: () => setScheme(read(scheme) === 'dark' ? 'light' : 'dark') };
};
/** alias */
export const useDarkMode = useColorScheme;

/** two-way sync with one URL query param: `[value, setValue]` (pushState + popstate) */
export const useQueryParam = (key, initial = '') => {
	const readParam = () => {
		try { return new URLSearchParams(window.location.search).get(key) ?? initial; } catch { return initial; }
	};
	const cell = signal(typeof window === 'undefined' ? initial : readParam());
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(read(cell)) : v;
		write(cell, next);
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (next == null || next === '') url.searchParams.delete(key);
		else url.searchParams.set(key, String(next));
		window.history.pushState(null, '', url);
	};
	if (typeof window !== 'undefined') on(window, 'popstate', () => write(cell, readParam()));
	return [cell, setValue];
};

/** cookie value cell: reads on create, `setValue(v, days)` writes, `setValue(null)` deletes */
export const useCookie = (name, initial = '') => {
	const readCookie = () => {
		try {
			const found = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
			return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : initial;
		} catch { return initial; }
	};
	const cell = signal(typeof document === 'undefined' ? initial : readCookie());
	const setValue = (v, days = 365) => {
		const next = typeof v === 'function' ? v(read(cell)) : v;
		write(cell, next ?? '');
		if (typeof document === 'undefined') return;
		const expires = next == null ? 'Thu, 01 Jan 1970 00:00:00 GMT' : new Date(Date.now() + days * 864e5).toUTCString();
		document.cookie = `${name}=${encodeURIComponent(next ?? '')}; expires=${expires}; path=/`;
	};
	return [cell, setValue];
};

/** boolean cell: true after `timeout` ms without mouse/key/touch activity */
export const useIdle = (timeout = 60000) => {
	const idle = signal(false);
	let timer = null;
	const reset = () => {
		write(idle, false);
		clearTimeout(timer);
		timer = setTimeout(() => write(idle, true), timeout);
	};
	if (typeof window !== 'undefined') for (const evt of ['mousemove', 'mousedown', 'keydown', 'touchstart']) on(window, evt, reset, { passive: true });
	reset();
	return idle;
};

/** long-press bind props: spread on an element, `handler` fires after `delay` ms held */
export const useLongPress = (handler, delay = 500) => {
	let timer = null;
	const clear = () => (timer && clearTimeout(timer), (timer = null));
	return {
		onmousedown: () => (clear(), (timer = setTimeout(handler, delay))),
		ontouchstart: () => (clear(), (timer = setTimeout(handler, delay))),
		onmouseup: clear,
		onmouseleave: clear,
		ontouchend: clear
	};
};

/** swipe bind props: `useSwipe({ onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold })` */
export const useSwipe = ({ threshold = 40, ...handlers } = {}) => {
	let start = null;
	return {
		ontouchstart: (e) => (start = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
		ontouchend: (e) => {
			if (!start) return;
			const dx = e.changedTouches[0].clientX - start.x;
			const dy = e.changedTouches[0].clientY - start.y;
			start = null;
			if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
			if (Math.abs(dx) > Math.abs(dy)) handlers[dx > 0 ? 'onSwipeRight' : 'onSwipeLeft']?.({ dx, dy });
			else handlers[dy > 0 ? 'onSwipeDown' : 'onSwipeUp']?.({ dx, dy });
		}
	};
};

/** requestAnimationFrame loop: `{ start, stop, running }`, callback gets `(time, delta)` */
export const useAnimationFrame = (callback) => {
	const running = signal(false);
	let frame = null;
	let last = 0;
	const loop = (time) => {
		callback(time, last ? time - last : 0);
		last = time;
		if (read(running)) frame = requestAnimationFrame(loop);
	};
	const start = () => {
		if (read(running) || typeof requestAnimationFrame === 'undefined') return;
		write(running, true);
		last = 0;
		frame = requestAnimationFrame(loop);
	};
	const stop = () => (write(running, false), frame != null && cancelAnimationFrame(frame), (frame = null));
	return { start, stop, running };
};
/** alias */
export const useRaf = useAnimationFrame;

/** just the boolean from `useIntersectionObserver`, for a getter/element/ref */
export const useInView = (target, options) => {
	const io = useIntersectionObserver(options);
	if (target) io.ref(targetOf(target));
	return io.visible;
};

/** set `document.title` from a value/cell/thunk, restoring the old title on `restore()` */
export const useTitle = (title) => {
	const previous = typeof document === 'undefined' ? '' : document.title;
	const apply = (v) => { if (typeof document !== 'undefined') document.title = v == null ? '' : String(v); };
	if (is(title) || typeof title === 'function') sub(title, apply, () => {});
	else apply(val(title));
	return { restore: () => apply(previous) };
};

/** a cell that always mirrors the latest value of a source (read it in callbacks) */
export const useLatest = (source) => {
	const latest = signal(val(source));
	sub(source, (v) => write(latest, v));
	return latest;
};

/** `[mounted, isMounted]` — true from creation until `unmount()` (call it on teardown) */
export const useIsMounted = () => {
	const mounted = signal(true);
	return [mounted, () => read(mounted), () => write(mounted, false)];
};

/** element-size hook with the friendlier name (same as `useResizeObserver`) */
export const useElementSize = useResizeObserver;

export { signal, computed, read, write, effect, batch, untracked, isCell, canEffect, canCompute };
