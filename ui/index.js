/**
 * Headless UI primitives for `uele` — Radix-style, but signal-native.
 *
 *     import { Button, Input, Tabs, Dialog, Pagination, OTPInput } from "uele/ui";
 *
 * Every primitive is a thin `h()` wrapper with sensible defaults and works as
 * a JSX tag or a plain call. Every prop is LIVE: pass a signal anywhere a value
 * is expected (`disabled`, `value`, `class`, `style`) and it updates on change.
 * Form controls take `model` for two-way binding (a writable cell or a setter
 * function); pass the cell as `value`/`checked` instead and it becomes the model
 * automatically. State components (Tabs, Dialog, Pagination, OTP…) follow the
 * Radix controlled/uncontrolled pattern: pass `model` (or `value`/`open`) to
 * control them, `defaultValue`/`defaultOpen` to seed them, `onChange` to listen.
 *
 * They are accessible by default (roles, `aria-*`, keyboard where it matters),
 * carry `data-state`/`data-*` hooks for styling, and read the `--uele-*` CSS
 * variables from `uele/themes` (with light-theme fallbacks), so a theme swap
 * restyles everything with one reactive write. Zero dependencies.
 */
import { h, is, get, sub } from 'uele';
import { write, read, signal, isCell } from 'uele/reactive';
import { paginationRange } from 'uele/hooks';
import { onTeardown } from '../props/internal.js';

export { paginationRange };

/* --------------------------------------------------------------- helpers */

/** unwrap a maybe-reactive value (cell, thunk or plain) to its current value */
const val = (x) => (x == null || (typeof x !== 'object' && typeof x !== 'function') ? x : get(x));
/** jsx hands `[]` for no children; direct calls hand anything */
const hasKids = (c) => (Array.isArray(c) ? c.length > 0 : c != null && c !== '');
const kidsOf = (c) => (hasKids(c) ? c : null);

/** an internal cell even before a preset is installed (degraded: plain `.value` box) */
const own = (initial) => {
	try {
		return signal(initial);
	} catch {
		// no preset installed: a minimal callable cell. Callable so the
		// placeholder `api.get` (`v => v()`) can read it, `.write`/`.value`
		// so reactive `write()` and direct assignment update it, and
		// `.subscribe` so bindings can follow it where a runner exists.
		let v = initial;
		const subs = new Set();
		const set = (n) => { v = n; subs.forEach((f) => f(n)); };
		const cell = () => v;
		cell.write = set;
		Object.defineProperty(cell, 'value', {
			/* istanbul ignore next -- parity accessor: library reads go through get(), never .value; kept so the fallback quacks like a real cell */
			get: () => v,
			set, enumerable: true, configurable: true
		});
		cell.subscribe = (fn) => {
			subs.add(fn);
			fn(v);
			/* istanbul ignore next -- internal subscriptions (Dialog scroll lock, core bindings) drop the handle by design; only external holders can unsubscribe */
			return { unsubscribe: () => subs.delete(fn) };
		};
		return cell;
	}
};

/**
 * A null-rendering thunk child that runs `fn` when the region enclosing the
 * component discards its subtree (the preset's `api.cleanup`, like `Title`).
 * Document listeners, intervals and observers must not outlive their component.
 */


/**
 * Radix-style controllable state. `controlled` may be a cell, a plain value or
 * `undefined` (uncontrolled, seeded by `initial`). Returns `[read, write]`
 * thunks; the write also fires `onChange`.
 */
const controllable = (controlled, initial, onChange) => {
	const inner = own(initial);
	const readValue = () => (controlled !== undefined ? val(controlled) : read(inner));
	const writeValue = (v) => {
		/* istanbul ignore next -- updater form kept for parity with useControllable; no ui component passes a function */
		const next = typeof v === 'function' ? v(readValue()) : v;
		if (isCell(controlled)) write(controlled, next);
		else if (controlled === undefined) write(inner, next);
		onChange?.(next);
	};
	return [readValue, writeValue];
};

/** `value`/`checked` display live (h's job); this wires the write-back */
const model = (el, cell, event, key) => {
	if (!cell) return;
	el.addEventListener(event, () => write(cell, key ? el[key] : el.value));
};
const modelCell = (cell, fallbackProp, handler) => cell ?? (handler === undefined && is(fallbackProp) ? fallbackProp : null);

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

/* ------------------------------------------------------------------ forms */

export const Form = ({ onSubmit, children, ...props } = {}) =>
	h('form', {
		...props,
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit?.(e);
		}
	}, children);

export const Field = ({ label, children, ...props } = {}) =>
	h('label', props, label, ' ', children);

export const Label = ({ children, ...props } = {}) => h('label', props, children);

/** small muted helper text under a field (a styled span: `<small>` hits the MathML tag heuristic) */
export const FieldHint = ({ children, ...props } = {}) =>
	h('span', { ...props, style: { display: 'block', fontSize: '0.8125rem', color: 'var(--uele-text-muted, #64748b)', ...props.style } }, children);

/** field error text: announces itself (`role="alert"`) when it has content */
export const FieldError = ({ children, ...props } = {}) =>
	h('span', { role: 'alert', ...props, style: { display: 'block', fontSize: '0.8125rem', color: 'var(--uele-danger, #dc2626)', ...props.style } }, children);

export const Button = ({ variant, size, children, ...props } = {}) =>
	h('button', {
		type: 'button',
		...props,
		...(variant ? { 'data-variant': variant } : {}),
		...(size ? { 'data-size': size } : {}),
		style: {
			...(variant === 'solid'
				? { background: 'var(--uele-accent, #2563eb)', color: 'var(--uele-accent-text, #fff)', border: '1px solid transparent' }
				: variant === 'outline'
					? { background: 'transparent', color: 'var(--uele-text, #0f172a)', border: '1px solid var(--uele-border, #e2e8f0)' }
					: variant === 'ghost'
						? { background: 'transparent', color: 'var(--uele-text, #0f172a)', border: '1px solid transparent' }
						: {}),
			...(size === 'sm' ? { padding: '0.25rem 0.625rem', fontSize: '0.875rem' } : size === 'lg' ? { padding: '0.625rem 1.25rem', fontSize: '1.125rem' } : {}),
			borderRadius: 'var(--uele-radius, 10px)',
			cursor: 'pointer',
			...props.style
		}
	}, children);

export const Input = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = h('input', { type: 'text', ...props, value: value ?? (is(cell) ? cell : null), onInput });
	model(el, modelCell(cell, value, onInput), 'input'); // model (or a writable value) = two-way
	return el;
};

export const Textarea = ({ model: cell, onInput, value, children, ...props } = {}) => {
	// string children are the initial value, as in HTML; explicit value/model win
	const kids = kidsOf(children);
	const text = typeof kids === 'string' ? kids : (Array.isArray(kids) && kids.every((c) => typeof c === 'string') ? kids.join('') : null);
	const el = h('textarea', { ...props, value: value ?? (is(cell) ? cell : null) ?? text, onInput });
	model(el, modelCell(cell, value, onInput), 'input');
	return el;
};

export const Checkbox = ({ model: cell, onChange, checked, label, children, ...props } = {}) => {
	const el = h('input', { type: 'checkbox', ...props, checked: checked ?? (is(cell) ? cell : null), onChange });
	model(el, modelCell(cell, checked, onChange), 'change', 'checked');
	// like Radio: label text (children or `label`) wraps the input in a <label>
	const content = kidsOf(children) ?? label;
	return content != null ? h('label', null, el, ' ', content) : el;
};

export const Option = ({ children, ...props } = {}) => h('option', props, children);

export const Select = ({ model: cell, onChange, value, options, children, ...props } = {}) => {
	// jsx hands an empty `[]` over when there are no children, so fall back on `options`
	const kids = Array.isArray(children) ? (children.length ? children : null) : children ?? null;
	const el = h('select', { ...props, value: value ?? (is(cell) ? cell : null), onChange }, kids ?? (options || []).map((o) =>
		typeof o === 'object' ? h('option', { value: o.value }, o.label) : h('option', { value: o }, o)
	));
	model(el, modelCell(cell, value, onChange), 'change');
	return el;
};

/** a single radio input; usually rendered by `RadioGroup` (which supplies `name`/`model`) */
export const Radio = ({ model: cell, value, label, children, onChange, ...props } = {}) => {
	const input = h('input', {
		type: 'radio',
		...props,
		value,
		checked: cell !== undefined ? () => val(cell) === value : props.checked,
		onChange: (e) => {
			if (e.target.checked) {
				if (isCell(cell)) write(cell, value);
				onChange?.(value, e);
			}
		}
	});
	const content = kidsOf(children) ?? label;
	return content != null ? h('label', null, input, ' ', content) : input;
};

/** `role="radiogroup"` over `options` (strings or `{value,label,disabled}`), or your own `<Radio>` children */
export const RadioGroup = ({ model: cell, value, name, options, onChange, children, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, undefined, onChange);
	const groupName = name || nextId('uele-radio');
	return h('div', { role: 'radiogroup', ...props }, hasKids(children) ? children : (options || []).map((o) => {
		const opt = typeof o === 'object' ? o : { value: o, label: o };
		const input = h('input', {
			type: 'radio', name: groupName, value: opt.value, disabled: opt.disabled,
			checked: () => current() === opt.value,
			onChange: (e) => e.target.checked && setCurrent(opt.value)
		});
		return h('label', null, input, ' ', opt.label);
	}));
};

/** Radix-style switch: a `role="switch"` button, two-way via `model`/`checked` */
export const Switch = ({ model: cell, checked, onChange, onCheckedChange, label, children, ...props } = {}) => {
	const controlled = cell ?? checked;
	const [on, setOn] = controllable(controlled, false, onCheckedChange || onChange);
	let offPaint = null;
	const el = h('button', {
		type: 'button',
		role: 'switch',
		...props,
		'aria-checked': () => String(!!on()),
		'data-state': () => (on() ? 'checked' : 'unchecked'),
		'data-checked': () => String(!!on()),
		style: {
			width: '2.5rem', height: '1.375rem', borderRadius: 'var(--uele-radius-full, 9999px)',
			border: '1px solid var(--uele-border, #e2e8f0)', cursor: 'pointer',
			...props.style
		}
	}, kidsOf(children) ?? label ?? '', onTeardown(() => offPaint?.()));
	// live background follows state through a function child region is overkill: track with sub when reactive
	el.style.background = 'var(--uele-border, #e2e8f0)';
	const paint = () => (el.style.background = on() ? 'var(--uele-accent, #2563eb)' : 'var(--uele-border, #e2e8f0)');
	paint();
	if (is(controlled)) offPaint = sub(controlled, paint, () => {});
	el.addEventListener('click', () => setOn(!on()));
	return el;
};

/** `role="slider"` range input, two-way via `model`; writes numbers */
export const Slider = ({ model: cell, value, min = 0, max = 100, step = 1, onChange, children, ...props } = {}) => {
	const el = h('input', {
		type: 'range', min, max, step, ...props,
		value: value ?? (is(cell) ? cell : null),
		'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': () => Number(val(cell ?? value) ?? min)
	});
	el.addEventListener('input', () => {
		const target = modelCell(cell, value, onChange);
		if (target) write(target, Number(el.value));
		onChange?.(Number(el.value));
	});
	return el;
};

/** star rating: `role="radiogroup"` of `role="radio"` star buttons, two-way via `model` */
export const Rating = ({ model: cell, value, max = 5, onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, 0, onChange);
	return h('div', {
		role: 'radiogroup', 'aria-label': label || 'Rating', ...props,
		style: { display: 'inline-flex', gap: '0.125rem', ...props.style },
		onkeydown: (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setCurrent(Math.min(max, (current() || 0) + 1));
			if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setCurrent(Math.max(0, (current() || 0) - 1));
		}
	}, Array.from({ length: max }, (_, i) => {
		const star = i + 1;
		return h('button', {
			type: 'button', role: 'radio',
			'aria-label': `${star} star${star > 1 ? 's' : ''}`,
			'aria-checked': () => String(current() === star),
			'data-value': star,
			style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.125rem' },
			onclick: () => setCurrent(star)
		}, () => ((current() || 0) >= star ? '★' : '☆'));
	}));
};

