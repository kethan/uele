'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');

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

/* --------------------------------------------------------------- helpers */

const val = (x) => (x == null || (typeof x !== 'object' && typeof x !== 'function') ? x : uele.get(x));
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
const useSignal = (initial) => reactive.signal(initial);
/** derive a cell (the React-style name for `computed`) */
const useComputed = (fn) => reactive.computed(fn);
/** run an effect; returns its disposer */
const useEffect = (fn) => reactive.effect(fn);

let idSeq = 0;
/** stable unique id: `useId()` -> `"uele-1"`, `useId("otp")` -> `"otp-2"` */
const useId = (prefix = 'uele') => `${prefix}-${++idSeq}`;

/* ------------------------------------------------------------ state hooks */

/** `[on, toggle, setOn]` — a boolean cell with a flipper. */
const useToggle = (initial = false) => {
	const onCell = reactive.signal(!!val(initial));
	const toggle = (v) => reactive.write(onCell, typeof v === 'boolean' ? v : !reactive.read(onCell));
	return [onCell, toggle, (v) => reactive.write(onCell, !!v)];
};
/** alias */
const useBoolean = useToggle;

/** open/close state for dialogs, popovers, menus: `{ open, show, hide, toggle, setOpen }` */
const useDisclosure = (initial = false) => {
	const [open, toggle, setOpen] = useToggle(initial);
	return { open, toggle, setOpen, show: () => setOpen(true), hide: () => setOpen(false), onOpenChange: setOpen };
};

/** `{ count, inc, dec, set, reset }` — a clamped numeric cell. */
const useCounter = (initial = 0, { min = -Infinity, max = Infinity, step = 1 } = {}) => {
	const count = reactive.signal(val(initial));
	const clamp = (v) => Math.min(max, Math.max(min, v));
	const setCount = (v) => reactive.write(count, clamp(typeof v === 'function' ? v(reactive.read(count)) : v));
	return {
		count,
		set: setCount,
		inc: (by = step) => setCount((c) => c + by),
		dec: (by = step) => setCount((c) => c - by),
		reset: () => reactive.write(count, clamp(val(initial)))
	};
};

/**
 * Controlled-or-uncontrolled state, the Radix pattern:
 * `useControllable(cellOrUndefined, initial, onChange)` -> `[value, setValue]`.
 * Pass a writable cell to control it, `undefined` to let the hook own it.
 * `setValue` accepts a value or an updater function and always fires `onChange`.
 */
const useControllable = (controlled, initial, onChange) => {
	const inner = reactive.signal(initial);
	const isControlled = controlled !== undefined && controlled !== null;
	const cell = isControlled && reactive.isCell(controlled) ? controlled : inner;
	if (isControlled && !reactive.isCell(controlled)) reactive.write(inner, controlled);
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(isControlled && !reactive.isCell(controlled) ? controlled : reactive.read(cell)) : v;
		if (reactive.isCell(controlled)) reactive.write(controlled, next);
		else if (!isControlled) reactive.write(inner, next);
		else reactive.write(inner, next);
		onChange?.(next);
	};
	return [cell, setValue];
};

