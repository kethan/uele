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
const set = (cell, v) => write(cell, typeof v === 'function' ? v(val(cell)) : v);
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

export { signal, computed, read, write, effect, batch, untracked, isCell, canEffect, canCompute };