/** number stepper: − / input / + with clamping, two-way via `model` */
export const NumberInput = ({ model: cell, value, min = -Infinity, max = Infinity, step = 1, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, 0, onChange);
	const clamp = (v) => Math.min(max, Math.max(min, v));
	const input = h('input', {
		type: 'number', min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null, step, ...props,
		value: () => (current() ?? ''),
		onInput: (e) => {
			const n = e.target.value === '' ? '' : Number(e.target.value);
			if (typeof n === 'number' && !Number.isNaN(n)) setCurrent(clamp(n));
		}
	});
	const btn = (labelText, delta) => h('button', {
		type: 'button', 'aria-label': labelText, onclick: () => setCurrent(clamp((Number(current()) || 0) + delta)),
		style: { cursor: 'pointer' }
	}, labelText === 'Decrement' ? '−' : '+');
	return h('div', { 'data-uele-number-input': '', style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } }, btn('Decrement', -step), input, btn('Increment', step));
};

/** search input with a clear button */
export const SearchInput = ({ model: cell, value, onInput, onSearch, placeholder = 'Search…', ...props } = {}) => {
	const input = Input({ model: cell, value, onInput, type: 'search', placeholder, ...props });
	const clear = h('button', {
		type: 'button', 'aria-label': 'Clear search',
		onclick: () => {
			const target = modelCell(cell, value, onInput);
			if (target) write(target, '');
			input.value = '';
			onSearch?.('');
			input.focus?.();
		}
	}, '×');
	input.addEventListener('input', () => onSearch?.(input.value));
	return h('div', { 'data-uele-search': '', style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } }, input, clear);
};

/**
 * One-time-code / PIN input: `length` boxes, auto-advance, backspace-back,
 * paste-to-fill, `onComplete(code)` when full. Two-way via `model` (a string cell).
 */
export const OTPInput = ({ length = 6, model: cell, value, onChange, onComplete, label, ...props } = {}) => {
	const [code, setCode] = controllable(cell ?? value, '', onChange);
	const inputs = [];
	const digitsOf = () => String(code() || '').padEnd(length, '').slice(0, length).split('');
	const writeDigit = (index, raw) => {
		const clean = String(raw).replace(/\D/g, ''); // both callers (input event, paste) always pass a string
		const digits = digitsOf();
		if (!clean) digits[index] = '';
		else clean.split('').forEach((c, i) => { if (index + i < length) digits[index + i] = c; });
		const stored = digits.join('').replace(/\s+$/g, '');
		setCode(stored);
		const filled = stored.replace(/\s/g, '');
		if (clean && index + clean.length < length) inputs[Math.min(length - 1, index + clean.length)]?.focus();
		if (filled.length === length) onComplete?.(filled);
		return stored;
	};
	const host = h('div', {
		role: 'group', 'aria-label': label || 'One-time code',
		'data-uele-otp': '', ...props,
		style: { display: 'inline-flex', gap: '0.375rem', ...props.style },
		onpaste: (e) => {
			e.preventDefault();
			writeDigit(0, e.clipboardData?.getData('text') || '');
		}
	}, Array.from({ length }, (_, i) => {
		const input = h('input', {
			type: 'text', inputMode: 'numeric', autocomplete: i === 0 ? 'one-time-code' : 'off',
			maxLength: 1, 'aria-label': `Digit ${i + 1}`, 'data-index': i,
			value: () => digitsOf()[i]?.trim() || '',
			onInput: (e) => writeDigit(i, e.target.value),
			onkeydown: (e) => {
				if (e.key === 'Backspace' && !e.target.value && i > 0) inputs[i - 1]?.focus();
				if (e.key === 'ArrowLeft' && i > 0) inputs[i - 1]?.focus();
				if (e.key === 'ArrowRight' && i < length - 1) inputs[i + 1]?.focus();
			}
		});
		inputs.push(input);
		return input;
	}));
	host.dataset.length = String(length);
	return host;
};