/** the previous value of a cell (or thunk): updates one commit behind the source */
const usePrevious = (source) => {
	const previous = reactive.signal(undefined);
	let last = val(source);
	const off = uele.sub(source, (v) => {
		if (v !== last) {
			reactive.write(previous, last);
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
const useAsync = (fn, { immediate = false, initialData = null } = {}) => {
	const data = reactive.signal(initialData);
	const error = reactive.signal(null);
	const loading = reactive.signal(!!immediate);
	let token = 0;
	const run = (...args) => {
		const mine = ++token;
		reactive.write(loading, true);
		reactive.write(error, null);
		return Promise.resolve()
			.then(() => fn(...args))
			.then(
				(v) => (mine === token && (reactive.write(data, v), reactive.write(loading, false)), v),
				(e) => (mine === token && (reactive.write(error, e), reactive.write(loading, false)), undefined)
			);
	};
	const reset = () => (token++, reactive.write(data, initialData), reactive.write(error, null), reactive.write(loading, false));
	if (immediate) run();
	return { data, error, loading, run, reset };
};

/** undo/redo history over a value: `{ value, set, undo, redo, canUndo, canRedo, clear, past, future }` */
const useHistory = (initial, capacity = 100) => {
	const value = reactive.signal(initial);
	let past = [];
	let future = [];
	const canUndo = reactive.signal(false);
	const canRedo = reactive.signal(false);
	const sync = () => (reactive.write(canUndo, past.length > 0), reactive.write(canRedo, future.length > 0));
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(reactive.read(value)) : v;
		if (next === reactive.read(value)) return;
		past = [...past.slice(-(capacity - 1)), reactive.read(value)];
		future = [];
		reactive.write(value, next);
		sync();
	};
	return {
		value, set: setValue, canUndo, canRedo,
		undo: () => {
			if (!past.length) return;
			future = [reactive.read(value), ...future];
			reactive.write(value, past[past.length - 1]);
			past = past.slice(0, -1);
			sync();
		},
		redo: () => {
			if (!future.length) return;
			past = [...past, reactive.read(value)];
			reactive.write(value, future[0]);
			future = future.slice(1);
			sync();
		},
		clear: () => ((past = []), (future = []), sync()),
		past: () => [...past],
		future: () => [...future]
	};
};

/** list state: `{ list, push, insert, removeAt, updateAt, setAt, clear, set }` — every write is a fresh array */
const useList = (initial = []) => {
	const list = reactive.signal([...val(initial)]);
	const commit = (next) => reactive.write(list, next);
	return {
		list,
		set: (v) => commit([...(typeof v === 'function' ? v(reactive.read(list)) : v)]),
		push: (...items) => commit([...reactive.read(list), ...items]),
		insert: (index, ...items) => commit([...reactive.read(list).slice(0, index), ...items, ...reactive.read(list).slice(index)]),
		removeAt: (index) => commit(reactive.read(list).filter((_, i) => i !== index)),
		updateAt: (index, item) => commit(reactive.read(list).map((v, i) => (i === index ? (typeof item === 'function' ? item(v) : item) : v))),
		clear: () => commit([])
	};
};
/** alias */
const useArray = useList;

/* --------------------------------------------------------- debounce/timers */

/** a cell that follows `source` only after `delay` ms of quiet */
const useDebounce = (source, delay = 300) => {
	const debounced = reactive.signal(val(source));
	let timer;
	const off = uele.sub(source, (v) => {
		clearTimeout(timer);
		timer = setTimeout(() => reactive.write(debounced, v), delay);
	});
	return [debounced, () => (clearTimeout(timer), off())];
};

/** debounce any function; the wrapper also has `.cancel()` */
const useDebounceFn = (fn, delay = 300) => {
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
const useInterval = (callback, delay = 1000) => {
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
const useTimeout = (callback, delay = 1000) => {
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
const useCountdown = (seconds = 60, { onComplete } = {}) => {
	const count = reactive.signal(seconds);
	const running = reactive.signal(false);
	let timer = null;
	const stop = () => (timer != null && clearInterval(timer), (timer = null), reactive.write(running, false));
	const start = () => {
		if (timer != null) return;
		reactive.write(running, true);
		timer = setInterval(() => {
			const next = reactive.read(count) - 1;
			reactive.write(count, Math.max(0, next));
			if (next <= 0) (stop(), onComplete?.());
		}, 1000);
	};
	const pause = () => stop();
	const reset = (to = seconds) => (stop(), reactive.write(count, to));
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
	const cell = reactive.signal(readStored());
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(reactive.read(cell)) : v;
		reactive.write(cell, next);
		try {
			next == null ? storage?.removeItem(key) : storage?.setItem(key, JSON.stringify(next));
		} catch { /* private mode / quota: the cell still holds the value */ }
	};
	const offStorage = typeof window !== 'undefined'
		? on(window, 'storage', (e) => {
				if (e.key === key) reactive.write(cell, e.newValue == null ? val(initial) : JSON.parse(e.newValue));
			})
		: () => {};
	return [cell, setValue, () => (offStorage(), setValue(null))];
};
/** `[value, setValue, remove]` persisted to `localStorage` (JSON, cross-tab synced) */
const useLocalStorage = (key, initial) => storageHook(typeof localStorage !== 'undefined' ? localStorage : null, key, initial);
/** `[value, setValue, remove]` persisted to `sessionStorage` */
const useSessionStorage = (key, initial) => storageHook(typeof sessionStorage !== 'undefined' ? sessionStorage : null, key, initial);

/* ------------------------------------------------------------ DOM / events */

/** attach a listener to window, an element, a getter or a ref; returns the teardown */
const useEventListener = (target, event, handler, options) => on(target, event, handler, options);

/** boolean cell for a media query; follows `change` events. Safe without `matchMedia` (stays false). */
const useMediaQuery = (query) => {
	const matches = reactive.signal(false);
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return matches;
	const mql = window.matchMedia(val(query));
	reactive.write(matches, !!mql.matches);
	on(mql, 'change', (e) => reactive.write(matches, !!e.matches));
	return matches;
};

/** boolean cell: `navigator.onLine`, kept live by `online`/`offline` events */
const useOnline = () => {
	const online = reactive.signal(typeof navigator === 'undefined' ? true : !!navigator.onLine);
	if (typeof window !== 'undefined') {
		on(window, 'online', () => reactive.write(online, true));
		on(window, 'offline', () => reactive.write(online, false));
	}
	return online;
};

/** `{ width, height }` cell for the window, kept live on `resize` */
const useWindowSize = () => {
	const size = reactive.signal({
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight
	});
	if (typeof window !== 'undefined')
		on(window, 'resize', () => reactive.write(size, { width: window.innerWidth, height: window.innerHeight }));
	return size;
};

/**
 * `[pressed, off]` — pressed follows keydown/keyup for `key`; `handler` (optional)
 * fires on keydown. Matching is case-insensitive on `event.key`.
 */
const useKeyPress = (key, handler) => {
	const pressed = reactive.signal(false);
	const wanted = String(val(key)).toLowerCase();
	const offDown = on(window, 'keydown', (e) => {
		if (e.key?.toLowerCase() === wanted) (reactive.write(pressed, true), handler?.(e));
	});
	const offUp = on(window, 'keyup', (e) => {
		if (e.key?.toLowerCase() === wanted) reactive.write(pressed, false);
	});
	return [pressed, () => (offDown(), offUp())];
};

/**
 * Fire `handler` for a combo like `"ctrl+k"`, `"mod+shift+p"` or `"Escape"`.
 * `mod` is meta on macOS, ctrl elsewhere. Returns the teardown.
 */
const useHotkey = (combo, handler) =>
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
const useClickOutside = (element, handler) => {
	const check = (e) => {
		const el = targetOf(element);
		if (el && !el.contains(e.target)) handler(e);
	};
	const off1 = on(document, 'mousedown', check);
	const off2 = on(document, 'touchstart', check);
	return () => (off1(), off2());
};

/** `[hovered, bindProps]` — spread `bindProps` on the element (or pass it as props) */
const useHover = () => {
	const hovered = reactive.signal(false);
	return [hovered, { onmouseenter: () => reactive.write(hovered, true), onmouseleave: () => reactive.write(hovered, false) }];
};

/** `[focused, bindProps]` — spread `bindProps` on the element */
const useFocus = () => {
	const focused = reactive.signal(false);
	return [focused, { onfocus: () => reactive.write(focused, true), onblur: () => reactive.write(focused, false) }];
};

/** `{ copied, copy }` — clipboard write with a transient `copied` flag (1500 ms) */
const useClipboard = ({ timeout = 1500 } = {}) => {
	const copied = reactive.signal(false);
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
		reactive.write(copied, true);
		clearTimeout(timer);
		timer = setTimeout(() => reactive.write(copied, false), timeout);
		return true;
	};
	return { copied, copy };
};

/**
 * `{ visible, entry, ref, disconnect }` — `ref(el)` observes an element.
 * Without `IntersectionObserver` (old browsers, jsdom) `visible` stays false.
 */
const useIntersectionObserver = (options) => {
	const visible = reactive.signal(false);
	const entry = reactive.signal(null);
	let observer = null;
	const disconnect = () => observer?.disconnect();
	const ref = (el) => {
		if (!el || typeof IntersectionObserver === 'undefined') return;
		disconnect();
		observer = new IntersectionObserver((entries) => {
			const first = entries[0];
			if (first) (reactive.write(entry, first), reactive.write(visible, !!first.isIntersecting));
		}, options);
		observer.observe(el);
	};
	return { visible, entry, ref, disconnect };
};

/** `{ size, ref, disconnect }` — element size from `ResizeObserver` (guarded like above) */
const useResizeObserver = () => {
	const size = reactive.signal({ width: 0, height: 0 });
	let observer = null;
	const disconnect = () => observer?.disconnect();
	const ref = (el) => {
		if (!el || typeof ResizeObserver === 'undefined') return;
		disconnect();
		observer = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			if (rect) reactive.write(size, { width: rect.width, height: rect.height });
		});
		observer.observe(el);
	};
	return { size, ref, disconnect };
};

/* ------------------------------------------------------ pagination & OTP */

/** the `[1, "…", 4, 5, 6, "…", 20]` window for a pagination bar (pure, shared with `uele/ui`) */
const paginationRange = (page, totalPages, siblingCount = 1) => {
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
const usePagination = ({ total = 0, pageSize = 10, initialPage = 1, page: controlled, siblingCount = 1, onChange } = {}) => {
	const [page, setPageRaw] = useControllable(controlled, initialPage, onChange);
	const totalPagesOf = () => Math.max(1, Math.ceil((val(total) || 0) / (val(pageSize) || 1)));
	const goTo = (p) => setPageRaw(Math.min(totalPagesOf(), Math.max(1, Math.floor(p) || 1)));
	const derived = (fn) => (reactive.canCompute() ? reactive.computed(fn) : fn);
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
const useOTP = (length = 6, { onComplete } = {}) => {
	const digits = Array.from({ length }, () => reactive.signal(''));
	const code = () => digits.map((d) => reactive.read(d)).join('');
	const setDigit = (index, ch) => {
		const clean = String(ch ?? '').replace(/\D/g, '');
		if (!clean) return void reactive.write(digits[index], '');
		// a paste into one box fills the rest
		clean.split('').forEach((c, i) => digits[index + i] && reactive.write(digits[index + i], c));
		if (digits.every((d) => reactive.read(d))) onComplete?.(code());
	};
	const clear = () => digits.forEach((d) => reactive.write(d, ''));
	return { digits, code, setDigit, clear, isComplete: () => digits.every((d) => !!reactive.read(d)) };
};
/** alias */
const usePinInput = useOTP;

/* ------------------------------------------------------------------ forms */

/**
 * Minimal form state: per-field cells, touched/errors, submit handling.
 *
 *     const form = useForm({ initialValues: { name: "" }, validate: (v) => v.name ? {} : { name: "Required" }, onSubmit });
 *     <Input model={form.field("name")} />  {form.errors}  <Form onSubmit={form.handleSubmit}>…
 */
const useForm = ({ initialValues = {}, validate, onSubmit } = {}) => {
	const fields = new Map();
	const errors = reactive.signal({});
	const touched = reactive.signal({});
	const submitting = reactive.signal(false);
	const field = (name) => {
		if (!fields.has(name)) fields.set(name, reactive.signal(initialValues[name] ?? ''));
		return fields.get(name);
	};
	const values = () => Object.fromEntries([...fields].map(([k, cell]) => [k, reactive.read(cell)]));
	const runValidation = () => {
		const errs = validate ? validate(values()) || {} : {};
		reactive.write(errors, errs);
		return errs;
	};
	const handleSubmit = (event) => {
		event?.preventDefault?.();
		reactive.write(touched, Object.fromEntries([...fields.keys()].map((k) => [k, true])));
		const errs = runValidation();
		if (Object.values(errs).some(Boolean)) return false;
		reactive.write(submitting, true);
		return Promise.resolve(onSubmit?.(values())).finally(() => reactive.write(submitting, false));
	};
	return {
		field,
		register: (name) => ({ model: field(name), name, onblur: () => reactive.write(touched, { ...reactive.read(touched), [name]: true }) }),
		values, errors, touched, submitting,
		validate: runValidation,
		handleSubmit,
		setValue: (name, v) => reactive.write(field(name), v),
		setError: (name, message) => reactive.write(errors, { ...reactive.read(errors), [name]: message }),
		reset: (next = initialValues) => {
			fields.forEach((cell, k) => reactive.write(cell, next[k] ?? ''));
			reactive.write(errors, {});
			reactive.write(touched, {});
		},
		isValid: () => !Object.values(reactive.read(errors)).some(Boolean)
	};
};

/* ---------------------------------------------------- realtime & clocks */

/** a `Date` cell ticking every `interval` ms (also `useClock`) */
const useNow = (interval = 1000) => {
	const now = reactive.signal(new Date());
	let timer = null;
	if (interval != null && typeof setInterval !== 'undefined') timer = setInterval(() => reactive.write(now, new Date()), interval);
	return [now, () => timer != null && clearInterval(timer)];
};
/** alias */
const useClock = useNow;

/** stopwatch: `{ elapsed (seconds cell), running, start, pause, reset, lap, laps() }` */
const useStopwatch = () => {
	const elapsed = reactive.signal(0);
	const running = reactive.signal(false);
	let timer = null;
	let laps = [];
	const start = () => {
		if (timer != null) return;
		reactive.write(running, true);
		const startedAt = Date.now() - reactive.read(elapsed) * 1000;
		timer = setInterval(() => reactive.write(elapsed, Math.floor((Date.now() - startedAt) / 1000)), 250);
	};
	const pause = () => (timer != null && clearInterval(timer), (timer = null), reactive.write(running, false));
	const reset = () => (pause(), reactive.write(elapsed, 0), (laps = []));
	return { elapsed, running, start, pause, reset, lap: () => (laps.push(reactive.read(elapsed)), [...laps]), laps: () => [...laps] };
};

/** throttle a source cell: at most one write per `interval` ms (leading edge) */
const useThrottle = (source, interval = 300) => {
	const throttled = reactive.signal(val(source));
	let last = 0;
	let timer = null;
	let pending;
	const off = uele.sub(source, (v) => {
		const wait = interval - (Date.now() - last);
		if (wait <= 0) {
			last = Date.now();
			reactive.write(throttled, v);
		} else {
			pending = v; // trailing edge must publish the LATEST value, not the first delayed one
			if (!timer) timer = setTimeout(() => ((timer = null), (last = Date.now()), reactive.write(throttled, pending)), wait);
		}
	});
	return [throttled, () => (timer && clearTimeout(timer), off())];
};

/** throttle any function (leading edge); the wrapper also has `.cancel()` */
const useThrottleFn = (fn, interval = 300) => {
	let last = 0;
	let timer = null;
	const wrapped = (...args) => {
		const wait = interval - (Date.now() - last);
		if (wait <= 0) {
			last = Date.now();
			fn(...args);
		} else if (!timer) timer = setTimeout(() => ((timer = null), (last = Date.now()), fn(...args)), wait);
	};
	wrapped.cancel = () => (timer && clearTimeout(timer), (timer = null));
	return wrapped;
};

/**
 * WebSocket state: `{ status, lastMessage, messages, send, close, open }`.
 * `status` is a cell: `'connecting' | 'open' | 'closed' | 'error'`. Messages
 * are JSON-parsed when possible. Without a `WebSocket` global (SSR/tests)
 * everything stays `'closed'` and `send` is a no-op returning `false`.
 */
const useWebSocket = (url, { onMessage, protocols, json = true } = {}) => {
	const status = reactive.signal('closed');
	const lastMessage = reactive.signal(null);
	const messages = reactive.signal([]);
	let socket = null;
	const parse = (data) => {
		if (!json) return data;
		try { return JSON.parse(data); } catch { return data; }
	};
	const open = () => {
		if (typeof WebSocket === 'undefined' || !url) return null;
		close();
		reactive.write(status, 'connecting');
		socket = protocols ? new WebSocket(val(url), protocols) : new WebSocket(val(url));
		socket.onopen = () => reactive.write(status, 'open');
		socket.onclose = () => reactive.write(status, 'closed');
		socket.onerror = () => reactive.write(status, 'error');
		socket.onmessage = (event) => {
			const data = parse(event.data);
			reactive.write(lastMessage, data);
			reactive.write(messages, [...reactive.read(messages), data]);
			onMessage?.(data, event);
		};
		return socket;
	};
	const close = () => {
		try { socket?.close(); } catch { /* already gone */ }
		socket = null;
	};
	const send = (data) => {
		if (!socket || reactive.read(status) !== 'open') return false;
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
const useEventSource = (url, { onMessage, withCredentials } = {}) => {
	const status = reactive.signal('closed');
	const lastMessage = reactive.signal(null);
	const messages = reactive.signal([]);
	let source = null;
	if (typeof EventSource !== 'undefined' && url) {
		reactive.write(status, 'connecting');
		source = new EventSource(val(url), { withCredentials });
		source.onopen = () => reactive.write(status, 'open');
		source.onerror = () => reactive.write(status, 'error');
		source.onmessage = (event) => {
			let data = event.data;
			try { data = JSON.parse(data); } catch { /* plain text event */ }
			reactive.write(lastMessage, data);
			reactive.write(messages, [...reactive.read(messages), data]);
			onMessage?.(data, event);
		};
	}
	return { status, lastMessage, messages, close: () => (source?.close(), reactive.write(status, 'closed')), source: () => source };
};

/**
 * Cross-tab messaging over `BroadcastChannel`:
 * `{ lastMessage, messages, post, close, supported }` (guarded when absent).
 */
const useBroadcastChannel = (name, { onMessage } = {}) => {
	const lastMessage = reactive.signal(null);
	const messages = reactive.signal([]);
	let channel = null;
	let supported = typeof BroadcastChannel !== 'undefined';
	if (supported && name) {
		channel = new BroadcastChannel(val(name));
		channel.onmessage = (event) => {
			reactive.write(lastMessage, event.data);
			reactive.write(messages, [...reactive.read(messages), event.data]);
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
const useFetch = (url, options) => {
	const base = useAsync(async (target, opts) => {
		const res = await fetch(target ?? val(url), opts ?? options);
		if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
		const type = res.headers?.get?.('content-type') || '';
		return type.includes('json') ? res.json() : res.text();
	});
	let controller = null;
	const run = (target, opts) => {
		controller?.abort?.();
		controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
		return base.run(target, { ...opts, signal: controller?.signal });
	};
	return { ...base, run, abort: () => controller?.abort?.() };
};

/* ------------------------------------------------------------ browser APIs */

/** geolocation: `{ position, error, loading, refresh, supported }` */
const useGeolocation = ({ immediate = false } = {}) => {
	const position = reactive.signal(null);
	const error = reactive.signal(null);
	const loading = reactive.signal(false);
	const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;
	const refresh = () => {
		if (!supported) return;
		reactive.write(loading, true);
		navigator.geolocation.getCurrentPosition(
			(pos) => (reactive.write(position, pos), reactive.write(loading, false)),
			(err) => (reactive.write(error, err), reactive.write(loading, false))
		);
	};
	if (immediate) refresh();
	return { position, error, loading, refresh, supported };
};

/** `'visible' | 'hidden'` cell for the document, kept live */
const useDocumentVisibility = () => {
	const visibility = reactive.signal(typeof document === 'undefined' ? 'visible' : document.visibilityState || 'visible');
	if (typeof document !== 'undefined') on(document, 'visibilitychange', () => reactive.write(visibility, document.visibilityState));
	return visibility;
};

/** boolean cell: whether the window currently has focus */
const useWindowFocus = () => {
	const focused = reactive.signal(typeof document === 'undefined' ? true : document.hasFocus?.() ?? true);
	if (typeof window !== 'undefined') {
		on(window, 'focus', () => reactive.write(focused, true));
		on(window, 'blur', () => reactive.write(focused, false));
	}
	return focused;
};

/** `{ x, y, direction }` scroll cell for the window */
const useScrollPosition = () => {
	const pos = reactive.signal({ x: 0, y: 0, direction: 'none' });
	let lastY = 0;
	if (typeof window !== 'undefined') {
		on(window, 'scroll', () => {
			const y = window.scrollY || 0;
			reactive.write(pos, { x: window.scrollX || 0, y, direction: y > lastY ? 'down' : y < lastY ? 'up' : 'none' });
			lastY = y;
		}, { passive: true });
	}
	return pos;
};
/** alias */
const useScroll = useScrollPosition;

/** body scroll lock with reference counting: `{ lock, unlock, locked }` */
const useScrollLock = () => {
	const locked = reactive.signal(false);
	let count = 0;
	let previous = '';
	const apply = () => {
		if (typeof document === 'undefined') return;
		if (count > 0 && !reactive.read(locked)) (previous = document.body.style.overflow, document.body.style.overflow = 'hidden', reactive.write(locked, true));
		else if (count <= 0 && reactive.read(locked)) (document.body.style.overflow = previous, reactive.write(locked, false));
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
const useFocusTrap = () => {
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
const useFullscreen = (target) => {
	const fullscreen = reactive.signal(false);
	const supported = typeof document !== 'undefined' && !!document.documentElement?.requestFullscreen;
	const sync = () => reactive.write(fullscreen, typeof document !== 'undefined' && !!document.fullscreenElement);
	if (typeof document !== 'undefined') on(document, 'fullscreenchange', sync);
	const enter = () => targetOf(target)?.requestFullscreen?.() || document.documentElement.requestFullscreen?.();
	const exit = () => document.exitFullscreen?.();
	return { fullscreen, supported, enter, exit, toggle: () => (reactive.read(fullscreen) ? exit() : enter()) };
};

/** current breakpoint name from a `{ sm: 640, md: 768, … }` map (window-width based) */
const useBreakpoint = (breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 }) => {
	const sorted = Object.entries(breakpoints).sort((a, b) => a[1] - b[1]);
	const pick = () => {
		const w = typeof window === 'undefined' ? 0 : window.innerWidth;
		let current = 'base';
		for (const [name, min] of sorted) if (w >= min) current = name;
		return current;
	};
	const breakpoint = reactive.signal(pick());
	if (typeof window !== 'undefined') on(window, 'resize', () => reactive.write(breakpoint, pick()));
	return breakpoint;
};

/**
 * Colour scheme for `uele/themes`: `{ scheme, dark, toggle, setScheme }`.
 * Follows `prefers-color-scheme`, remembers an explicit override in
 * `localStorage` (key `uele-scheme`) unless `persist: false`.
 */
const useColorScheme = ({ persist = true, key = 'uele-scheme', initial } = {}) => {
	const stored = () => {
		try { return persist ? localStorage.getItem(key) : null; } catch { return null; }
	};
	const media = () => {
		try {
			return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		} catch { return 'light'; }
	};
	const scheme = reactive.signal(initial || stored() || media());
	const dark = reactive.signal(reactive.read(scheme) === 'dark');
	const setScheme = (v) => {
		const next = typeof v === 'function' ? v(reactive.read(scheme)) : v;
		reactive.write(scheme, next);
		reactive.write(dark, next === 'dark');
		try { persist && localStorage.setItem(key, next); } catch { /* private mode */ }
	};
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		on(mql, 'change', () => !stored() && setScheme(media()));
	}
	return { scheme, dark, setScheme, toggle: () => setScheme(reactive.read(scheme) === 'dark' ? 'light' : 'dark') };
};
/** alias */
const useDarkMode = useColorScheme;

/** two-way sync with one URL query param: `[value, setValue]` (pushState + popstate) */
const useQueryParam = (key, initial = '') => {
	const readParam = () => {
		try { return new URLSearchParams(window.location.search).get(key) ?? initial; } catch { return initial; }
	};
	const cell = reactive.signal(typeof window === 'undefined' ? initial : readParam());
	const setValue = (v) => {
		const next = typeof v === 'function' ? v(reactive.read(cell)) : v;
		reactive.write(cell, next);
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (next == null || next === '') url.searchParams.delete(key);
		else url.searchParams.set(key, String(next));
		window.history.pushState(null, '', url);
	};
	if (typeof window !== 'undefined') on(window, 'popstate', () => reactive.write(cell, readParam()));
	return [cell, setValue];
};

/** cookie value cell: reads on create, `setValue(v, days)` writes, `setValue(null)` deletes */
const useCookie = (name, initial = '') => {
	const readCookie = () => {
		try {
			const found = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
			return found ? decodeURIComponent(found.split('=').slice(1).join('=')) : initial;
		} catch { return initial; }
	};
	const cell = reactive.signal(typeof document === 'undefined' ? initial : readCookie());
	const setValue = (v, days = 365) => {
		const next = typeof v === 'function' ? v(reactive.read(cell)) : v;
		reactive.write(cell, next ?? '');
		if (typeof document === 'undefined') return;
		const expires = next == null ? 'Thu, 01 Jan 1970 00:00:00 GMT' : new Date(Date.now() + days * 864e5).toUTCString();
		document.cookie = `${name}=${encodeURIComponent(next ?? '')}; expires=${expires}; path=/`;
	};
	return [cell, setValue];
};

/** boolean cell: true after `timeout` ms without mouse/key/touch activity */
const useIdle = (timeout = 60000) => {
	const idle = reactive.signal(false);
	let timer = null;
	const reset = () => {
		reactive.write(idle, false);
		clearTimeout(timer);
		timer = setTimeout(() => reactive.write(idle, true), timeout);
	};
	if (typeof window !== 'undefined') for (const evt of ['mousemove', 'mousedown', 'keydown', 'touchstart']) on(window, evt, reset, { passive: true });
	reset();
	return idle;
};

/** long-press bind props: spread on an element, `handler` fires after `delay` ms held */
const useLongPress = (handler, delay = 500) => {
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
const useSwipe = ({ threshold = 40, ...handlers } = {}) => {
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
const useAnimationFrame = (callback) => {
	const running = reactive.signal(false);
	let frame = null;
	let last = 0;
	const loop = (time) => {
		callback(time, last ? time - last : 0);
		last = time;
		if (reactive.read(running)) frame = requestAnimationFrame(loop);
	};
	const start = () => {
		if (reactive.read(running) || typeof requestAnimationFrame === 'undefined') return;
		reactive.write(running, true);
		last = 0;
		frame = requestAnimationFrame(loop);
	};
	const stop = () => (reactive.write(running, false), frame != null && cancelAnimationFrame(frame), (frame = null));
	return { start, stop, running };
};
/** alias */
const useRaf = useAnimationFrame;

/** just the boolean from `useIntersectionObserver`, for a getter/element/ref */
const useInView = (target, options) => {
	const io = useIntersectionObserver(options);
	if (target) io.ref(targetOf(target));
	return io.visible;
};

/** set `document.title` from a value/cell/thunk, restoring the old title on `restore()` */
const useTitle = (title) => {
	const previous = typeof document === 'undefined' ? '' : document.title;
	const apply = (v) => { if (typeof document !== 'undefined') document.title = v == null ? '' : String(v); };
	if (uele.is(title) || typeof title === 'function') uele.sub(title, apply, () => {});
	else apply(val(title));
	return { restore: () => apply(previous) };
};

/** a cell that always mirrors the latest value of a source (read it in callbacks) */
const useLatest = (source) => {
	const latest = reactive.signal(val(source));
	uele.sub(source, (v) => reactive.write(latest, v));
	return latest;
};

/** `[mounted, isMounted]` — true from creation until `unmount()` (call it on teardown) */
const useIsMounted = () => {
	const mounted = reactive.signal(true);
	return [mounted, () => reactive.read(mounted), () => reactive.write(mounted, false)];
};

/** element-size hook with the friendlier name (same as `useResizeObserver`) */
const useElementSize = useResizeObserver;

Object.defineProperty(exports, "batch", {
	enumerable: true,
	get: function () { return reactive.batch; }
});
Object.defineProperty(exports, "canCompute", {
	enumerable: true,
	get: function () { return reactive.canCompute; }
});
Object.defineProperty(exports, "canEffect", {
	enumerable: true,
	get: function () { return reactive.canEffect; }
});
Object.defineProperty(exports, "computed", {
	enumerable: true,
	get: function () { return reactive.computed; }
});
Object.defineProperty(exports, "effect", {
	enumerable: true,
	get: function () { return reactive.effect; }
});
Object.defineProperty(exports, "isCell", {
	enumerable: true,
	get: function () { return reactive.isCell; }
});
Object.defineProperty(exports, "read", {
	enumerable: true,
	get: function () { return reactive.read; }
});
Object.defineProperty(exports, "signal", {
	enumerable: true,
	get: function () { return reactive.signal; }
});
Object.defineProperty(exports, "untracked", {
	enumerable: true,
	get: function () { return reactive.untracked; }
});
Object.defineProperty(exports, "write", {
	enumerable: true,
	get: function () { return reactive.write; }
});
exports.paginationRange = paginationRange;
exports.useAnimationFrame = useAnimationFrame;
exports.useArray = useArray;
exports.useAsync = useAsync;
exports.useBoolean = useBoolean;
exports.useBreakpoint = useBreakpoint;
exports.useBroadcastChannel = useBroadcastChannel;
exports.useClickOutside = useClickOutside;
exports.useClipboard = useClipboard;
exports.useClock = useClock;
exports.useColorScheme = useColorScheme;
exports.useComputed = useComputed;
exports.useControllable = useControllable;
exports.useCookie = useCookie;
exports.useCountdown = useCountdown;
exports.useCounter = useCounter;
exports.useDarkMode = useDarkMode;
exports.useDebounce = useDebounce;
exports.useDebounceFn = useDebounceFn;
exports.useDisclosure = useDisclosure;
exports.useDocumentVisibility = useDocumentVisibility;
exports.useEffect = useEffect;
exports.useElementSize = useElementSize;
exports.useEventListener = useEventListener;
exports.useEventSource = useEventSource;
exports.useFetch = useFetch;
exports.useFocus = useFocus;
exports.useFocusTrap = useFocusTrap;
exports.useForm = useForm;
exports.useFullscreen = useFullscreen;
exports.useGeolocation = useGeolocation;
exports.useHistory = useHistory;
exports.useHotkey = useHotkey;
exports.useHover = useHover;
exports.useId = useId;
exports.useIdle = useIdle;
exports.useInView = useInView;
exports.useIntersectionObserver = useIntersectionObserver;
exports.useInterval = useInterval;
exports.useIsMounted = useIsMounted;
exports.useKeyPress = useKeyPress;
exports.useLatest = useLatest;
exports.useList = useList;
exports.useLocalStorage = useLocalStorage;
exports.useLongPress = useLongPress;
exports.useMediaQuery = useMediaQuery;
exports.useNow = useNow;
exports.useOTP = useOTP;
exports.useOnline = useOnline;
exports.usePagination = usePagination;
exports.usePinInput = usePinInput;
exports.usePrevious = usePrevious;
exports.useQueryParam = useQueryParam;
exports.useRaf = useRaf;
exports.useResizeObserver = useResizeObserver;
exports.useScroll = useScroll;
exports.useScrollLock = useScrollLock;
exports.useScrollPosition = useScrollPosition;
exports.useSessionStorage = useSessionStorage;
exports.useSignal = useSignal;
exports.useStopwatch = useStopwatch;
exports.useSwipe = useSwipe;
exports.useThrottle = useThrottle;
exports.useThrottleFn = useThrottleFn;
exports.useTimeout = useTimeout;
exports.useTitle = useTitle;
exports.useToggle = useToggle;
exports.useWebSocket = useWebSocket;
exports.useWindowFocus = useWindowFocus;
exports.useWindowSize = useWindowSize;
