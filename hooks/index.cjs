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
exports.useArray = useArray;
exports.useAsync = useAsync;
exports.useBoolean = useBoolean;
exports.useClickOutside = useClickOutside;
exports.useClipboard = useClipboard;
exports.useComputed = useComputed;
exports.useControllable = useControllable;
exports.useCountdown = useCountdown;
exports.useCounter = useCounter;
exports.useDebounce = useDebounce;
exports.useDebounceFn = useDebounceFn;
exports.useDisclosure = useDisclosure;
exports.useEffect = useEffect;
exports.useEventListener = useEventListener;
exports.useFocus = useFocus;
exports.useForm = useForm;
exports.useHistory = useHistory;
exports.useHotkey = useHotkey;
exports.useHover = useHover;
exports.useId = useId;
exports.useIntersectionObserver = useIntersectionObserver;
exports.useInterval = useInterval;
exports.useKeyPress = useKeyPress;
exports.useList = useList;
exports.useLocalStorage = useLocalStorage;
exports.useMediaQuery = useMediaQuery;
exports.useOTP = useOTP;
exports.useOnline = useOnline;
exports.usePagination = usePagination;
exports.usePinInput = usePinInput;
exports.usePrevious = usePrevious;
exports.useResizeObserver = useResizeObserver;
exports.useSessionStorage = useSessionStorage;
exports.useSignal = useSignal;
exports.useTimeout = useTimeout;
exports.useToggle = useToggle;
exports.useWindowSize = useWindowSize;