/** tag/chip editor over an array cell: Enter or comma adds, × / Backspace removes */
export const TagInput = ({ model: cell, value, placeholder = 'Add a tag…', onChange, ...props } = {}) => {
	const [tags, setTags] = controllable(cell ?? value, [], onChange);
	const input = h('input', {
		type: 'text', placeholder,
		onkeydown: (e) => {
			if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
				e.preventDefault();
				setTags([...(tags() || []), input.value.trim()]);
				input.value = '';
			} else if (e.key === 'Backspace' && !input.value && (tags() || []).length) {
				setTags(tags().slice(0, -1));
			}
		}
	});
	const chips = () => (tags() || []).map((tag, i) =>
		h('span', { 'data-tag': tag, style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center', background: 'var(--uele-accent-soft, #eff6ff)', borderRadius: 'var(--uele-radius-full, 9999px)', padding: '0.125rem 0.5rem' } },
			String(tag),
			h('button', { type: 'button', 'aria-label': `Remove ${tag}`, onclick: () => setTags(tags().filter((_, j) => j !== i)) }, '×'))
	);
	return h('div', { 'data-uele-tags': '', ...props, style: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center', ...props.style } }, () => chips(), input);
};

/** label + hidden file input; `onFiles(File[])` on pick */
export const FileInput = ({ onFiles, onChange, accept, multiple, label, children, ...props } = {}) => {
	const input = h('input', {
		type: 'file', accept, multiple, hidden: true, ...props,
		onChange: (e) => {
			const files = [...(e.target.files || [])];
			onFiles?.(files);
			onChange?.(files);
		}
	});
	return h('label', { 'data-uele-file': '', style: { display: 'inline-flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' } },
		input, kidsOf(children) ?? label ?? 'Choose file');
};

/** drag-and-drop file target with a click-to-browse fallback */
export const Dropzone = ({ onFiles, accept, multiple, children, ...props } = {}) => {
	let input;
	const zone = h('div', {
		'data-uele-dropzone': '', role: 'button', tabIndex: 0,
		'aria-label': 'Drop files here or click to browse',
		...props,
		style: { border: '1px dashed var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', padding: '1rem', textAlign: 'center', cursor: 'pointer', ...props.style },
		onclick: () => input?.click(),
		ondragover: (e) => (e.preventDefault(), zone.setAttribute('data-dragover', 'true')),
		ondragleave: () => zone.removeAttribute('data-dragover'),
		ondrop: (e) => {
			e.preventDefault();
			zone.removeAttribute('data-dragover');
			onFiles?.([...(e.dataTransfer?.files || [])]);
		}
	}, kidsOf(children) ?? 'Drop files here, or click to browse');
	input = h('input', { type: 'file', accept, multiple, hidden: true, onChange: (e) => onFiles?.([...(e.target.files || [])]) });
	zone.append(input);
	return zone;
};

/** combobox: filterable single-select over `options`, two-way via `model` */
export const Combobox = ({ model: cell, value, options = [], placeholder = 'Select…', onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, '', onChange);
	const open = own(false);
	const query = own(val(cell ?? value) || '');
	const optionList = () => {
		const all = val(options) || [];
		const q = String(read(query) || '').toLowerCase();
		return all.map((o) => (typeof o === 'object' ? o : { value: o, label: o })).filter((o) => !q || String(o.label).toLowerCase().includes(q));
	};
	const input = h('input', {
		type: 'text', role: 'combobox', 'aria-expanded': () => String(!!read(open)), 'aria-label': label || placeholder,
		placeholder, ...props, value: () => read(query),
		onInput: (e) => (write(query, e.target.value), write(open, true)),
		onfocus: () => write(open, true),
		onkeydown: (e) => {
			if (e.key === 'Escape') write(open, false);
			if (e.key === 'ArrowDown') write(open, true);
		}
	});
	const list = h('ul', { role: 'listbox', hidden: () => !read(open), style: { listStyle: 'none', margin: 0, padding: 0 } },
		() => optionList().map((o) => h('li', {
			role: 'option', 'data-value': o.value, 'aria-selected': () => String(current() === o.value),
			style: { cursor: 'pointer', padding: '0.375rem 0.5rem' },
			onclick: () => (setCurrent(o.value), write(query, String(o.label)), write(open, false))
		}, String(o.label))));
	const toggle = h('button', {
		type: 'button', 'aria-label': 'Toggle options', tabindex: -1,
		onclick: () => write(open, !read(open))
	}, '▾');
	return h('div', { 'data-uele-combobox': '', style: { position: 'relative', display: 'inline-block' } }, input, toggle, list);
};

/* ------------------------------------------------------- layout & structure */

export const Card = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { padding: '1rem', border: '1px solid var(--uele-border, #ddd)', borderRadius: 'var(--uele-radius-lg, 8px)', background: 'var(--uele-surface, #fff)', ...props.style } }, children);

export const Stack = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', ...props.style } }, children);

export const Row = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', ...props.style } }, children);

/** CSS grid wrapper: `columns` is a count or a `grid-template-columns` string */
export const Grid = ({ columns = 2, gap = '0.75rem', children, ...props } = {}) =>
	h('div', {
		...props,
		style: {
			display: 'grid', gap,
			gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns,
			...props.style
		}
	}, children);

/** centered page container */
export const Container = ({ maxWidth = '72rem', children, ...props } = {}) =>
	h('div', { ...props, style: { maxWidth, marginInline: 'auto', paddingInline: '1rem', width: '100%', boxSizing: 'border-box', ...props.style } }, children);

/** flexbox centering wrapper */
export const Center = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', ...props.style } }, children);

/** flexible spacer (`size` pins it, otherwise it grows) */
export const Spacer = ({ size, ...props } = {}) =>
	h('div', { 'aria-hidden': 'true', ...props, style: size ? { width: size, height: size, flex: 'none' } : { flex: '1 1 auto' } });

/** horizontal/vertical rule with separator semantics */
export const Separator = ({ orientation = 'horizontal', decorative = true, ...props } = {}) =>
	h('div', {
		role: decorative ? undefined : 'separator',
		'aria-orientation': decorative ? undefined : orientation,
		'data-orientation': orientation,
		...props,
		style: orientation === 'vertical'
			? { width: '1px', alignSelf: 'stretch', background: 'var(--uele-border, #e2e8f0)', ...props.style }
			: { height: '1px', width: '100%', background: 'var(--uele-border, #e2e8f0)', border: 'none', ...props.style }
	});

/** keeps children at `ratio` (e.g. `16/9` or `1.777`) */
export const AspectRatio = ({ ratio = '16/9', children, ...props } = {}) =>
	h('div', { ...props, style: { aspectRatio: String(ratio), width: '100%', overflow: 'hidden', ...props.style } }, children);

/** scrollable region */
export const ScrollArea = ({ maxHeight = '16rem', children, ...props } = {}) =>
	h('div', { ...props, tabIndex: 0, style: { overflow: 'auto', maxHeight, ...props.style } }, children);

/* --------------------------------------------------------------- typography */

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
export const Heading = ({ level = 2, children, ...props } = {}) =>
	h(HEADINGS[Math.min(6, Math.max(1, level)) - 1], props, children);

export const Text = ({ as = 'p', children, ...props } = {}) => h(as, props, children);

export const Link = ({ href, children, ...props } = {}) =>
	h('a', { ...props, href, style: { color: 'var(--uele-accent, #2563eb)', ...props.style } }, children);

export const Kbd = ({ children, ...props } = {}) =>
	h('kbd', {
		...props,
		style: {
			fontFamily: 'ui-monospace, monospace', fontSize: '0.8125em', padding: '0.125rem 0.375rem',
			border: '1px solid var(--uele-border, #e2e8f0)', borderBottomWidth: '2px',
			borderRadius: 'var(--uele-radius-sm, 6px)', background: 'var(--uele-surface-hover, #f8fafc)', ...props.style
		}
	}, children);

export const Code = ({ children, ...props } = {}) =>
	h('code', {
		...props,
		style: { fontFamily: 'ui-monospace, monospace', fontSize: '0.875em', background: 'var(--uele-accent-soft, #f1f5f9)', padding: '0.125rem 0.375rem', borderRadius: 'var(--uele-radius-sm, 6px)', ...props.style }
	}, children);

export const Blockquote = ({ children, ...props } = {}) =>
	h('blockquote', {
		...props,
		style: { borderLeft: '3px solid var(--uele-accent, #2563eb)', marginInline: 0, paddingLeft: '1rem', color: 'var(--uele-text-muted, #64748b)', ...props.style }
	}, children);

export const List = ({ ordered, children, ...props } = {}) => h(ordered ? 'ol' : 'ul', props, children);
export const ListItem = ({ children, ...props } = {}) => h('li', props, children);

/* ------------------------------------------------------------ data display */

const TONES = {
	neutral: ['var(--uele-surface-hover, #f8fafc)', 'var(--uele-text, #0f172a)'],
	info: ['var(--uele-accent-soft, #eff6ff)', 'var(--uele-info, #0284c7)'],
	success: ['#f0fdf4', 'var(--uele-success, #16a34a)'],
	warning: ['#fffbeb', 'var(--uele-warning, #d97706)'],
	danger: ['#fef2f2', 'var(--uele-danger, #dc2626)']
};

export const Badge = ({ tone = 'neutral', variant, children, ...props } = {}) => {
	const key = TONES[tone] ? tone : 'neutral';
	const [bg, fg] = TONES[key];
	return h('span', {
		'data-tone': key, ...(variant ? { 'data-variant': variant } : {}), ...props,
		style: {
			display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem',
			borderRadius: 'var(--uele-radius-full, 9999px)', background: bg, color: fg, fontSize: '0.75rem', fontWeight: 600,
			...props.style
		}
	}, children);
};

export const Avatar = ({ src, alt, name, size = 40, fallback, children, ...props } = {}) => {
	const px = typeof size === 'number' ? `${size}px` : size;
	if (val(src)) {
		return h('img', {
			...props, src, alt: alt ?? val(name) ?? '', width: size, height: size,
			style: { width: px, height: px, borderRadius: '50%', objectFit: 'cover', ...props.style }
		});
	}
	const initials = () => {
		const n = String(val(name) || '').trim();
		return kidsOf(children) ?? fallback ?? (n ? n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?');
	};
	return h('span', {
		role: 'img', 'aria-label': alt ?? val(name) ?? 'Avatar', ...props,
		style: {
			display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: px, height: px,
			borderRadius: '50%', background: 'var(--uele-accent-soft, #eff6ff)', color: 'var(--uele-accent, #2563eb)',
			fontWeight: 600, overflow: 'hidden', ...props.style
		}
	}, () => initials());
};

export const Skeleton = ({ width = '100%', height = '1rem', circle, ...props } = {}) =>
	h('div', {
		'aria-hidden': 'true', 'data-uele-skeleton': '', ...props,
		style: { width, height, borderRadius: circle ? '50%' : 'var(--uele-radius, 10px)', background: 'var(--uele-surface-hover, #f1f5f9)', ...props.style }
	});

export const Spinner = ({ label = 'Loading', ...props } = {}) =>
	h('span', {
		role: 'status', 'aria-label': label, 'data-uele-spinner': '', ...props,
		style: {
			display: 'inline-block', width: '1rem', height: '1rem', borderRadius: '50%',
			border: '2px solid var(--uele-border, #e2e8f0)', borderTopColor: 'var(--uele-accent, #2563eb)',
			animation: 'uele-spin 0.8s linear infinite', ...props.style
		}
	});

export const Alert = ({ tone = 'info', title, children, ...props } = {}) => {
	const key = TONES[tone] ? tone : 'info';
	const [bg, fg] = TONES[key];
	return h('div', {
		role: key === 'danger' || key === 'warning' ? 'alert' : 'status',
		'data-tone': key, ...props,
		style: { background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 'var(--uele-radius, 10px)', padding: '0.75rem 1rem', ...props.style }
	}, title ? h('strong', null, title) : null, title && hasKids(children) ? ' ' : null, children);
};

export const Progress = ({ value, max = 100, label, ...props } = {}) => {
	const pct = () => Math.min(100, Math.max(0, ((Number(val(value)) || 0) / (Number(val(max)) || 100)) * 100));
	return h('div', {
		role: 'progressbar', 'aria-label': label || 'Progress',
		'aria-valuemin': 0, 'aria-valuemax': () => Number(val(max)) || 100, 'aria-valuenow': () => Math.round(Number(val(value)) || 0),
		...props,
		style: { height: '0.5rem', borderRadius: 'var(--uele-radius-full, 9999px)', background: 'var(--uele-surface-hover, #f1f5f9)', overflow: 'hidden', ...props.style }
	}, h('div', {
		'data-uele-progress-bar': '',
		style: { height: '100%', background: 'var(--uele-accent, #2563eb)', width: () => pct() + '%' }
	}));
};

/** KPI block: small label, big value, optional help/delta line */
export const Stat = ({ label, value, help, children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.25rem', ...props.style } },
		label ? h('span', { style: { color: 'var(--uele-text-muted, #64748b)', fontSize: '0.875rem' } }, label) : null,
		h('span', { style: { fontSize: '1.5rem', fontWeight: 700 } }, value ?? children),
		help ? h('span', { style: { color: 'var(--uele-text-muted, #64748b)', fontSize: '0.8125rem' } }, help) : null);

/** empty-state block */
export const Empty = ({ title, description, children, ...props } = {}) =>
	h('div', {
		'data-uele-empty': '', ...props,
		style: { textAlign: 'center', padding: '2rem 1rem', color: 'var(--uele-text-muted, #64748b)', ...props.style }
	},
		title ? h('strong', null, title) : null,
		description ? h('p', null, description) : null,
		children);

/* ------------------------------------------------------------------- table */

export const Table = ({ children, ...props } = {}) =>
	h('table', { ...props, style: { borderCollapse: 'collapse', width: '100%', ...props.style } }, children);
export const TableHead = ({ children, ...props } = {}) => h('thead', props, children);
export const TableBody = ({ children, ...props } = {}) => h('tbody', props, children);
export const TableRow = ({ children, ...props } = {}) => h('tr', props, children);
export const TableHeader = ({ children, ...props } = {}) =>
	h('th', { ...props, scope: props.scope || 'col', style: { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid var(--uele-border, #e2e8f0)', ...props.style } }, children);
export const TableCell = ({ children, ...props } = {}) =>
	h('td', { ...props, style: { padding: '0.5rem', borderBottom: '1px solid var(--uele-border, #e2e8f0)', ...props.style } }, children);

/* --------------------------------------------------------------- navigation */

export const BreadcrumbItem = ({ children, ...props } = {}) =>
	h('li', { ...props, style: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', ...props.style } }, children);
export const BreadcrumbLink = ({ href, current, children, ...props } = {}) =>
	h('a', { ...props, href, ...(current ? { 'aria-current': 'page' } : {}) }, children);
export const BreadcrumbSeparator = ({ children, ...props } = {}) =>
	h('span', { 'aria-hidden': 'true', ...props }, kidsOf(children) ?? '/');

/** `<Breadcrumb items={[{label, href}, …]} />` — the last item is the current page */
export const Breadcrumb = ({ items, separator = '/', children, ...props } = {}) => {
	const list = val(items) || [];
	const kids = hasKids(children) ? children : list.map((item, i) => {
		const last = i === list.length - 1;
		return BreadcrumbItem({
			children: [
				last || !item.href
					? h('span', last ? { 'aria-current': 'page' } : null, item.label)
					: BreadcrumbLink({ href: item.href, children: item.label }),
				last ? null : BreadcrumbSeparator({ children: separator })
			]
		});
	});
	return h('nav', { 'aria-label': 'Breadcrumb', ...props }, h('ol', { style: { display: 'flex', gap: '0.375rem', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' } }, kids));
};

/**
 * Pagination bar: `page`/`model` cell (or `defaultPage`), either `totalPages`
 * or `total` + `pageSize`, `siblingCount` around the current page, `onChange`.
 */
export const Pagination = ({ page, model: modelProp, defaultPage = 1, totalPages, total, pageSize = 10, siblingCount = 1, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(modelProp ?? page, defaultPage, onChange);
	const pages = () => {
		if (totalPages !== undefined) return Math.max(1, Number(val(totalPages)) || 1);
		return Math.max(1, Math.ceil((Number(val(total)) || 0) / (Number(val(pageSize)) || 1)));
	};
	const go = (p) => setCurrent(Math.min(pages(), Math.max(1, p)));
	const btn = (labelText, onClick, opts = {}) => h('button', {
		type: 'button',
		'aria-label': opts.ariaLabel || labelText,
		'aria-current': () => (opts.page !== undefined && current() === opts.page ? 'page' : undefined),
		'data-page': opts.page,
		'data-current': () => (opts.page !== undefined ? String(current() === opts.page) : undefined),
		disabled: opts.disabled ? () => !!opts.disabled() : undefined,
		style: {
			cursor: 'pointer', padding: '0.375rem 0.625rem', borderRadius: 'var(--uele-radius-sm, 6px)',
			border: '1px solid var(--uele-border, #e2e8f0)',
			background: opts.current ? 'var(--uele-accent, #2563eb)' : 'var(--uele-surface, #fff)',
			color: opts.current ? 'var(--uele-accent-text, #fff)' : 'var(--uele-text, #0f172a)'
		},
		onclick: onClick
	}, labelText);
	const items = () => paginationRange(current(), pages(), siblingCount).map((item) =>
		item === '…'
			? h('span', { 'aria-hidden': 'true', 'data-ellipsis': '' }, '…')
			: btn(String(item), () => go(item), { page: item, current: current() === item })
	);
	return h('nav', { 'aria-label': 'Pagination', ...props },
		h('div', { style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } },
			btn('Previous', () => go(current() - 1), { ariaLabel: 'Go to previous page', disabled: () => current() <= 1 }),
			() => items(),
			btn('Next', () => go(current() + 1), { ariaLabel: 'Go to next page', disabled: () => current() >= pages() })
		));
};

/* --------------------------------------------------------------------- tabs */

export const TabList = ({ children, ...props } = {}) =>
	h('div', { role: 'tablist', ...props, style: { display: 'flex', gap: '0.25rem', ...props.style } }, children);

export const Tab = ({ value, selected, model: modelProp, active, onSelect, children, ...props } = {}) => {
	const source = modelProp ?? selected;
	const isActive = () => (active !== undefined ? !!val(active) : val(source) === value);
	return h('button', {
		type: 'button', role: 'tab', ...props,
		'aria-selected': () => String(isActive()),
		'data-state': () => (isActive() ? 'active' : 'inactive'),
		'data-value': value,
		onclick: (e) => {
			if (isCell(source)) write(source, value);
			onSelect?.(value, e);
		}
	}, children);
};

export const TabPanel = ({ value, selected, model: modelProp, active, children, ...props } = {}) => {
	const source = modelProp ?? selected;
	const isActive = () => (active !== undefined ? !!val(active) : val(source) === value);
	return h('div', {
		role: 'tabpanel', ...props,
		'data-state': () => (isActive() ? 'active' : 'inactive'),
		hidden: () => !isActive()
	}, children);
};

/**
 * Tabs, two ways:
 * - data-driven: `<Tabs items={[{value,label,content}]} model={cell} />`
 * - compositional: `<Tabs><TabList><Tab selected={cell} value="a">A</Tab>…<TabPanel …/></Tabs>`
 */
export const Tabs = ({ model: cell, value, defaultValue, items, onChange, children, ...props } = {}) => {
	if (!hasKids(children) && items) {
		const list = val(items) || [];
		const [current, setCurrent] = controllable(cell ?? value, defaultValue ?? list[0]?.value, onChange);
		return h('div', { 'data-uele-tabs': '', ...props },
			TabList({
				children: list.map((item) => Tab({
					value: item.value,
					active: () => current() === item.value,
					onSelect: (v) => setCurrent(v),
					disabled: item.disabled,
					children: item.label
				}))
			}),
			() => {
				const active = list.find((item) => item.value === current()) || list[0];
				return active ? h('div', { role: 'tabpanel', 'data-value': active.value }, active.content) : '';
			});
	}
	return h('div', { 'data-uele-tabs': '', ...props }, children);
};

/* --------------------------------------------------------------- disclosure */

export const AccordionItem = ({ value, title, header, open, onToggle, children, ...props } = {}) => {
	const headerId = nextId('uele-accordion-header');
	const panelId = nextId('uele-accordion-panel');
	const expanded = () => !!val(open);
	return h('div', { 'data-value': value, 'data-state': () => (expanded() ? 'open' : 'closed'), ...props },
		h('h3', { style: { margin: 0 } }, h('button', {
			type: 'button', id: headerId,
			'aria-expanded': () => String(expanded()), 'aria-controls': panelId,
			style: { width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: '0.75rem 0.5rem' },
			onclick: () => onToggle?.(value)
		}, header ?? title)),
		h('div', { id: panelId, role: 'region', 'aria-labelledby': headerId, hidden: () => !expanded() }, children));
};

/**
 * Accordion over `items={[{value,title,content,disabled}]}`.
 * `type="single"` (default, `collapsible` controls re-click) or `"multiple"` (array model).
 */
export const Accordion = ({ items, type = 'single', model: cell, value, defaultValue, collapsible = true, onChange, children, ...props } = {}) => {
	if (!hasKids(children) && items) {
		const list = val(items) || [];
		const initial = type === 'multiple' ? (defaultValue ?? []) : (defaultValue ?? list[0]?.value);
		const [current, setCurrent] = controllable(cell ?? value, initial, onChange);
		const isOpen = (v) => (type === 'multiple' ? (current() || []).includes(v) : current() === v);
		const toggle = (v) => {
			if (type === 'multiple') {
				const openNow = current() || [];
				setCurrent(openNow.includes(v) ? openNow.filter((x) => x !== v) : [...openNow, v]);
			} else {
				setCurrent(current() === v ? (collapsible ? '' : v) : v);
			}
		};
		return h('div', { 'data-uele-accordion': '', ...props },
			list.map((item) => AccordionItem({
				value: item.value, title: item.title, open: () => isOpen(item.value),
				onToggle: () => !item.disabled && toggle(item.value),
				children: item.content
			})));
	}
	return h('div', { 'data-uele-accordion': '', ...props }, children);
};

/** single collapsible region: trigger button + toggleable content */
export const Collapsible = ({ open, model: modelProp, defaultOpen = false, trigger, label, onChange, children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onChange);
	return h('div', { 'data-state': () => (isOpen() ? 'open' : 'closed'), ...props },
		h('button', {
			type: 'button', 'aria-expanded': () => String(!!isOpen()),
			onclick: () => setOpen(!isOpen())
		}, trigger ?? label ?? 'Toggle'),
		h('div', { hidden: () => !isOpen() }, children));
};

/* ------------------------------------------------------------------ overlay */

/**
 * Modal dialog. Controlled via `model`/`open` cell or uncontrolled via
 * `defaultOpen`; `trigger` (text or node) renders the opener, `title` /
 * `description` label the panel, Escape and overlay-click close it.
 */
export const Dialog = ({ open, model: modelProp, defaultOpen = false, onOpenChange, onChange, title, description, trigger, closeLabel = 'Close', children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onOpenChange || onChange);
	const titleId = nextId('uele-dialog-title');
	const descId = nextId('uele-dialog-desc');
	const close = () => (setOpen(false), applyLock()); // re-apply the scroll lock on every internal close, not just cell-driven ones
	let host = null;
	let focusTimer;
	let locked = false;
	let prevOverflow = '';
	const applyLock = () => { // only ever called/subtcribed under the document guard below
		if (isOpen() && !locked) {
			locked = true;
			prevOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			clearTimeout(focusTimer);
			focusTimer = setTimeout(() => host?.querySelector('[role="dialog"]')?.focus?.(), 0);
		} else if (!isOpen() && locked) {
			clearTimeout(focusTimer);
			locked = false;
			document.body.style.overflow = prevOverflow;
		}
	};
	const onKey = (e) => e.key === 'Escape' && isOpen() && close();
	let offSource = null;
	/* istanbul ignore else -- SSR: rendering still requires document (h() throws); this guard only keeps module setup import-safe */
	if (typeof document !== 'undefined') {
		document.addEventListener('keydown', onKey);
		applyLock();
		const source = modelProp ?? open;
		if (is(source)) offSource = sub(source, applyLock, () => {});
	}
	const panel = () => {
		if (!isOpen()) return '';
		return [
			h('div', {
				'data-uele-overlay': '', onclick: close,
				style: { position: 'fixed', inset: 0, background: 'var(--uele-overlay, rgba(15,23,42,0.5))' }
			}),
			h('div', {
				role: 'dialog', 'aria-modal': 'true',
				'aria-labelledby': title ? titleId : undefined, 'aria-describedby': description ? descId : undefined,
				tabIndex: -1, ...props,
				onkeydown: (e) => e.key === 'Escape' && close(),
				style: {
					position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
					background: 'var(--uele-surface, #fff)', color: 'var(--uele-text, #0f172a)',
					borderRadius: 'var(--uele-radius-lg, 14px)', boxShadow: 'var(--uele-shadow-lg, 0 12px 32px rgba(0,0,0,0.2))',
					padding: '1.25rem', maxWidth: '32rem', width: 'calc(100% - 2rem)', ...props.style
				}
			},
				title ? h('h2', { id: titleId, style: { marginTop: 0 } }, title) : null,
				description ? h('p', { id: descId }, description) : null,
				children,
				h('button', { type: 'button', 'aria-label': closeLabel, onclick: close, style: { position: 'absolute', top: '0.5rem', right: '0.5rem', cursor: 'pointer' } }, '×'))
		];
	};
	host = h('div', { style: { display: 'contents' }, onkeydown: (e) => e.key === 'Escape' && isOpen() && close() },
		trigger != null
			? h('button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': () => String(!!isOpen()), onclick: () => (setOpen(true), applyLock()) }, trigger)
			: null,
		() => panel(),
		onTeardown(() => {
			clearTimeout(focusTimer);
			document.removeEventListener('keydown', onKey);
			offSource?.();
			if (locked) document.body.style.overflow = prevOverflow;
		}));
	return host;
};

const DRAWER_STYLES = {
	right: { top: 0, right: 0, left: 'auto', transform: 'none', height: '100dvh', maxHeight: '100dvh', width: 'min(24rem, 92vw)', maxWidth: '92vw', borderRadius: 0 },
	left: { top: 0, left: 0, right: 'auto', transform: 'none', height: '100dvh', maxHeight: '100dvh', width: 'min(24rem, 92vw)', maxWidth: '92vw', borderRadius: 0 },
	top: { top: 0, left: 0, right: 0, transform: 'none', width: '100%', maxWidth: '100%', maxHeight: '70dvh', borderRadius: 0 },
	bottom: { bottom: 0, left: 0, right: 0, top: 'auto', transform: 'none', width: '100%', maxWidth: '100%', maxHeight: '70dvh', borderRadius: 0 }
};

/** dialog that slides from an edge (`side`: right/left/top/bottom) — anchored, full-height on the sides */
export const Drawer = ({ side = 'right', style, ...props } = {}) =>
	Dialog({ ...props, 'data-side': side, style: { ...DRAWER_STYLES[side] || DRAWER_STYLES.right, ...style } });

/**
 * Confirmation dialog: a Dialog preset with Cancel/Confirm actions.
 * `onConfirm` fires on the danger button, `onCancel`/close on anything else.
 */
export const AlertDialog = ({ open, model: modelProp, defaultOpen = false, onOpenChange, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel, children, ...props } = {}) => {
	const source = modelProp ?? open;
	const controlledCell = isCell(source) ? source : null;
	// a plain boolean `open`/`model` seeds the state (props are mount-time here); a cell stays controlled
	const inner = own(!controlledCell && typeof source === 'boolean' ? source : !!defaultOpen);
	const setOpen = (v) => {
		if (controlledCell) write(controlledCell, v);
		else write(inner, v);
		onOpenChange?.(v);
	};
	return Dialog({
		...props,
		model: controlledCell || inner,
		children: [
			children,
			h('div', { style: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' } },
				h('button', { type: 'button', 'data-action': 'cancel', onclick: (e) => (onCancel?.(e), setOpen(false)) }, cancelLabel),
				h('button', {
					type: 'button', 'data-action': 'confirm',
					style: danger ? { background: 'var(--uele-danger, #dc2626)', color: '#fff', border: '1px solid transparent', borderRadius: 'var(--uele-radius, 10px)', padding: '0.375rem 0.875rem', cursor: 'pointer' } : { cursor: 'pointer' },
					onclick: (e) => (onConfirm?.(e), setOpen(false))
				}, confirmLabel))
		]
	});
};

/** popover panel anchored to a trigger button; toggles, Escape closes */
export const Popover = ({ trigger, label, open, model: modelProp, defaultOpen = false, onOpenChange, children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onOpenChange);
	return h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onkeydown: (e) => e.key === 'Escape' && setOpen(false)
	},
		h('button', {
			type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': () => String(!!isOpen()),
			onclick: () => setOpen(!isOpen())
		}, trigger ?? label ?? 'Open'),
		() => (isOpen()
			? h('div', {
					role: 'dialog', ...props,
					style: { position: 'absolute', zIndex: 10, background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem', ...props.style }
				}, children)
			: ''));
};

/** hover/focus tooltip: wrap the trigger in `children`, text in `label`/`text` */
export const Tooltip = ({ label, text, children, ...props } = {}) => {
	const visible = own(false);
	const show = () => write(visible, true);
	const hide = () => write(visible, false);
	const id = nextId('uele-tooltip');
	return h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onmouseenter: show, onmouseleave: hide, onfocus: show, onblur: hide,
		'aria-describedby': id
	},
		children,
		h('span', {
			role: 'tooltip', id, ...props, hidden: () => !read(visible),
			style: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'var(--uele-text, #0f172a)', color: 'var(--uele-bg, #fff)', padding: '0.25rem 0.5rem', borderRadius: 'var(--uele-radius-sm, 6px)', fontSize: '0.8125rem', zIndex: 20, ...props.style }
		}, label ?? text));
};

export const MenuItem = ({ onSelect, disabled, children, ...props } = {}) =>
	h('button', {
		type: 'button', role: 'menuitem', disabled, ...props,
		style: { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem 0.5rem', ...props.style },
		onclick: (e) => onSelect?.(e)
	}, children);

/** dropdown menu over `items={[{label, onSelect, disabled}]}` (or `<MenuItem>` children) */
export const Menu = ({ label, trigger, items, onSelect, children, ...props } = {}) => {
	const open = own(false);
	const close = () => write(open, false);
	const choose = (item) => (item.onSelect?.(item), onSelect?.(item), close());
	return h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onkeydown: (e) => e.key === 'Escape' && close()
	},
		h('button', {
			type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': () => String(!!read(open)),
			onclick: () => write(open, !read(open))
		}, trigger ?? label ?? 'Menu'),
		() => (read(open)
			? h('div', {
					role: 'menu', ...props,
					style: { position: 'absolute', zIndex: 10, minWidth: '10rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.25rem', ...props.style }
				}, hasKids(children) ? children : (items || []).map((item) => MenuItem({
					disabled: item.disabled,
					onSelect: () => choose(item),
					children: item.label
				})))
			: ''));
};

/**
 * A single toast. `open`/`model` controls visibility; with `duration` it
 * auto-dismisses while open. `onClose` fires on dismiss (button, timeout).
 */
export const Toast = ({ open, model: modelProp, title, description, duration = 5000, onClose, onOpenChange, action, children, ...props } = {}) => {
	const source = modelProp ?? open;
	const [isOpen, setOpen] = controllable(source, true, onOpenChange);
	let timer = null;
	const arm = () => {
		clearTimeout(timer);
		if (duration > 0 && isOpen()) timer = setTimeout(dismiss, duration);
	};
	const dismiss = () => (clearTimeout(timer), setOpen(false), onClose?.());
	const offSource = is(source) ? sub(source, () => arm(), () => {}) : null;
	arm();
	return h('div', { style: { display: 'contents' } }, () =>
		isOpen()
			? h('div', {
					role: 'status', 'data-uele-toast': '', ...props,
					style: { background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'start', ...props.style }
				},
					h('div', null,
						title ? h('strong', null, title) : null,
						description ? h('div', null, description) : null,
						children),
					action || null,
					h('button', { type: 'button', 'aria-label': 'Dismiss', onclick: dismiss }, '×'))
			: '',
		onTeardown(() => (clearTimeout(timer), offSource?.())));
};

/** renders a stack from a toasts array (cell or plain): `[{id,title,description,duration}]` */
export const Toaster = ({ toasts, children, ...props } = {}) =>
	h('div', {
		'aria-live': 'polite', 'data-uele-toaster': '', ...props,
		style: { position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 50, ...props.style }
	}, () => (val(toasts) || []).map((toast) => Toast({
		...toast,
		open: true,
		onClose: () => {
			toast.onClose?.();
			if (isCell(toasts)) write(toasts, val(toasts).filter((t) => t !== toast && t.id !== toast.id));
		}
	})));

/* -------------------------------------------------------------------- steps */

/** steps indicator: `steps={[{label,description}]}` (or a count), `current`/`model` index */
export const Stepper = ({ steps, current, model: modelProp, onChange, children, ...props } = {}) => {
	const list = typeof steps === 'number' ? Array.from({ length: steps }, (_, i) => ({ label: `Step ${i + 1}` })) : (val(steps) || []);
	const [active, setActive] = controllable(modelProp ?? current, 0, onChange);
	const stateOf = (i) => (i < active() ? 'complete' : i === active() ? 'current' : 'upcoming');
	return h('ol', { 'data-uele-stepper': '', ...props, style: { display: 'flex', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0, ...props.style } },
		hasKids(children) ? children : list.map((step, i) =>
			h('li', { 'data-state': () => stateOf(i), 'aria-current': () => (active() === i ? 'step' : undefined), style: { display: 'flex', alignItems: 'center', gap: '0.375rem' } },
				h('button', {
					type: 'button', disabled: !onChange && !modelProp && !current,
					'aria-label': step.label,
					style: { borderRadius: '50%', width: '1.75rem', height: '1.75rem', cursor: onChange ? 'pointer' : 'default' },
					onclick: () => (onChange || modelProp || current) && setActive(i)
				}, () => (stateOf(i) === 'complete' ? '✓' : String(i + 1))),
				h('span', null, step.label))));
};

/** slide carousel over `items` with prev/next + dots, index via `model`/`defaultIndex` */
export const Carousel = ({ items, renderItem, model: modelProp, index, defaultIndex = 0, onChange, children, ...props } = {}) => {
	const list = () => val(items) || [];
	const [active, setActive] = controllable(modelProp ?? index, defaultIndex, onChange);
	const go = (i) => setActive(((i % Math.max(1, list().length)) + Math.max(1, list().length)) % Math.max(1, list().length));
	return h('div', { 'data-uele-carousel': '', ...props, style: { position: 'relative', ...props.style } },
		h('div', { 'data-uele-carousel-track': '' }, () => {
			const item = list()[active()];
			if (item === undefined) return hasKids(children) ? children : '';
			return renderItem ? renderItem(item, active()) : item;
		}),
		h('button', { type: 'button', 'aria-label': 'Previous slide', onclick: () => go(active() - 1) }, '‹'),
		h('button', { type: 'button', 'aria-label': 'Next slide', onclick: () => go(active() + 1) }, '›'),
		h('div', { style: { display: 'flex', gap: '0.25rem', justifyContent: 'center' } },
			() => list().map((_, i) => h('button', {
				type: 'button', 'aria-label': `Go to slide ${i + 1}`,
				'aria-current': () => String(active() === i),
				onclick: () => go(i)
			}, () => (active() === i ? '●' : '○')))));
};

/* ------------------------------------------- wave 2: everyday components */

/** pressable toggle button (`aria-pressed`), two-way via `model`/`pressed` */
export const Toggle = ({ model: cell, pressed, value, selected, onChange, onPressedChange, children, ...props } = {}) => {
	const controlled = cell ?? pressed;
	const [on, setOn] = controllable(controlled, false, onPressedChange || onChange);
	// inside a ToggleGroup, `value`+`selected` describe group membership instead
	const inGroup = selected !== undefined && value !== undefined;
	const isOn = () => (inGroup ? (Array.isArray(val(selected)) ? val(selected).includes(value) : val(selected) === value) : !!on());
	return h('button', {
		type: 'button', ...props,
		'aria-pressed': () => String(isOn()),
		'data-state': () => (isOn() ? 'on' : 'off'),
		...(value !== undefined ? { 'data-value': value } : {}),
		style: { cursor: 'pointer', ...props.style },
		onclick: (e) => {
			if (inGroup) {
				if (Array.isArray(val(selected))) {
					const arr = val(selected);
					const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
					if (isCell(selected)) write(selected, next);
					onChange?.(next, e);
				} else {
					const next = val(selected) === value ? '' : value;
					if (isCell(selected)) write(selected, next);
					onChange?.(next, e);
				}
			} else setOn(!on());
		}
	}, children);
};

/** a row of Toggles: `type="single"` (scalar model) or `"multiple"` (array model), options- or children-driven */
export const ToggleGroup = ({ model: cell, value, type = 'single', options, defaultValue, onChange, children, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, defaultValue ?? (type === 'multiple' ? [] : ''), onChange);
	if (!hasKids(children)) {
		const toggleValue = (v) => {
			if (type === 'multiple') {
				const arr = current() || [];
				setCurrent(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
			} else setCurrent(current() === v ? '' : v);
		};
		const isOn = (v) => (type === 'multiple' ? (current() || []).includes(v) : current() === v);
		return h('div', { role: 'group', 'data-uele-toggle-group': '', ...props, style: { display: 'inline-flex', gap: '0.25rem', ...props.style } },
			(options || []).map((o) => {
				const opt = typeof o === 'object' ? o : { value: o, label: o };
				return h('button', {
					type: 'button', disabled: opt.disabled, 'data-value': opt.value,
					'aria-pressed': () => String(isOn(opt.value)),
					'data-state': () => (isOn(opt.value) ? 'on' : 'off'),
					style: { cursor: 'pointer' },
					onclick: () => toggleValue(opt.value)
				}, opt.label);
			}));
	}
	return h('div', { role: 'group', 'data-uele-toggle-group': '', ...props }, children);
};

/** segmented control: a radiogroup rendered as one joined pill bar */
export const SegmentedControl = ({ model: cell, value, options = [], defaultValue, onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, defaultValue ?? (typeof options[0] === 'object' ? options[0]?.value : options[0]), onChange);
	return h('div', {
		role: 'radiogroup', 'aria-label': label, 'data-uele-segmented': '', ...props,
		style: { display: 'inline-flex', background: 'var(--uele-surface-hover, #f1f5f9)', borderRadius: 'var(--uele-radius-full, 9999px)', padding: '0.25rem', gap: '0.25rem', ...props.style }
	}, options.map((o) => {
		const opt = typeof o === 'object' ? o : { value: o, label: o };
		const active = () => current() === opt.value;
		return h('button', {
			type: 'button', role: 'radio', disabled: opt.disabled,
			'aria-checked': () => String(active()), 'data-value': opt.value,
			'data-state': () => (active() ? 'active' : 'inactive'),
			style: { border: 'none', cursor: 'pointer', borderRadius: 'var(--uele-radius-full, 9999px)', padding: '0.375rem 0.875rem' },
			onclick: () => setCurrent(opt.value)
		}, () => opt.label);
	}));
};

/** visually hidden but screen-reader available (Radix VisuallyHidden equivalent) */
export const VisuallyHidden = ({ children, ...props } = {}) =>
	h('span', {
		...props,
		style: { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, ...props.style }
	}, children);

/** skip-to-content link: invisible until focused, then pinned top-left */
export const SkipLink = ({ href = '#main', children, ...props } = {}) => {
	const el = h('a', {
		...props, href,
		style: { position: 'absolute', left: '-9999px', top: 0, zIndex: 100, background: 'var(--uele-accent, #2563eb)', color: 'var(--uele-accent-text, #fff)', padding: '0.5rem 1rem' },
		onfocus: (e) => (e.currentTarget.style.left = '0'),
		onblur: (e) => (e.currentTarget.style.left = '-9999px')
	}, kidsOf(children) ?? 'Skip to content');
	return el;
};

const STATUS_COLORS = { online: '#22c55e', away: '#f59e0b', busy: '#ef4444', offline: '#94a3b8' };
/** presence dot with an accessible label */
export const StatusDot = ({ status = 'online', label, ...props } = {}) =>
	h('span', {
		role: 'status', 'aria-label': label || status, 'data-status': status, ...props,
		style: { display: 'inline-block', width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: STATUS_COLORS[status] || STATUS_COLORS.offline, ...props.style }
	});

/** overlapping avatar stack with a +n overflow bubble */
export const AvatarGroup = ({ avatars, max = 4, children, ...props } = {}) => {
	const list = val(avatars) || [];
	const shown = hasKids(children) ? children : list.slice(0, max).map((a) => Avatar(typeof a === 'string' ? { name: a } : a));
	const extra = list.length > max ? list.length - max : 0;
	return h('div', { 'data-uele-avatar-group': '', ...props, style: { display: 'inline-flex', alignItems: 'center', ...props.style } },
		shown,
		extra > 0 ? h('span', { 'aria-label': `${extra} more`, style: { marginLeft: '-0.375rem', background: 'var(--uele-surface-hover, #f1f5f9)', borderRadius: '50%', padding: '0.375rem', fontSize: '0.75rem', fontWeight: 600 } }, `+${extra}`) : null);
};

/** input with prefix/suffix addons (search icons, units, domains…) */
export const InputGroup = ({ prefix, suffix, children, ...props } = {}) =>
	h('div', {
		'data-uele-input-group': '', ...props,
		style: { display: 'inline-flex', alignItems: 'stretch', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', overflow: 'hidden', ...props.style }
	},
		prefix != null ? h('span', { 'data-addon': 'prefix', style: { display: 'inline-flex', alignItems: 'center', padding: '0 0.625rem', background: 'var(--uele-surface-hover, #f8fafc)', color: 'var(--uele-text-muted, #64748b)' } }, prefix) : null,
		children,
		suffix != null ? h('span', { 'data-addon': 'suffix', style: { display: 'inline-flex', alignItems: 'center', padding: '0 0.625rem', background: 'var(--uele-surface-hover, #f8fafc)', color: 'var(--uele-text-muted, #64748b)' } }, suffix) : null);

/** password field with a show/hide toggle and an optional strength meter */
export const PasswordInput = ({ model: cell, value, showStrength, onChange, ...props } = {}) => {
	const visible = own(false);
	const [current, setCurrent] = controllable(cell ?? value, '', onChange);
	const strength = () => {
		const v = String(current() || '');
		let score = 0;
		if (v.length >= 8) score++;
		if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
		if (/\d/.test(v)) score++;
		if (/[^A-Za-z0-9]/.test(v)) score++;
		return score;
	};
	const input = h('input', {
		type: () => (read(visible) ? 'text' : 'password'),
		...props,
		value: () => current() || '',
		onInput: (e) => setCurrent(e.target.value)
	});
	const toggle = h('button', {
		type: 'button',
		'aria-label': () => (read(visible) ? 'Hide password' : 'Show password'),
		onclick: () => write(visible, !read(visible))
	}, () => (read(visible) ? 'Hide' : 'Show'));
	return h('div', { 'data-uele-password': '' },
		h('div', { style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } }, input, toggle),
		showStrength ? h('div', {
			role: 'progressbar', 'aria-label': 'Password strength', 'aria-valuemin': 0, 'aria-valuemax': 4,
			'aria-valuenow': () => strength(), 'data-strength': () => strength(),
			style: { height: '0.375rem', marginTop: '0.375rem', background: 'var(--uele-surface-hover, #f1f5f9)', borderRadius: '9999px', overflow: 'hidden' }
		}, h('div', { style: { height: '100%', width: () => strength() * 25 + '%', background: () => ['#ef4444', '#f59e0b', '#eab308', '#22c55e'][Math.max(0, strength() - 1)] } })) : null); // strength() is 0..4, so the index is always in range
};

/** copy-to-clipboard button with transient "Copied" feedback */
export const CopyButton = ({ text, label = 'Copy', copiedLabel = 'Copied', ...props } = {}) => {
	const copied = own(false);
	let timer = null, dead = false;
	return h('button', {
		type: 'button', ...props, 'data-copied': () => String(!!read(copied)),
		onclick: async () => {
			const value = String(val(text) ?? '');
			try { await navigator.clipboard.writeText(value); }
			catch {
				if (dead) return;
				const area = document.createElement('textarea');
				area.value = value;
				document.body.append(area);
				area.select();
				try { document.execCommand('copy'); } catch { /* unavailable */ }
				area.remove();
			}
			if (dead) return;
			write(copied, true);
			clearTimeout(timer);
			timer = setTimeout(() => write(copied, false), 1500);
		}
	}, () => (read(copied) ? copiedLabel : label),
		onTeardown(() => { dead = true; clearTimeout(timer); }));
};

/** colour picker: native swatch input + hex text + preset swatches, two-way via `model` */
export const ColorPicker = ({ model: cell, value, swatches = ['#2563eb', '#059669', '#e11d48', '#d97706', '#7c3aed', '#0f172a'], onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, '#2563eb', onChange);
	return h('div', { 'data-uele-color': '', ...props, style: { display: 'inline-flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', ...props.style } },
		h('input', { type: 'color', 'aria-label': 'Pick a colour', value: () => current(), onInput: (e) => setCurrent(e.target.value), style: { width: '2.5rem', height: '2.5rem', padding: 0, border: 'none', background: 'none', cursor: 'pointer' } }),
		h('input', { type: 'text', 'aria-label': 'Hex colour', value: () => current(), onInput: (e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setCurrent(e.target.value), style: { width: '6rem' } }),
		swatches.map((s) => h('button', {
			type: 'button', 'aria-label': `Use ${s}`, 'data-swatch': s,
			style: { width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: s, border: '1px solid var(--uele-border, #e2e8f0)', cursor: 'pointer' },
			onclick: () => setCurrent(s)
		})));
};

/** custom listbox (the non-native Select): click or ArrowKeys + Enter to choose */
export const Listbox = ({ model: cell, value, options = [], label, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, undefined, onChange);
	const active = own(0);
	const opts = () => (val(options) || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
	return h('ul', {
		role: 'listbox', 'aria-label': label, tabIndex: 0, ...props,
		style: { listStyle: 'none', margin: 0, padding: '0.25rem', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', ...props.style },
		onkeydown: (e) => {
			const list = opts();
			if (e.key === 'ArrowDown') write(active, Math.min(list.length - 1, read(active) + 1));
			else if (e.key === 'ArrowUp') write(active, Math.max(0, read(active) - 1));
			else if (e.key === 'Enter' && list[read(active)]) setCurrent(list[read(active)].value);
			else return;
			e.preventDefault();
		}
	}, () => opts().map((o, i) => h('li', {
		role: 'option', 'data-value': o.value, 'data-active': () => String(read(active) === i),
		'aria-selected': () => String(current() === o.value),
		style: { padding: '0.375rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--uele-radius-sm, 6px)' },
		onclick: () => (write(active, i), setCurrent(o.value)),
		onmouseenter: () => write(active, i)
	}, String(o.label))));
};

/** multi-select dropdown: checkbox list + chips/count summary, array model */
export const MultiSelect = ({ model: cell, value, options = [], placeholder = 'Select…', label, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, [], onChange);
	const open = own(false);
	const opts = () => (val(options) || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
	const toggleValue = (v) => {
		const arr = current() || [];
		setCurrent(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
	};
	const summary = () => {
		const arr = current() || [];
		if (!arr.length) return placeholder;
		const labels = opts().filter((o) => arr.includes(o.value)).map((o) => o.label);
		return labels.length <= 2 ? labels.join(', ') : `${arr.length} selected`;
	};
	return h('div', { 'data-uele-multi-select': '', style: { position: 'relative', display: 'inline-block' } },
		h('button', {
			type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': () => String(!!read(open)),
			'aria-label': label || placeholder, ...props, onclick: () => write(open, !read(open))
		}, () => summary()),
		() => (read(open)
			? h('ul', {
					role: 'listbox', 'aria-multiselectable': 'true', 'aria-label': label || placeholder,
					style: { position: 'absolute', zIndex: 10, listStyle: 'none', margin: 0, padding: '0.25rem', minWidth: '12rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))' }
				}, opts().map((o) => h('li', {
					role: 'option', 'data-value': o.value,
					'aria-selected': () => String((current() || []).includes(o.value)),
					style: { display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.25rem', cursor: 'pointer' },
					onclick: () => toggleValue(o.value)
				}, h('input', { type: 'checkbox', tabindex: -1, checked: () => (current() || []).includes(o.value) }), String(o.label))))
			: ''));
};

/* ---------------------------------------------------------- date & time */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad2 = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDateValue = (v) => {
	if (v == null || v === '') return null;
	if (v instanceof Date) return isNaN(v) ? null : v;
	const d = new Date(v);
	return isNaN(d) ? null : d;
};
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Month calendar: `model` holds a Date or an ISO `yyyy-mm-dd` string (the
 * written type follows the held type), `onChange(date, iso)`, `min`/`max` clamp.
 */
export const Calendar = ({ model: cell, value, defaultValue, onChange, min, max, weekStartsOn = 0, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, defaultValue ?? null);
	const initial = parseDateValue(current()) || new Date();
	const cursor = own(new Date(initial.getFullYear(), initial.getMonth(), 1));
	const minDate = parseDateValue(min);
	const maxDate = parseDateValue(max);
	const writeDate = (day) => {
		const next = typeof current() === 'string' ? toISODate(day) : day;
		setCurrent(next);
		onChange?.(day, toISODate(day));
	};
	const grid = () => {
		const view = read(cursor);
		const year = view.getFullYear();
		const month = view.getMonth();
		const first = new Date(year, month, 1);
		const startOffset = (first.getDay() - weekStartsOn + 7) % 7;
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const cells = [];
		for (let i = 0; i < startOffset; i++) cells.push(null);
		for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
		while (cells.length % 7) cells.push(null);
		return cells;
	};
	return h('div', { 'data-uele-calendar': '', ...props, style: { display: 'inline-block', ...props.style } },
		h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' } },
			h('button', { type: 'button', 'aria-label': 'Previous month', onclick: () => { const v = read(cursor); write(cursor, new Date(v.getFullYear(), v.getMonth() - 1, 1)); } }, '‹'),
			h('strong', { 'aria-live': 'polite' }, () => `${MONTHS[read(cursor).getMonth()]} ${read(cursor).getFullYear()}`),
			h('button', { type: 'button', 'aria-label': 'Next month', onclick: () => { const v = read(cursor); write(cursor, new Date(v.getFullYear(), v.getMonth() + 1, 1)); } }, '›')),
		h('div', { role: 'grid', 'aria-label': 'Calendar' },
			h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 2.25rem)', gap: '0.125rem' } },
				Array.from({ length: 7 }, (_, i) => h('span', { 'aria-hidden': 'true', style: { textAlign: 'center', fontWeight: 600, color: 'var(--uele-text-muted, #64748b)' } }, DAYS[(weekStartsOn + i) % 7])),
				() => grid().map((day) => {
					if (!day) return h('span', null, '');
					const disabled = (minDate && day < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) || (maxDate && day > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()));
					const selected = () => sameDay(parseDateValue(current()), day);
					return h('button', {
						type: 'button', disabled, 'data-date': toISODate(day),
						'aria-selected': () => String(selected()),
						'data-today': sameDay(day, new Date()) ? 'true' : undefined,
						style: { width: '2.25rem', height: '2.25rem', borderRadius: 'var(--uele-radius-sm, 6px)', cursor: 'pointer', border: '1px solid transparent' },
						onclick: () => writeDate(day)
					}, String(day.getDate()));
				}))));
};

/** date input + calendar popover; `model` is an ISO `yyyy-mm-dd` string cell */
export const DatePicker = ({ model: cell, value, placeholder = 'Pick a date', label, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, '', onChange);
	const open = own(false);
	const input = h('input', {
		type: 'text', placeholder, 'aria-label': label || placeholder, ...props,
		value: () => (current() instanceof Date ? (isNaN(current()) ? '' : toISODate(current())) : current() || ''),
		onInput: (e) => {
			const parsed = parseDateValue(e.target.value);
			if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setCurrent(toISODate(parsed));
		}
	});
	return h('div', { 'data-uele-datepicker': '', style: { position: 'relative', display: 'inline-block' } },
		input,
		h('button', { type: 'button', 'aria-label': 'Open calendar', 'aria-expanded': () => String(!!read(open)), onclick: () => write(open, !read(open)) }, '📅'),
		() => (read(open)
			? h('div', { style: { position: 'absolute', zIndex: 10, background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem' } },
					Calendar({ value: current(), onChange: (day, iso) => (setCurrent(iso), write(open, false)) }))
			: ''));
};

const relativeParts = (diffMs) => {
	const seconds = Math.round(Math.abs(diffMs) / 1000);
	if (seconds < 5) return [0, 'just now'];
	if (seconds < 60) return [seconds, 'second'];
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return [minutes, 'minute'];
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return [hours, 'hour'];
	const days = Math.floor(hours / 24);
	if (days < 30) return [days, 'day'];
	const months = Math.floor(days / 30);
	if (months < 12) return [months, 'month'];
	return [Math.floor(months / 12), 'year'];
};
/** live "3 minutes ago" text; re-renders every `interval` ms (span, `dateTime` on hover via title) */
export const TimeAgo = ({ date, value, interval = 30000, ...props } = {}) => {
	const tick = own(Date.now());
	let timer = null;
	if (interval != null && typeof setInterval !== 'undefined') timer = setInterval(() => write(tick, Date.now()), interval);
	const target = parseDateValue(val(date ?? value));
	return h('span', { 'data-uele-timeago': '', title: target ? target.toISOString() : undefined, ...props },
		onTeardown(() => clearInterval(timer)),
		() => {
			read(tick);
			const t = parseDateValue(val(date ?? value));
			if (!t) return '';
			const diff = t.getTime() - Date.now();
			const [n, unit] = relativeParts(diff);
			if (n === 0) return 'just now';
			const label = `${n} ${unit}${n === 1 ? '' : 's'}`;
			return diff < 0 ? `${label} ago` : `in ${label}`;
		});
};

/** ticking countdown to a date (or from `seconds`), `onComplete` at zero; renders `hh:mm:ss` */
export const CountdownTimer = ({ to, seconds, onComplete, ...props } = {}) => {
	const tick = own(Date.now());
	const done = own(false);
	const target = to != null ? parseDateValue(val(to))?.getTime() : null;
	const startAt = Date.now();
	const total = seconds != null ? Number(val(seconds)) * 1000 : 0;
	const end = target ?? startAt + total;
	let timer = null;
	if (typeof setInterval !== 'undefined') {
		timer = setInterval(() => {
			write(tick, Date.now());
			if (Date.now() >= end && !read(done)) (write(done, true), clearInterval(timer), onComplete?.());
		}, 250);
	}
	const format = () => {
		read(tick);
		let left = Math.max(0, Math.floor((end - Date.now()) / 1000));
		const hh = Math.floor(left / 3600);
		const mm = Math.floor((left % 3600) / 60);
		const ss = left % 60;
		return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
	};
	return h('span', { role: 'timer', 'data-uele-countdown': '', 'data-done': () => String(!!read(done)), ...props }, onTeardown(() => clearInterval(timer)), () => format());
};

/* ------------------------------------------------- data-heavy components */

/**
 * Sortable data table: `columns={[{key,label,sortable,render}]}`, rows from
 * `data` (array or cell), `pageSize` adds the Pagination bar, `onRowClick`.
 */
export const DataTable = ({ columns = [], data, rows, pageSize, empty = 'No rows', onRowClick, ...props } = {}) => {
	const sort = own({ key: null, dir: 1 });
	const page = own(1);
	const all = () => val(data ?? rows) || [];
	const sorted = () => {
		const { key, dir } = read(sort);
		const copy = [...all()];
		if (!key) return copy;
		return copy.sort((a, b) => {
			const av = a[key];
			const bv = b[key];
			if (av == bv) return 0;
			return (av > bv ? 1 : -1) * dir;
		});
	};
	const visible = () => (pageSize ? sorted().slice((read(page) - 1) * pageSize, read(page) * pageSize) : sorted());
	const headerCell = (col) => h('th', {
		scope: 'col',
		...(col.sortable ? { 'aria-sort': () => (read(sort).key === col.key ? (read(sort).dir === 1 ? 'ascending' : 'descending') : undefined), 'data-sorted': () => String(read(sort).key === col.key) } : {}),
		style: { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid var(--uele-border, #e2e8f0)' }
	}, col.sortable
		? h('button', { type: 'button', 'data-sort': col.key, style: { background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 600 }, onclick: () => { const s = read(sort); write(sort, { key: col.key, dir: s.key === col.key ? -s.dir : 1 }); } },
				() => `${col.label}${read(sort).key === col.key ? (read(sort).dir === 1 ? ' ↑' : ' ↓') : ''}`)
		: col.label);
	return h('div', { 'data-uele-datatable': '' },
		h('table', { ...props, style: { borderCollapse: 'collapse', width: '100%', ...props.style } },
			h('thead', null, h('tr', null, columns.map(headerCell))),
			h('tbody', null, () => {
				const list = visible();
				if (!list.length) return h('tr', null, h('td', { colspan: Math.max(1, columns.length), style: { padding: '1rem', textAlign: 'center', color: 'var(--uele-text-muted, #64748b)' } }, empty));
				return list.map((row, ri) => h('tr', { 'data-row-index': ri, onclick: onRowClick ? (e) => onRowClick(row, ri, e) : undefined },
					columns.map((col) => h('td', { style: { padding: '0.5rem', borderBottom: '1px solid var(--uele-border, #e2e8f0)' } }, col.render ? col.render(row[col.key], row, ri) : row[col.key]))));
			})),
		pageSize ? h('div', { style: { marginTop: '0.5rem' } }, Pagination({
			defaultPage: 1,
			totalPages: () => Math.max(1, Math.ceil(sorted().length / pageSize)),
			onChange: (p) => write(page, p)
		})) : null);
};

/** expandable tree: `items={[{label,value,children}]}`, `model` = selected value, `defaultExpanded` values */
export const Tree = ({ items, model: cell, value, defaultExpanded = [], onSelect, ...props } = {}) => {
	const [selected, setSelected] = controllable(cell ?? value, undefined, onSelect);
	const expanded = own(new Set(defaultExpanded));
	const toggleExpand = (v) => {
		const next = new Set(read(expanded));
		next.has(v) ? next.delete(v) : next.add(v);
		write(expanded, next);
	};
	const renderItems = (list, depth) => list.map((item) => { // both call sites pass arrays (val(items) || [] / item.children || [])
		const kids = item.children || [];
		const isParent = kids.length > 0;
		const key = item.value ?? item.label;
		const openNow = () => read(expanded).has(key);
		return h('li', { role: 'treeitem', 'aria-expanded': isParent ? () => String(openNow()) : undefined, 'aria-selected': () => String(selected() === key), 'data-value': key },
			h('button', {
				type: 'button',
				style: { background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', paddingLeft: `${depth * 1.25 + 0.25}rem` },
				onclick: () => (isParent && toggleExpand(key), setSelected(key))
			}, isParent ? () => (openNow() ? '▾ ' : '▸ ') : '  ', item.label),
			isParent ? h('ul', { role: 'group', hidden: () => !openNow(), style: { listStyle: 'none', margin: 0, padding: 0 } }, () => renderItems(kids, depth + 1)) : null);
	});
	return h('ul', { role: 'tree', 'data-uele-tree': '', ...props, style: { listStyle: 'none', margin: 0, padding: 0, ...props.style } },
		() => renderItems(val(items) || [], 0));
};

/**
 * Windowed list for very long data: only the visible slice (+ overscan) is
 * in the DOM. `items` array/cell, fixed `itemHeight`, `renderItem(item, i)`.
 */
export const VirtualList = ({ items, itemHeight = 32, height = 320, overscan = 3, renderItem, ...props } = {}) => {
	const scrollTop = own(0);
	const list = () => val(items) || [];
	// `height` may be a CSS px string ('320px'); the windowing math needs a number (fallback: the 320 default)
	const px = typeof height === 'number' ? height : parseFloat(height);
	const view = Number.isFinite(px) ? px : 320;
	const range = () => {
		const start = Math.max(0, Math.floor(read(scrollTop) / itemHeight) - overscan);
		const count = Math.ceil(view / itemHeight) + overscan * 2;
		return [start, Math.min(list().length, start + count)];
	};
	return h('div', {
		'data-uele-virtual-list': '', tabIndex: 0, ...props,
		style: { height: typeof height === 'number' ? `${height}px` : height, overflowY: 'auto', position: 'relative', ...props.style },
		onscroll: (e) => write(scrollTop, e.currentTarget.scrollTop)
	}, h('div', { style: { height: () => `${list().length * itemHeight}px`, position: 'relative' } },
		() => {
			const [start, end] = range();
			return list().slice(start, end).map((item, i) => h('div', {
				'data-index': start + i,
				style: { position: 'absolute', top: `${(start + i) * itemHeight}px`, left: 0, right: 0, height: `${itemHeight}px`, overflow: 'hidden' }
			}, renderItem ? renderItem(item, start + i) : item));
		}));
};

/** sentinel-driven lazy loading: calls `onLoadMore` when the end scrolls into view (button fallback without IntersectionObserver) */
export const InfiniteScroll = ({ onLoadMore, loading, hasMore = true, children, ...props } = {}) => {
	const sentinel = h('div', { 'data-uele-sentinel': '', style: { height: '1px' } });
	let dead = false;
	const tryLoad = () => {
		if (!dead && val(hasMore) && !val(loading)) onLoadMore?.();
	};
	let io = null, timer;
	if (typeof IntersectionObserver !== 'undefined') {
		timer = setTimeout(() => {
			io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && tryLoad());
			io.observe(sentinel);
		}, 0);
	}
	return h('div', { 'data-uele-infinite-scroll': '', ...props },
		children,
		sentinel,
		onTeardown(() => (dead = true, clearTimeout(timer), io?.disconnect())),
		typeof IntersectionObserver === 'undefined'
			? h('button', { type: 'button', disabled: () => !!val(loading) || !val(hasMore), onclick: tryLoad }, () => (val(loading) ? 'Loading…' : 'Load more'))
			: h('div', { 'aria-live': 'polite' }, () => (val(loading) ? 'Loading…' : '')));
};

/**
 * Command palette (Cmd+K style): filterable action list with keyboard
 * navigation. Controlled via `model`/`open` or opened by its `trigger`.
 * `items={[{label, hint, keywords, onSelect}]}`.
 */
export const CommandPalette = ({ open, model: modelProp, defaultOpen = false, trigger, items = [], placeholder = 'Type a command or search…', onSelect, onOpenChange, ...props } = {}) => {
	const source = modelProp ?? open;
	const controlledCell = isCell(source) ? source : null;
	// a plain boolean `open`/`model` seeds the state (props are mount-time here); a cell stays controlled
	const inner = own(!controlledCell && typeof source === 'boolean' ? source : !!defaultOpen);
	const isOpen = () => (controlledCell ? !!val(controlledCell) : !!read(inner));
	const setOpen = (v) => (controlledCell ? write(controlledCell, v) : write(inner, v), onOpenChange?.(v));
	const query = own('');
	const active = own(0);
	const results = () => {
		const q = String(read(query)).toLowerCase();
		const all = (val(items) || []).map((it) => (typeof it === 'string' ? { label: it } : it));
		if (!q) return all;
		return all.filter((it) => String(it.label).toLowerCase().includes(q) || String(it.keywords || '').toLowerCase().includes(q));
	};
	const choose = (item) => {
		if (!item) return;
		item.onSelect?.(item);
		onSelect?.(item);
		setOpen(false);
		write(query, '');
		write(active, 0);
	};
	const panel = () => {
		if (!isOpen()) return '';
		return h('div', {
			'data-uele-overlay': '', onclick: () => setOpen(false),
			style: { position: 'fixed', inset: 0, background: 'var(--uele-overlay, rgba(15,23,42,0.5))', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '15vh', zIndex: 60 }
		}, h('div', {
			role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette',
			style: { background: 'var(--uele-surface, #fff)', color: 'var(--uele-text, #0f172a)', borderRadius: 'var(--uele-radius-lg, 14px)', boxShadow: 'var(--uele-shadow-lg, 0 12px 32px rgba(0,0,0,0.2))', width: 'min(34rem, calc(100% - 2rem))', overflow: 'hidden' },
			onclick: (e) => e.stopPropagation()
		},
			h('input', {
				type: 'text', placeholder, 'aria-label': placeholder, 'data-uele-command-input': '',
				value: () => read(query),
				style: { width: '100%', boxSizing: 'border-box', padding: '0.875rem 1rem', border: 'none', borderBottom: '1px solid var(--uele-border, #e2e8f0)', fontSize: '1rem' },
				onInput: (e) => (write(query, e.target.value), write(active, 0)),
				onkeydown: (e) => {
					const list = results();
					if (e.key === 'ArrowDown') (e.preventDefault(), write(active, Math.min(list.length - 1, read(active) + 1)));
					else if (e.key === 'ArrowUp') (e.preventDefault(), write(active, Math.max(0, read(active) - 1)));
					else if (e.key === 'Enter') choose(list[read(active)]);
					else if (e.key === 'Escape') setOpen(false);
				}
			}),
			h('ul', { role: 'listbox', 'aria-label': 'Commands', style: { listStyle: 'none', margin: 0, padding: '0.375rem', maxHeight: '18rem', overflowY: 'auto' } },
				() => {
					const list = results();
					if (!list.length) return h('li', { style: { padding: '0.75rem', color: 'var(--uele-text-muted, #64748b)' } }, 'No results');
					return list.map((item, i) => h('li', {
						role: 'option', 'data-label': item.label,
						'aria-selected': () => String(read(active) === i), 'data-active': () => String(read(active) === i),
						style: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.625rem', borderRadius: 'var(--uele-radius-sm, 6px)', cursor: 'pointer' },
						onmouseenter: () => write(active, i),
						onclick: () => choose(item)
					}, h('span', null, item.label), item.hint ? h('span', { style: { color: 'var(--uele-text-muted, #64748b)' } }, item.hint) : null));
				})));
	};
	const onKey = (e) => e.key === 'Escape' && isOpen() && setOpen(false);
	/* istanbul ignore else -- SSR: rendering still requires document (h() throws); this guard only keeps module setup import-safe */
	if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
	return h('div', { style: { display: 'contents' }, ...props },
		trigger != null ? h('button', { type: 'button', 'aria-haspopup': 'dialog', onclick: () => setOpen(true) }, trigger) : null,
		() => panel(),
		onTeardown(() => document.removeEventListener('keydown', onKey)));
};

/* ------------------------------------------------ menus, nav & overlays 2 */

/** right-click menu: wrap the target area in `children`, items like Menu's */
export const ContextMenu = ({ items = [], onSelect, children, ...props } = {}) => {
	const state = own({ open: false, x: 0, y: 0 });
	const close = () => write(state, { ...read(state), open: false });
	const onDocClick = () => read(state).open && close();
	/* istanbul ignore else -- SSR: rendering still requires document (h() throws); this guard only keeps module setup import-safe */
	if (typeof document !== 'undefined') document.addEventListener('click', onDocClick);
	return h('div', {
		'data-uele-context-menu': '', ...props,
		oncontextmenu: (e) => (e.preventDefault(), write(state, { open: true, x: e.clientX, y: e.clientY })),
		onkeydown: (e) => e.key === 'Escape' && close()
	}, children, onTeardown(() => document.removeEventListener('click', onDocClick)),
		() => (read(state).open
			? h('div', {
					role: 'menu',
					style: { position: 'fixed', left: `${read(state).x}px`, top: `${read(state).y}px`, zIndex: 70, minWidth: '10rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.25rem' },
					onclick: (e) => e.stopPropagation()
				}, (val(items) || []).map((item) => MenuItem({
					disabled: item.disabled,
					onSelect: () => (item.onSelect?.(item), onSelect?.(item), close()),
					children: item.label
				})))
			: ''));
};

/** site navigation with dropdown panels: `items={[{label, href, content | links:[{label,href}]}]` */
export const NavigationMenu = ({ items = [], ...props } = {}) => {
	const open = own('');
	return h('nav', { 'aria-label': 'Main', 'data-uele-nav-menu': '', ...props, onmouseleave: () => write(open, '') },
		h('ul', { style: { display: 'flex', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 } },
			(val(items) || []).map((item) => {
				const hasPanel = !!(item.content || item.links);
				return h('li', { style: { position: 'relative' }, onmouseenter: () => hasPanel && write(open, item.label) },
					item.href && !hasPanel
						? h('a', { href: item.href, style: { padding: '0.5rem 0.75rem', display: 'inline-block' } }, item.label)
						: h('button', {
								type: 'button', 'aria-haspopup': hasPanel ? 'true' : undefined,
								'aria-expanded': hasPanel ? () => String(read(open) === item.label) : undefined, 'data-label': item.label,
								onclick: () => hasPanel && write(open, read(open) === item.label ? '' : item.label),
								style: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0.75rem', font: 'inherit' }
							}, item.label),
					hasPanel
						? h('div', {
								role: 'menu', hidden: () => read(open) !== item.label,
								style: { position: 'absolute', top: '100%', left: 0, zIndex: 30, minWidth: '14rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem' }
							}, item.content ?? item.links.map((link) => h('a', { href: link.href, role: 'menuitem', style: { display: 'block', padding: '0.375rem 0.5rem' } }, link.label))) // panel only renders when content||links is truthy; content nullish here means links is set
						: null);
			})));
};

/** hover card: rich content on hover/focus after a short delay (Tooltip's big sibling) */
export const HoverCard = ({ trigger, content, children, delay = 300, ...props } = {}) => {
	const visible = own(false);
	let openTimer = null;
	let closeTimer = null;
	const scheduleOpen = () => (clearTimeout(openTimer), clearTimeout(closeTimer), (openTimer = setTimeout(() => write(visible, true), delay)));
	const scheduleClose = () => (clearTimeout(closeTimer), clearTimeout(openTimer), (closeTimer = setTimeout(() => write(visible, false), 120)));
	return h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onmouseenter: scheduleOpen, onmouseleave: scheduleClose, onfocus: scheduleOpen, onblur: scheduleClose
	}, trigger ?? children,
		h('span', {
			role: 'dialog', 'data-uele-hover-card': '', hidden: () => !read(visible), ...props,
			style: { position: 'absolute', top: '100%', left: 0, zIndex: 25, marginTop: '0.375rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.875rem', minWidth: '14rem', ...props.style }
		}, content), onTeardown(() => { clearTimeout(openTimer); clearTimeout(closeTimer); }));
};

/** two resizable panels with a draggable divider; ratio via `model` (0..1) */
export const SplitPane = ({ first, second, children, direction = 'horizontal', model: cell, defaultRatio = 0.5, min = 0.15, max = 0.85, onChange, ...props } = {}) => {
	const [ratio, setRatio] = controllable(cell, defaultRatio, onChange);
	const horizontal = direction === 'horizontal';
	let container = null;
	let stopDrag = () => {};
	const startDrag = (e) => {
		stopDrag();
		e.preventDefault();
		const move = (ev) => {
			const rect = container.getBoundingClientRect(); // ref assigns container during h(), before any drag can start
			const raw = horizontal ? (ev.clientX - rect.left) / rect.width : (ev.clientY - rect.top) / rect.height;
			setRatio(Math.min(max, Math.max(min, raw)));
		};
		const up = () => {
			document.removeEventListener('mousemove', move);
			document.removeEventListener('mouseup', up);
		};
		stopDrag = up;
		document.addEventListener('mousemove', move);
		document.addEventListener('mouseup', up);
	};
	const left = hasKids(children) && Array.isArray(children) ? children[0] : first;
	const right = hasKids(children) && Array.isArray(children) ? children[1] : second;
	return h('div', {
		'data-uele-split': '', ...props,
		ref: (el) => (container = el),
		style: { display: 'flex', flexDirection: horizontal ? 'row' : 'column', width: '100%', height: '100%', ...props.style }
	},
		h('div', { 'data-pane': 'first', style: horizontal ? { width: () => ratio() * 100 + '%', overflow: 'auto' } : { height: () => ratio() * 100 + '%', overflow: 'auto' } }, left),
		h('div', {
			role: 'separator', 'aria-orientation': horizontal ? 'vertical' : 'horizontal', tabIndex: 0,
			'aria-valuemin': Math.round(min * 100), 'aria-valuemax': Math.round(max * 100), 'aria-valuenow': () => Math.round(ratio() * 100),
			'data-uele-split-divider': '',
			style: horizontal ? { width: '6px', cursor: 'col-resize', background: 'var(--uele-border, #e2e8f0)', flex: 'none' } : { height: '6px', cursor: 'row-resize', background: 'var(--uele-border, #e2e8f0)', flex: 'none' },
			onmousedown: startDrag,
			onkeydown: (e) => {
				const step = e.shiftKey ? 0.1 : 0.02;
				if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setRatio(Math.max(min, ratio() - step));
				if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setRatio(Math.min(max, ratio() + step));
			}
		}),
		h('div', { 'data-pane': 'second', style: { flex: '1 1 auto', overflow: 'auto' } }, right), onTeardown(() => stopDrag()));
};

/** click-to-edit inline text: Enter/blur commits, Escape cancels */
export const Editable = ({ model: cell, value, placeholder = 'Click to edit', onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, '', onChange);
	const editing = own(false);
	let draft = '';
	let input = null, focusTimer;
	const commit = () => (setCurrent(draft), write(editing, false));
	const view = h('button', {
		type: 'button', 'aria-label': label || 'Edit',
		hidden: () => !!read(editing),
		style: { background: 'none', border: 'none', cursor: 'text', font: 'inherit', padding: '0.25rem' },
		onclick: () => {
			draft = String(current() ?? '');
			write(editing, true);
			clearTimeout(focusTimer);
			focusTimer = setTimeout(() => input?.focus(), 0);
		}
	}, () => String(current() ?? '') || placeholder);
	input = h('input', {
		type: 'text', 'aria-label': label || 'Edit value', ...props,
		hidden: () => !read(editing),
		value: () => (read(editing) ? draft : current() ?? ''),
		onInput: (e) => (draft = e.target.value),
		onkeydown: (e) => {
			if (e.key === 'Enter') commit();
			if (e.key === 'Escape') write(editing, false);
		},
		onblur: () => read(editing) && commit()
	});
	return h('span', { 'data-uele-editable': '', 'data-editing': () => String(!!read(editing)) }, view, input, onTeardown(() => clearTimeout(focusTimer)));
};

/** thumbnail gallery with a lightbox viewer (prev/next/close, Escape closes) */
export const Lightbox = ({ images = [], ...props } = {}) => {
	const list = () => (val(images) || []).map((img) => (typeof img === 'string' ? { src: img, alt: '' } : img));
	const open = own(false);
	const index = own(0);
	const show = (i) => (write(index, i), write(open, true));
	const step = (d) => {
		const len = list().length || 1;
		write(index, ((read(index) + d) % len + len) % len);
	};
	const onKey = (e) => {
		if (!read(open)) return;
		if (e.key === 'Escape') write(open, false);
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	};
	/* istanbul ignore else -- SSR: rendering still requires document (h() throws); this guard only keeps module setup import-safe */
	if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
	return h('div', { 'data-uele-lightbox': '', ...props },
		onTeardown(() => document.removeEventListener('keydown', onKey)),
		h('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
			() => list().map((img, i) => h('button', {
				type: 'button', 'aria-label': `View image ${i + 1}`, style: { padding: 0, border: 'none', cursor: 'pointer', background: 'none' },
				onclick: () => show(i)
			}, h('img', { src: img.src, alt: img.alt || '', width: 96, height: 96, style: { objectFit: 'cover', borderRadius: 'var(--uele-radius-sm, 6px)' } })))),
		() => (read(open) && list()[read(index)]
			? h('div', {
					role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Image viewer',
					style: { position: 'fixed', inset: 0, zIndex: 65, background: 'var(--uele-overlay, rgba(0,0,0,0.7))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
					onclick: () => write(open, false)
				},
					h('button', { type: 'button', 'aria-label': 'Previous image', onclick: (e) => (e.stopPropagation(), step(-1)) }, '‹'),
					h('img', { src: list()[read(index)].src, alt: list()[read(index)].alt || '', 'data-uele-lightbox-img': '', style: { maxWidth: '80vw', maxHeight: '85vh' }, onclick: (e) => e.stopPropagation() }),
					h('button', { type: 'button', 'aria-label': 'Next image', onclick: (e) => (e.stopPropagation(), step(1)) }, '›'),
					h('button', { type: 'button', 'aria-label': 'Close viewer', onclick: () => write(open, false), style: { position: 'absolute', top: '1rem', right: '1rem' } }, '×'))
			: ''));
};

const formatBytes = (bytes) => {
	if (bytes == null) return '';
	const units = ['B', 'KB', 'MB', 'GB'];
	let n = Number(bytes);
	let i = 0;
	while (n >= 1024 && i < units.length - 1) (n /= 1024, i++);
	return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
};
/** uploaded-file list with progress + status + remove: `files={[{name,size,progress,status}]}` */
export const FileList = ({ files, onRemove, ...props } = {}) =>
	h('ul', { 'data-uele-file-list': '', ...props, style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', ...props.style } },
		() => (val(files) || []).map((file, i) => h('li', {
			'data-file': file.name, 'data-status': file.status || 'done',
			style: { display: 'flex', gap: '0.625rem', alignItems: 'center', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', padding: '0.5rem 0.75rem' }
		},
			h('span', { style: { fontWeight: 600 } }, file.name),
			h('span', { style: { color: 'var(--uele-text-muted, #64748b)', fontSize: '0.8125rem' } }, formatBytes(file.size)),
			file.status === 'error'
				? Badge({ tone: 'danger', children: file.error || 'Failed' })
				: file.progress != null && file.progress < 100
					? Progress({ value: file.progress, label: `Uploading ${file.name}` })
					: Badge({ tone: 'success', children: 'Done' }),
			onRemove ? h('button', { type: 'button', 'aria-label': `Remove ${file.name}`, onclick: () => onRemove(file, i) }, '×') : null)));

/** multi-step wizard: Stepper header + panel + Back/Next/Finish over `steps={[{label,content}]}` */
export const Wizard = ({ steps = [], model: cell, defaultStep = 0, onChange, onFinish, finishLabel = 'Finish', ...props } = {}) => {
	const [step, setStep] = controllable(cell, defaultStep, onChange);
	const list = val(steps) || [];
	const last = list.length - 1;
	return h('div', { 'data-uele-wizard': '', ...props },
		Stepper({ steps: list, current: () => step(), onChange: (i) => setStep(i) }),
		h('div', { 'data-uele-wizard-panel': '', style: { padding: '1rem 0' } }, () => list[step()]?.content),
		h('div', { style: { display: 'flex', gap: '0.5rem', justifyContent: 'space-between' } },
			h('button', { type: 'button', disabled: () => step() <= 0, onclick: () => setStep(step() - 1) }, 'Back'),
			() => (step() >= last
				? h('button', { type: 'button', 'data-action': 'finish', onclick: (e) => onFinish?.(e) }, finishLabel)
				: h('button', { type: 'button', 'data-action': 'next', onclick: () => setStep(step() + 1) }, 'Next'))));
};

/* ------------------------------------------------------ app chrome & misc */

/** toolbar landmark (`role="toolbar"`) */
export const Toolbar = ({ label = 'Toolbar', children, ...props } = {}) =>
	h('div', { role: 'toolbar', 'aria-label': label, ...props, style: { display: 'flex', gap: '0.375rem', alignItems: 'center', ...props.style } }, children);

/** top navigation bar: brand, links and actions slots */
export const Navbar = ({ brand, links, actions, children, ...props } = {}) =>
	h('header', {
		'data-uele-navbar': '', ...props,
		style: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--uele-border, #e2e8f0)', background: 'var(--uele-surface, #fff)', ...props.style }
	},
		brand ? h('span', { 'data-uele-brand': '', style: { fontWeight: 700 } }, brand) : null,
		links ? h('nav', { 'aria-label': 'Primary', style: { display: 'flex', gap: '0.75rem' } },
			(val(links) || []).map((link) => h('a', { href: link.href || '#', ...(link.current ? { 'aria-current': 'page' } : {}) }, link.label))) : null,
		h('span', { style: { flex: '1 1 auto' } }),
		actions || children || null);

/** dashboard shell: optional header + sidebar + main (+ footer) grid */
export const AppShell = ({ header, sidebar, footer, children, main, ...props } = {}) =>
	h('div', {
		'data-uele-app-shell': '', ...props,
		style: { display: 'grid', minHeight: '100dvh', gridTemplateRows: `${header ? 'auto ' : ''}1fr${footer ? ' auto' : ''}`, gridTemplateColumns: sidebar ? '16rem 1fr' : '1fr', ...props.style }
	},
		header ? h('header', { style: sidebar ? { gridColumn: '1 / -1' } : undefined }, header) : null,
		sidebar ? h('aside', { 'data-uele-sidebar': '', style: { borderRight: '1px solid var(--uele-border, #e2e8f0)', padding: '1rem', overflowY: 'auto' } }, sidebar) : null,
		h('main', { id: 'main', style: { padding: '1rem', overflowY: 'auto' } }, main ?? children),
		footer ? h('footer', { style: sidebar ? { gridColumn: '1 / -1' } : undefined }, footer) : null);

/** vertical timeline: `items={[{title, time, description}]}` (or children) */
export const Timeline = ({ items, children, ...props } = {}) =>
	h('ol', { 'data-uele-timeline': '', ...props, style: { listStyle: 'none', margin: 0, padding: 0, ...props.style } },
		hasKids(children) ? children : (val(items) || []).map((item) => h('li', {
			style: { position: 'relative', paddingLeft: '1.5rem', paddingBottom: '1.25rem', borderLeft: '2px solid var(--uele-border, #e2e8f0)', marginLeft: '0.375rem' }
		},
			h('span', { 'aria-hidden': 'true', style: { position: 'absolute', left: '-0.4375rem', top: '0.125rem', width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'var(--uele-accent, #2563eb)' } }),
			h('strong', null, item.title),
			item.time ? h('span', { style: { display: 'block', color: 'var(--uele-text-muted, #64748b)', fontSize: '0.8125rem' } }, item.time) : null,
			item.description ? h('p', { style: { margin: '0.25rem 0 0' } }, item.description) : null)));
