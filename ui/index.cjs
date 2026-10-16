'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');
var hooks = require('uele/hooks');

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

/* --------------------------------------------------------------- helpers */

/** unwrap a maybe-reactive value (cell, thunk or plain) to its current value */
const val = (x) => (x == null || (typeof x !== 'object' && typeof x !== 'function') ? x : uele.get(x));
/** jsx hands `[]` for no children; direct calls hand anything */
const hasKids = (c) => (Array.isArray(c) ? c.length > 0 : c != null && c !== '');
const kidsOf = (c) => (hasKids(c) ? c : null);

/** an internal cell even before a preset is installed (degraded: plain `.value` box) */
const own = (initial) => {
	try {
		return reactive.signal(initial);
	} catch {
		let v = initial;
		const subs = new Set();
		return {
			get value() { return v; },
			set value(n) { v = n; subs.forEach((f) => f(n)); },
			subscribe(fn) { subs.add(fn); fn(v); return { unsubscribe: () => subs.delete(fn) }; }
		};
	}
};

/**
 * Radix-style controllable state. `controlled` may be a cell, a plain value or
 * `undefined` (uncontrolled, seeded by `initial`). Returns `[read, write]`
 * thunks; the write also fires `onChange`.
 */
const controllable = (controlled, initial, onChange) => {
	const inner = own(initial);
	const readValue = () => (controlled !== undefined ? val(controlled) : reactive.read(inner));
	const writeValue = (v) => {
		const next = typeof v === 'function' ? v(readValue()) : v;
		if (reactive.isCell(controlled)) reactive.write(controlled, next);
		else if (controlled === undefined) reactive.write(inner, next);
		onChange?.(next);
	};
	return [readValue, writeValue];
};

/** `value`/`checked` display live (h's job); this wires the write-back */
const model = (el, cell, event, key) => {
	if (!cell) return;
	el.addEventListener(event, () => reactive.write(cell, key ? el[key] : el.value));
};
const modelCell = (cell, fallbackProp, handler) => cell ?? (handler === undefined && uele.is(fallbackProp) ? fallbackProp : null);

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

/* ------------------------------------------------------------------ forms */

const Form = ({ onSubmit, children, ...props } = {}) =>
	uele.h('form', {
		...props,
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit?.(e);
		}
	}, children);

const Field = ({ label, children, ...props } = {}) =>
	uele.h('label', props, label, ' ', children);

const Label = ({ children, ...props } = {}) => uele.h('label', props, children);

/** small muted helper text under a field (a styled span: `<small>` hits the MathML tag heuristic) */
const FieldHint = ({ children, ...props } = {}) =>
	uele.h('span', { ...props, style: { display: 'block', fontSize: '0.8125rem', color: 'var(--uele-text-muted, #64748b)', ...props.style } }, children);

/** field error text: announces itself (`role="alert"`) when it has content */
const FieldError = ({ children, ...props } = {}) =>
	uele.h('span', { role: 'alert', ...props, style: { display: 'block', fontSize: '0.8125rem', color: 'var(--uele-danger, #dc2626)', ...props.style } }, children);

const Button = ({ variant, size, children, ...props } = {}) =>
	uele.h('button', {
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

const Input = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = uele.h('input', { type: 'text', ...props, value: value ?? (uele.is(cell) ? cell : null), onInput });
	model(el, modelCell(cell, value, onInput), 'input'); // model (or a writable value) = two-way
	return el;
};

const Textarea = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = uele.h('textarea', { ...props, value: value ?? (uele.is(cell) ? cell : null), onInput });
	model(el, modelCell(cell, value, onInput), 'input');
	return el;
};

const Checkbox = ({ model: cell, onChange, checked, children, ...props } = {}) => {
	const el = uele.h('input', { type: 'checkbox', ...props, checked: checked ?? (uele.is(cell) ? cell : null), onChange });
	model(el, modelCell(cell, checked, onChange), 'change', 'checked');
	return el;
};

const Option = ({ children, ...props } = {}) => uele.h('option', props, children);

const Select = ({ model: cell, onChange, value, options, children, ...props } = {}) => {
	// jsx hands an empty `[]` over when there are no children, so fall back on `options`
	const kids = Array.isArray(children) ? (children.length ? children : null) : children ?? null;
	const el = uele.h('select', { ...props, value: value ?? (uele.is(cell) ? cell : null), onChange }, kids ?? (options || []).map((o) =>
		typeof o === 'object' ? uele.h('option', { value: o.value }, o.label) : uele.h('option', { value: o }, o)
	));
	model(el, modelCell(cell, value, onChange), 'change');
	return el;
};

/** a single radio input; usually rendered by `RadioGroup` (which supplies `name`/`model`) */
const Radio = ({ model: cell, value, label, children, onChange, ...props } = {}) => {
	const input = uele.h('input', {
		type: 'radio',
		...props,
		value,
		checked: cell !== undefined ? () => val(cell) === value : props.checked,
		onChange: (e) => {
			if (e.target.checked) {
				if (reactive.isCell(cell)) reactive.write(cell, value);
				onChange?.(value, e);
			}
		}
	});
	const content = kidsOf(children) ?? label;
	return content != null ? uele.h('label', null, input, ' ', content) : input;
};

/** `role="radiogroup"` over `options` (strings or `{value,label,disabled}`), or your own `<Radio>` children */
const RadioGroup = ({ model: cell, value, name, options, onChange, children, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, undefined, onChange);
	const groupName = name || nextId('uele-radio');
	return uele.h('div', { role: 'radiogroup', ...props }, hasKids(children) ? children : (options || []).map((o) => {
		const opt = typeof o === 'object' ? o : { value: o, label: o };
		const input = uele.h('input', {
			type: 'radio', name: groupName, value: opt.value, disabled: opt.disabled,
			checked: () => current() === opt.value,
			onChange: (e) => e.target.checked && setCurrent(opt.value)
		});
		return uele.h('label', null, input, ' ', opt.label);
	}));
};

/** Radix-style switch: a `role="switch"` button, two-way via `model`/`checked` */
const Switch = ({ model: cell, checked, onChange, onCheckedChange, label, children, ...props } = {}) => {
	const controlled = cell ?? checked;
	const [on, setOn] = controllable(controlled, false, onCheckedChange || onChange);
	const el = uele.h('button', {
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
	}, kidsOf(children) ?? label ?? '');
	// live background follows state through a function child region is overkill: track with sub when reactive
	el.style.background = 'var(--uele-border, #e2e8f0)';
	const paint = () => (el.style.background = on() ? 'var(--uele-accent, #2563eb)' : 'var(--uele-border, #e2e8f0)');
	paint();
	if (uele.is(controlled)) uele.sub(controlled, paint, () => {});
	el.addEventListener('click', () => setOn(!on()));
	return el;
};

/** `role="slider"` range input, two-way via `model`; writes numbers */
const Slider = ({ model: cell, value, min = 0, max = 100, step = 1, onChange, children, ...props } = {}) => {
	const el = uele.h('input', {
		type: 'range', min, max, step, ...props,
		value: value ?? (uele.is(cell) ? cell : null),
		'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': () => Number(val(cell ?? value) ?? min)
	});
	el.addEventListener('input', () => {
		const target = modelCell(cell, value, onChange);
		if (target) reactive.write(target, Number(el.value));
		onChange?.(Number(el.value));
	});
	return el;
};

/** star rating: `role="radiogroup"` of `role="radio"` star buttons, two-way via `model` */
const Rating = ({ model: cell, value, max = 5, onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, 0, onChange);
	return uele.h('div', {
		role: 'radiogroup', 'aria-label': label || 'Rating', ...props,
		style: { display: 'inline-flex', gap: '0.125rem', ...props.style },
		onkeydown: (e) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setCurrent(Math.min(max, (current() || 0) + 1));
			if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setCurrent(Math.max(0, (current() || 0) - 1));
		}
	}, Array.from({ length: max }, (_, i) => {
		const star = i + 1;
		return uele.h('button', {
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
const NumberInput = ({ model: cell, value, min = -Infinity, max = Infinity, step = 1, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, 0, onChange);
	const clamp = (v) => Math.min(max, Math.max(min, v));
	const input = uele.h('input', {
		type: 'number', min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null, step, ...props,
		value: () => (current() ?? ''),
		onInput: (e) => {
			const n = e.target.value === '' ? '' : Number(e.target.value);
			if (typeof n === 'number' && !Number.isNaN(n)) setCurrent(clamp(n));
		}
	});
	const btn = (labelText, delta) => uele.h('button', {
		type: 'button', 'aria-label': labelText, onclick: () => setCurrent(clamp((Number(current()) || 0) + delta)),
		style: { cursor: 'pointer' }
	}, labelText === 'Decrement' ? '−' : '+');
	return uele.h('div', { 'data-uele-number-input': '', style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } }, btn('Decrement', -step), input, btn('Increment', step));
};

/** search input with a clear button */
const SearchInput = ({ model: cell, value, onInput, onSearch, placeholder = 'Search…', ...props } = {}) => {
	const input = Input({ model: cell, value, onInput, type: 'search', placeholder, ...props });
	const clear = uele.h('button', {
		type: 'button', 'aria-label': 'Clear search',
		onclick: () => {
			const target = modelCell(cell, value, onInput);
			if (target) reactive.write(target, '');
			input.value = '';
			onSearch?.('');
			input.focus?.();
		}
	}, '×');
	input.addEventListener('input', () => onSearch?.(input.value));
	return uele.h('div', { 'data-uele-search': '', style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } }, input, clear);
};

/**
 * One-time-code / PIN input: `length` boxes, auto-advance, backspace-back,
 * paste-to-fill, `onComplete(code)` when full. Two-way via `model` (a string cell).
 */
const OTPInput = ({ length = 6, model: cell, value, onChange, onComplete, label, ...props } = {}) => {
	const [code, setCode] = controllable(cell ?? value, '', onChange);
	const inputs = [];
	const digitsOf = () => String(code() || '').padEnd(length, '').slice(0, length).split('');
	const writeDigit = (index, raw) => {
		const clean = String(raw ?? '').replace(/\D/g, '');
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
	const host = uele.h('div', {
		role: 'group', 'aria-label': label || 'One-time code',
		'data-uele-otp': '', ...props,
		style: { display: 'inline-flex', gap: '0.375rem', ...props.style },
		onpaste: (e) => {
			e.preventDefault();
			writeDigit(0, e.clipboardData?.getData('text') || '');
		}
	}, Array.from({ length }, (_, i) => {
		const input = uele.h('input', {
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
/** alias */
const PinInput = OTPInput;
/** alias */
const OTP = OTPInput;

/** tag/chip editor over an array cell: Enter or comma adds, × / Backspace removes */
const TagInput = ({ model: cell, value, placeholder = 'Add a tag…', onChange, ...props } = {}) => {
	const [tags, setTags] = controllable(cell ?? value, [], onChange);
	const input = uele.h('input', {
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
		uele.h('span', { 'data-tag': tag, style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center', background: 'var(--uele-accent-soft, #eff6ff)', borderRadius: 'var(--uele-radius-full, 9999px)', padding: '0.125rem 0.5rem' } },
			String(tag),
			uele.h('button', { type: 'button', 'aria-label': `Remove ${tag}`, onclick: () => setTags(tags().filter((_, j) => j !== i)) }, '×'))
	);
	return uele.h('div', { 'data-uele-tags': '', ...props, style: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center', ...props.style } }, () => chips(), input);
};

/** label + hidden file input; `onFiles(File[])` on pick */
const FileInput = ({ onFiles, onChange, accept, multiple, label, children, ...props } = {}) => {
	const input = uele.h('input', {
		type: 'file', accept, multiple, hidden: true, ...props,
		onChange: (e) => {
			const files = [...(e.target.files || [])];
			onFiles?.(files);
			onChange?.(files);
		}
	});
	return uele.h('label', { 'data-uele-file': '', style: { display: 'inline-flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' } },
		input, kidsOf(children) ?? label ?? 'Choose file');
};

/** drag-and-drop file target with a click-to-browse fallback */
const Dropzone = ({ onFiles, accept, multiple, children, ...props } = {}) => {
	let input;
	const zone = uele.h('div', {
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
	input = uele.h('input', { type: 'file', accept, multiple, hidden: true, onChange: (e) => onFiles?.([...(e.target.files || [])]) });
	zone.append(input);
	return zone;
};

/** combobox: filterable single-select over `options`, two-way via `model` */
const Combobox = ({ model: cell, value, options = [], placeholder = 'Select…', onChange, label, ...props } = {}) => {
	const [current, setCurrent] = controllable(cell ?? value, '', onChange);
	const open = own(false);
	const query = own(val(cell ?? value) || '');
	const optionList = () => {
		const all = val(options) || [];
		const q = String(reactive.read(query) || '').toLowerCase();
		return all.map((o) => (typeof o === 'object' ? o : { value: o, label: o })).filter((o) => !q || String(o.label).toLowerCase().includes(q));
	};
	const input = uele.h('input', {
		type: 'text', role: 'combobox', 'aria-expanded': () => String(!!reactive.read(open)), 'aria-label': label || placeholder,
		placeholder, ...props, value: () => reactive.read(query),
		onInput: (e) => (reactive.write(query, e.target.value), reactive.write(open, true)),
		onfocus: () => reactive.write(open, true),
		onkeydown: (e) => {
			if (e.key === 'Escape') reactive.write(open, false);
			if (e.key === 'ArrowDown') reactive.write(open, true);
		}
	});
	const list = uele.h('ul', { role: 'listbox', hidden: () => !reactive.read(open), style: { listStyle: 'none', margin: 0, padding: 0 } },
		() => optionList().map((o) => uele.h('li', {
			role: 'option', 'data-value': o.value, 'aria-selected': () => String(current() === o.value),
			style: { cursor: 'pointer', padding: '0.375rem 0.5rem' },
			onclick: () => (setCurrent(o.value), reactive.write(query, String(o.label)), reactive.write(open, false))
		}, String(o.label))));
	const toggle = uele.h('button', {
		type: 'button', 'aria-label': 'Toggle options', tabindex: -1,
		onclick: () => reactive.write(open, !reactive.read(open))
	}, '▾');
	return uele.h('div', { 'data-uele-combobox': '', style: { position: 'relative', display: 'inline-block' } }, input, toggle, list);
};

/* ------------------------------------------------------- layout & structure */

const Card = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { padding: '1rem', border: '1px solid var(--uele-border, #ddd)', borderRadius: 'var(--uele-radius-lg, 8px)', background: 'var(--uele-surface, #fff)', ...props.style } }, children);

const Stack = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', ...props.style } }, children);

const Row = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', ...props.style } }, children);

/** CSS grid wrapper: `columns` is a count or a `grid-template-columns` string */
const Grid = ({ columns = 2, gap = '0.75rem', children, ...props } = {}) =>
	uele.h('div', {
		...props,
		style: {
			display: 'grid', gap,
			gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns,
			...props.style
		}
	}, children);

/** centered page container */
const Container = ({ maxWidth = '72rem', children, ...props } = {}) =>
	uele.h('div', { ...props, style: { maxWidth, marginInline: 'auto', paddingInline: '1rem', width: '100%', boxSizing: 'border-box', ...props.style } }, children);

/** flexbox centering wrapper */
const Center = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', ...props.style } }, children);

/** flexible spacer (`size` pins it, otherwise it grows) */
const Spacer = ({ size, ...props } = {}) =>
	uele.h('div', { 'aria-hidden': 'true', ...props, style: size ? { width: size, height: size, flex: 'none' } : { flex: '1 1 auto' } });

/** horizontal/vertical rule with separator semantics */
const Separator = ({ orientation = 'horizontal', decorative = true, ...props } = {}) =>
	uele.h('div', {
		role: decorative ? undefined : 'separator',
		'aria-orientation': decorative ? undefined : orientation,
		'data-orientation': orientation,
		...props,
		style: orientation === 'vertical'
			? { width: '1px', alignSelf: 'stretch', background: 'var(--uele-border, #e2e8f0)', ...props.style }
			: { height: '1px', width: '100%', background: 'var(--uele-border, #e2e8f0)', border: 'none', ...props.style }
	});
/** alias */
const Divider = Separator;

/** keeps children at `ratio` (e.g. `16/9` or `1.777`) */
const AspectRatio = ({ ratio = '16/9', children, ...props } = {}) =>
	uele.h('div', { ...props, style: { aspectRatio: String(ratio), width: '100%', overflow: 'hidden', ...props.style } }, children);

/** scrollable region */
const ScrollArea = ({ maxHeight = '16rem', children, ...props } = {}) =>
	uele.h('div', { ...props, tabIndex: 0, style: { overflow: 'auto', maxHeight, ...props.style } }, children);

/* --------------------------------------------------------------- typography */

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const Heading = ({ level = 2, children, ...props } = {}) =>
	uele.h(HEADINGS[Math.min(6, Math.max(1, level)) - 1], props, children);

const Text = ({ as = 'p', children, ...props } = {}) => uele.h(as, props, children);

const Link = ({ href, children, ...props } = {}) =>
	uele.h('a', { ...props, href, style: { color: 'var(--uele-accent, #2563eb)', ...props.style } }, children);

const Kbd = ({ children, ...props } = {}) =>
	uele.h('kbd', {
		...props,
		style: {
			fontFamily: 'ui-monospace, monospace', fontSize: '0.8125em', padding: '0.125rem 0.375rem',
			border: '1px solid var(--uele-border, #e2e8f0)', borderBottomWidth: '2px',
			borderRadius: 'var(--uele-radius-sm, 6px)', background: 'var(--uele-surface-hover, #f8fafc)', ...props.style
		}
	}, children);

const Code = ({ children, ...props } = {}) =>
	uele.h('code', {
		...props,
		style: { fontFamily: 'ui-monospace, monospace', fontSize: '0.875em', background: 'var(--uele-accent-soft, #f1f5f9)', padding: '0.125rem 0.375rem', borderRadius: 'var(--uele-radius-sm, 6px)', ...props.style }
	}, children);

const Blockquote = ({ children, ...props } = {}) =>
	uele.h('blockquote', {
		...props,
		style: { borderLeft: '3px solid var(--uele-accent, #2563eb)', marginInline: 0, paddingLeft: '1rem', color: 'var(--uele-text-muted, #64748b)', ...props.style }
	}, children);

const List = ({ ordered, children, ...props } = {}) => uele.h(ordered ? 'ol' : 'ul', props, children);
const ListItem = ({ children, ...props } = {}) => uele.h('li', props, children);

/* ------------------------------------------------------------ data display */

const TONES = {
	neutral: ['var(--uele-surface-hover, #f8fafc)', 'var(--uele-text, #0f172a)'],
	info: ['var(--uele-accent-soft, #eff6ff)', 'var(--uele-info, #0284c7)'],
	success: ['#f0fdf4', 'var(--uele-success, #16a34a)'],
	warning: ['#fffbeb', 'var(--uele-warning, #d97706)'],
	danger: ['#fef2f2', 'var(--uele-danger, #dc2626)']
};

const Badge = ({ tone = 'neutral', variant, children, ...props } = {}) => {
	const key = TONES[tone] ? tone : 'neutral';
	const [bg, fg] = TONES[key];
	return uele.h('span', {
		'data-tone': key, ...(variant ? { 'data-variant': variant } : {}), ...props,
		style: {
			display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem',
			borderRadius: 'var(--uele-radius-full, 9999px)', background: bg, color: fg, fontSize: '0.75rem', fontWeight: 600,
			...props.style
		}
	}, children);
};

const Avatar = ({ src, alt, name, size = 40, fallback, children, ...props } = {}) => {
	const px = typeof size === 'number' ? `${size}px` : size;
	if (val(src)) {
		return uele.h('img', {
			...props, src, alt: alt ?? val(name) ?? '', width: size, height: size,
			style: { width: px, height: px, borderRadius: '50%', objectFit: 'cover', ...props.style }
		});
	}
	const initials = () => {
		const n = String(val(name) || '').trim();
		return kidsOf(children) ?? fallback ?? (n ? n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?');
	};
	return uele.h('span', {
		role: 'img', 'aria-label': alt ?? val(name) ?? 'Avatar', ...props,
		style: {
			display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: px, height: px,
			borderRadius: '50%', background: 'var(--uele-accent-soft, #eff6ff)', color: 'var(--uele-accent, #2563eb)',
			fontWeight: 600, overflow: 'hidden', ...props.style
		}
	}, () => initials());
};

const Skeleton = ({ width = '100%', height = '1rem', circle, ...props } = {}) =>
	uele.h('div', {
		'aria-hidden': 'true', 'data-uele-skeleton': '', ...props,
		style: { width, height, borderRadius: circle ? '50%' : 'var(--uele-radius, 10px)', background: 'var(--uele-surface-hover, #f1f5f9)', ...props.style }
	});

const Spinner = ({ label = 'Loading', ...props } = {}) =>
	uele.h('span', {
		role: 'status', 'aria-label': label, 'data-uele-spinner': '', ...props,
		style: {
			display: 'inline-block', width: '1rem', height: '1rem', borderRadius: '50%',
			border: '2px solid var(--uele-border, #e2e8f0)', borderTopColor: 'var(--uele-accent, #2563eb)',
			animation: 'uele-spin 0.8s linear infinite', ...props.style
		}
	});

const Alert = ({ tone = 'info', title, children, ...props } = {}) => {
	const key = TONES[tone] ? tone : 'info';
	const [bg, fg] = TONES[key];
	return uele.h('div', {
		role: key === 'danger' || key === 'warning' ? 'alert' : 'status',
		'data-tone': key, ...props,
		style: { background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 'var(--uele-radius, 10px)', padding: '0.75rem 1rem', ...props.style }
	}, title ? uele.h('strong', null, title) : null, title && hasKids(children) ? ' ' : null, children);
};

const Progress = ({ value, max = 100, label, ...props } = {}) => {
	const pct = () => Math.min(100, Math.max(0, ((Number(val(value)) || 0) / (Number(val(max)) || 100)) * 100));
	return uele.h('div', {
		role: 'progressbar', 'aria-label': label || 'Progress',
		'aria-valuemin': 0, 'aria-valuemax': () => Number(val(max)) || 100, 'aria-valuenow': () => Math.round(Number(val(value)) || 0),
		...props,
		style: { height: '0.5rem', borderRadius: 'var(--uele-radius-full, 9999px)', background: 'var(--uele-surface-hover, #f1f5f9)', overflow: 'hidden', ...props.style }
	}, uele.h('div', {
		'data-uele-progress-bar': '',
		style: { height: '100%', background: 'var(--uele-accent, #2563eb)', width: () => pct() + '%' }
	}));
};

/** KPI block: small label, big value, optional help/delta line */
const Stat = ({ label, value, help, children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.25rem', ...props.style } },
		label ? uele.h('span', { style: { color: 'var(--uele-text-muted, #64748b)', fontSize: '0.875rem' } }, label) : null,
		uele.h('span', { style: { fontSize: '1.5rem', fontWeight: 700 } }, value ?? children),
		help ? uele.h('span', { style: { color: 'var(--uele-text-muted, #64748b)', fontSize: '0.8125rem' } }, help) : null);

/** empty-state block */
const Empty = ({ title, description, children, ...props } = {}) =>
	uele.h('div', {
		'data-uele-empty': '', ...props,
		style: { textAlign: 'center', padding: '2rem 1rem', color: 'var(--uele-text-muted, #64748b)', ...props.style }
	},
		title ? uele.h('strong', null, title) : null,
		description ? uele.h('p', null, description) : null,
		children);

/* ------------------------------------------------------------------- table */

const Table = ({ children, ...props } = {}) =>
	uele.h('table', { ...props, style: { borderCollapse: 'collapse', width: '100%', ...props.style } }, children);
const TableHead = ({ children, ...props } = {}) => uele.h('thead', props, children);
const TableBody = ({ children, ...props } = {}) => uele.h('tbody', props, children);
const TableRow = ({ children, ...props } = {}) => uele.h('tr', props, children);
const TableHeader = ({ children, ...props } = {}) =>
	uele.h('th', { ...props, scope: props.scope || 'col', style: { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid var(--uele-border, #e2e8f0)', ...props.style } }, children);
const TableCell = ({ children, ...props } = {}) =>
	uele.h('td', { ...props, style: { padding: '0.5rem', borderBottom: '1px solid var(--uele-border, #e2e8f0)', ...props.style } }, children);
/** aliases in the `<thead>`/`<th>` naming style */
const Thead = TableHead;
const Tbody = TableBody;
const Th = TableHeader;
const Td = TableCell;

/* --------------------------------------------------------------- navigation */

const BreadcrumbItem = ({ children, ...props } = {}) =>
	uele.h('li', { ...props, style: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', ...props.style } }, children);
const BreadcrumbLink = ({ href, current, children, ...props } = {}) =>
	uele.h('a', { ...props, href, ...(current ? { 'aria-current': 'page' } : {}) }, children);
const BreadcrumbSeparator = ({ children, ...props } = {}) =>
	uele.h('span', { 'aria-hidden': 'true', ...props }, children ?? '/');

/** `<Breadcrumb items={[{label, href}, …]} />` — the last item is the current page */
const Breadcrumb = ({ items, separator = '/', children, ...props } = {}) => {
	const list = val(items) || [];
	const kids = hasKids(children) ? children : list.map((item, i) => {
		const last = i === list.length - 1;
		return BreadcrumbItem({
			children: [
				last || !item.href
					? uele.h('span', last ? { 'aria-current': 'page' } : null, item.label)
					: BreadcrumbLink({ href: item.href, children: item.label }),
				last ? null : BreadcrumbSeparator({ children: separator })
			]
		});
	});
	return uele.h('nav', { 'aria-label': 'Breadcrumb', ...props }, uele.h('ol', { style: { display: 'flex', gap: '0.375rem', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' } }, kids));
};

/**
 * Pagination bar: `page`/`model` cell (or `defaultPage`), either `totalPages`
 * or `total` + `pageSize`, `siblingCount` around the current page, `onChange`.
 */
const Pagination = ({ page, model: modelProp, defaultPage = 1, totalPages, total, pageSize = 10, siblingCount = 1, onChange, ...props } = {}) => {
	const [current, setCurrent] = controllable(modelProp ?? page, defaultPage, onChange);
	const pages = () => {
		if (totalPages !== undefined) return Math.max(1, Number(val(totalPages)) || 1);
		return Math.max(1, Math.ceil((Number(val(total)) || 0) / (Number(val(pageSize)) || 1)));
	};
	const go = (p) => setCurrent(Math.min(pages(), Math.max(1, p)));
	const btn = (labelText, onClick, opts = {}) => uele.h('button', {
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
	const items = () => hooks.paginationRange(current(), pages(), siblingCount).map((item) =>
		item === '…'
			? uele.h('span', { 'aria-hidden': 'true', 'data-ellipsis': '' }, '…')
			: btn(String(item), () => go(item), { page: item, current: current() === item })
	);
	return uele.h('nav', { 'aria-label': 'Pagination', ...props },
		uele.h('div', { style: { display: 'inline-flex', gap: '0.25rem', alignItems: 'center' } },
			btn('Previous', () => go(current() - 1), { ariaLabel: 'Go to previous page', disabled: () => current() <= 1 }),
			() => items(),
			btn('Next', () => go(current() + 1), { ariaLabel: 'Go to next page', disabled: () => current() >= pages() })
		));
};

/* --------------------------------------------------------------------- tabs */

const TabList = ({ children, ...props } = {}) =>
	uele.h('div', { role: 'tablist', ...props, style: { display: 'flex', gap: '0.25rem', ...props.style } }, children);

const Tab = ({ value, selected, model: modelProp, active, onSelect, children, ...props } = {}) => {
	const source = modelProp ?? selected;
	const isActive = () => (active !== undefined ? !!val(active) : val(source) === value);
	return uele.h('button', {
		type: 'button', role: 'tab', ...props,
		'aria-selected': () => String(isActive()),
		'data-state': () => (isActive() ? 'active' : 'inactive'),
		'data-value': value,
		onclick: (e) => {
			if (reactive.isCell(source)) reactive.write(source, value);
			onSelect?.(value, e);
		}
	}, children);
};

const TabPanel = ({ value, selected, model: modelProp, active, children, ...props } = {}) => {
	const source = modelProp ?? selected;
	const isActive = () => (active !== undefined ? !!val(active) : val(source) === value);
	return uele.h('div', {
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
const Tabs = ({ model: cell, value, defaultValue, items, onChange, children, ...props } = {}) => {
	if (!hasKids(children) && items) {
		const list = val(items) || [];
		const [current, setCurrent] = controllable(cell ?? value, defaultValue ?? list[0]?.value, onChange);
		return uele.h('div', { 'data-uele-tabs': '', ...props },
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
				return active ? uele.h('div', { role: 'tabpanel', 'data-value': active.value }, active.content) : '';
			});
	}
	return uele.h('div', { 'data-uele-tabs': '', ...props }, children);
};

/* --------------------------------------------------------------- disclosure */

const AccordionItem = ({ value, title, header, open, onToggle, children, ...props } = {}) => {
	const headerId = nextId('uele-accordion-header');
	const panelId = nextId('uele-accordion-panel');
	const expanded = () => !!val(open);
	return uele.h('div', { 'data-value': value, 'data-state': () => (expanded() ? 'open' : 'closed'), ...props },
		uele.h('h3', { style: { margin: 0 } }, uele.h('button', {
			type: 'button', id: headerId,
			'aria-expanded': () => String(expanded()), 'aria-controls': panelId,
			style: { width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: '0.75rem 0.5rem' },
			onclick: () => onToggle?.(value)
		}, header ?? title)),
		uele.h('div', { id: panelId, role: 'region', 'aria-labelledby': headerId, hidden: () => !expanded() }, children));
};

/**
 * Accordion over `items={[{value,title,content,disabled}]}`.
 * `type="single"` (default, `collapsible` controls re-click) or `"multiple"` (array model).
 */
const Accordion = ({ items, type = 'single', model: cell, value, defaultValue, collapsible = true, onChange, children, ...props } = {}) => {
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
		return uele.h('div', { 'data-uele-accordion': '', ...props },
			list.map((item) => AccordionItem({
				value: item.value, title: item.title, open: () => isOpen(item.value),
				onToggle: () => !item.disabled && toggle(item.value),
				children: item.content
			})));
	}
	return uele.h('div', { 'data-uele-accordion': '', ...props }, children);
};

/** single collapsible region: trigger button + toggleable content */
const Collapsible = ({ open, model: modelProp, defaultOpen = false, trigger, label, onChange, children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onChange);
	return uele.h('div', { 'data-state': () => (isOpen() ? 'open' : 'closed'), ...props },
		uele.h('button', {
			type: 'button', 'aria-expanded': () => String(!!isOpen()),
			onclick: () => setOpen(!isOpen())
		}, trigger ?? label ?? 'Toggle'),
		uele.h('div', { hidden: () => !isOpen() }, children));
};

/* ------------------------------------------------------------------ overlay */

/**
 * Modal dialog. Controlled via `model`/`open` cell or uncontrolled via
 * `defaultOpen`; `trigger` (text or node) renders the opener, `title` /
 * `description` label the panel, Escape and overlay-click close it.
 */
const Dialog = ({ open, model: modelProp, defaultOpen = false, onOpenChange, onChange, title, description, trigger, closeLabel = 'Close', children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onOpenChange || onChange);
	const titleId = nextId('uele-dialog-title');
	const descId = nextId('uele-dialog-desc');
	const close = () => setOpen(false);
	const panel = () => {
		if (!isOpen()) return '';
		return [
			uele.h('div', {
				'data-uele-overlay': '', onclick: close,
				style: { position: 'fixed', inset: 0, background: 'var(--uele-overlay, rgba(15,23,42,0.5))' }
			}),
			uele.h('div', {
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
				title ? uele.h('h2', { id: titleId, style: { marginTop: 0 } }, title) : null,
				description ? uele.h('p', { id: descId }, description) : null,
				children,
				uele.h('button', { type: 'button', 'aria-label': closeLabel, onclick: close, style: { position: 'absolute', top: '0.5rem', right: '0.5rem', cursor: 'pointer' } }, '×'))
		];
	};
	return uele.h('div', { style: { display: 'contents' }, onkeydown: (e) => e.key === 'Escape' && isOpen() && close() },
		trigger != null
			? uele.h('button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': () => String(!!isOpen()), onclick: () => setOpen(true) }, trigger)
			: null,
		() => panel());
};

/** dialog that slides from an edge (`side`: right/left/top/bottom) */
const Drawer = ({ side = 'right', ...props } = {}) =>
	Dialog({ ...props, 'data-side': side });

/** popover panel anchored to a trigger button; toggles, Escape closes */
const Popover = ({ trigger, label, open, model: modelProp, defaultOpen = false, onOpenChange, children, ...props } = {}) => {
	const [isOpen, setOpen] = controllable(modelProp ?? open, defaultOpen, onOpenChange);
	return uele.h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onkeydown: (e) => e.key === 'Escape' && setOpen(false)
	},
		uele.h('button', {
			type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': () => String(!!isOpen()),
			onclick: () => setOpen(!isOpen())
		}, trigger ?? label ?? 'Open'),
		() => (isOpen()
			? uele.h('div', {
					role: 'dialog', ...props,
					style: { position: 'absolute', zIndex: 10, background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem', ...props.style }
				}, children)
			: ''));
};

/** hover/focus tooltip: wrap the trigger in `children`, text in `label`/`text` */
const Tooltip = ({ label, text, children, ...props } = {}) => {
	const visible = own(false);
	const show = () => reactive.write(visible, true);
	const hide = () => reactive.write(visible, false);
	const id = nextId('uele-tooltip');
	return uele.h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onmouseenter: show, onmouseleave: hide, onfocus: show, onblur: hide,
		'aria-describedby': id
	},
		children,
		uele.h('span', {
			role: 'tooltip', id, ...props, hidden: () => !reactive.read(visible),
			style: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'var(--uele-text, #0f172a)', color: 'var(--uele-bg, #fff)', padding: '0.25rem 0.5rem', borderRadius: 'var(--uele-radius-sm, 6px)', fontSize: '0.8125rem', zIndex: 20, ...props.style }
		}, label ?? text));
};

const MenuItem = ({ onSelect, disabled, children, ...props } = {}) =>
	uele.h('button', {
		type: 'button', role: 'menuitem', disabled, ...props,
		style: { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.375rem 0.5rem', ...props.style },
		onclick: (e) => onSelect?.(e)
	}, children);

/** dropdown menu over `items={[{label, onSelect, disabled}]}` (or `<MenuItem>` children) */
const Menu = ({ label, trigger, items, onSelect, children, ...props } = {}) => {
	const open = own(false);
	const close = () => reactive.write(open, false);
	const choose = (item) => (item.onSelect?.(item), onSelect?.(item), close());
	return uele.h('span', {
		style: { position: 'relative', display: 'inline-block' },
		onkeydown: (e) => e.key === 'Escape' && close()
	},
		uele.h('button', {
			type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': () => String(!!reactive.read(open)),
			onclick: () => reactive.write(open, !reactive.read(open))
		}, trigger ?? label ?? 'Menu'),
		() => (reactive.read(open)
			? uele.h('div', {
					role: 'menu', ...props,
					style: { position: 'absolute', zIndex: 10, minWidth: '10rem', background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.25rem', ...props.style }
				}, hasKids(children) ? children : (items || []).map((item) => MenuItem({
					disabled: item.disabled,
					onSelect: () => choose(item),
					children: item.label
				})))
			: ''));
};
/** alias */
const DropdownMenu = Menu;

/**
 * A single toast. `open`/`model` controls visibility; with `duration` it
 * auto-dismisses while open. `onClose` fires on dismiss (button, timeout).
 */
const Toast = ({ open, model: modelProp, title, description, duration = 5000, onClose, onOpenChange, action, children, ...props } = {}) => {
	const source = modelProp ?? open;
	const [isOpen, setOpen] = controllable(source, true, onOpenChange);
	let timer = null;
	const arm = () => {
		clearTimeout(timer);
		if (duration > 0 && isOpen()) timer = setTimeout(dismiss, duration);
	};
	const dismiss = () => (clearTimeout(timer), setOpen(false), onClose?.());
	if (uele.is(source)) uele.sub(source, () => arm(), () => {});
	arm();
	return uele.h('div', { style: { display: 'contents' } }, () =>
		isOpen()
			? uele.h('div', {
					role: 'status', 'data-uele-toast': '', ...props,
					style: { background: 'var(--uele-surface, #fff)', border: '1px solid var(--uele-border, #e2e8f0)', borderRadius: 'var(--uele-radius, 10px)', boxShadow: 'var(--uele-shadow-md, 0 4px 16px rgba(0,0,0,0.12))', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'start', ...props.style }
				},
					uele.h('div', null,
						title ? uele.h('strong', null, title) : null,
						description ? uele.h('div', null, description) : null,
						children),
					action || null,
					uele.h('button', { type: 'button', 'aria-label': 'Dismiss', onclick: dismiss }, '×'))
			: '');
};

/** renders a stack from a toasts array (cell or plain): `[{id,title,description,duration}]` */
const Toaster = ({ toasts, children, ...props } = {}) =>
	uele.h('div', {
		'aria-live': 'polite', 'data-uele-toaster': '', ...props,
		style: { position: 'fixed', bottom: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 50, ...props.style }
	}, () => (val(toasts) || []).map((toast) => Toast({
		...toast,
		open: true,
		onClose: () => {
			toast.onClose?.();
			if (reactive.isCell(toasts)) reactive.write(toasts, val(toasts).filter((t) => t !== toast && t.id !== toast.id));
		}
	})));

/* -------------------------------------------------------------------- steps */

/** steps indicator: `steps={[{label,description}]}` (or a count), `current`/`model` index */
const Stepper = ({ steps, current, model: modelProp, onChange, children, ...props } = {}) => {
	const list = typeof steps === 'number' ? Array.from({ length: steps }, (_, i) => ({ label: `Step ${i + 1}` })) : (val(steps) || []);
	const [active, setActive] = controllable(modelProp ?? current, 0, onChange);
	const stateOf = (i) => (i < active() ? 'complete' : i === active() ? 'current' : 'upcoming');
	return uele.h('ol', { 'data-uele-stepper': '', ...props, style: { display: 'flex', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0, ...props.style } },
		hasKids(children) ? children : list.map((step, i) =>
			uele.h('li', { 'data-state': () => stateOf(i), 'aria-current': () => (active() === i ? 'step' : undefined), style: { display: 'flex', alignItems: 'center', gap: '0.375rem' } },
				uele.h('button', {
					type: 'button', disabled: !onChange && !modelProp && !current,
					'aria-label': step.label,
					style: { borderRadius: '50%', width: '1.75rem', height: '1.75rem', cursor: onChange ? 'pointer' : 'default' },
					onclick: () => (onChange || modelProp || current) && setActive(i)
				}, () => (stateOf(i) === 'complete' ? '✓' : String(i + 1))),
				uele.h('span', null, step.label))));
};

/** slide carousel over `items` with prev/next + dots, index via `model`/`defaultIndex` */
const Carousel = ({ items, renderItem, model: modelProp, index, defaultIndex = 0, onChange, children, ...props } = {}) => {
	const list = () => val(items) || [];
	const [active, setActive] = controllable(modelProp ?? index, defaultIndex, onChange);
	const go = (i) => setActive(((i % Math.max(1, list().length)) + Math.max(1, list().length)) % Math.max(1, list().length));
	return uele.h('div', { 'data-uele-carousel': '', ...props, style: { position: 'relative', ...props.style } },
		uele.h('div', { 'data-uele-carousel-track': '' }, () => {
			const item = list()[active()];
			if (item === undefined) return hasKids(children) ? children : '';
			return renderItem ? renderItem(item, active()) : item;
		}),
		uele.h('button', { type: 'button', 'aria-label': 'Previous slide', onclick: () => go(active() - 1) }, '‹'),
		uele.h('button', { type: 'button', 'aria-label': 'Next slide', onclick: () => go(active() + 1) }, '›'),
		uele.h('div', { style: { display: 'flex', gap: '0.25rem', justifyContent: 'center' } },
			() => list().map((_, i) => uele.h('button', {
				type: 'button', 'aria-label': `Go to slide ${i + 1}`,
				'aria-current': () => String(active() === i),
				onclick: () => go(i)
			}, () => (active() === i ? '●' : '○')))));
};

Object.defineProperty(exports, "paginationRange", {
	enumerable: true,
	get: function () { return hooks.paginationRange; }
});
exports.Accordion = Accordion;
exports.AccordionItem = AccordionItem;
exports.Alert = Alert;
exports.AspectRatio = AspectRatio;
exports.Avatar = Avatar;
exports.Badge = Badge;
exports.Blockquote = Blockquote;
exports.Breadcrumb = Breadcrumb;
exports.BreadcrumbItem = BreadcrumbItem;
exports.BreadcrumbLink = BreadcrumbLink;
exports.BreadcrumbSeparator = BreadcrumbSeparator;
exports.Button = Button;
exports.Card = Card;
exports.Carousel = Carousel;
exports.Center = Center;
exports.Checkbox = Checkbox;
exports.Code = Code;
exports.Collapsible = Collapsible;
exports.Combobox = Combobox;
exports.Container = Container;
exports.Dialog = Dialog;
exports.Divider = Divider;
exports.Drawer = Drawer;
exports.DropdownMenu = DropdownMenu;
exports.Dropzone = Dropzone;
exports.Empty = Empty;
exports.Field = Field;
exports.FieldError = FieldError;
exports.FieldHint = FieldHint;
exports.FileInput = FileInput;
exports.Form = Form;
exports.Grid = Grid;
exports.Heading = Heading;
exports.Input = Input;
exports.Kbd = Kbd;
exports.Label = Label;
exports.Link = Link;
exports.List = List;
exports.ListItem = ListItem;
exports.Menu = Menu;
exports.MenuItem = MenuItem;
exports.NumberInput = NumberInput;
exports.OTP = OTP;
exports.OTPInput = OTPInput;
exports.Option = Option;
exports.Pagination = Pagination;
exports.PinInput = PinInput;
exports.Popover = Popover;
exports.Progress = Progress;
exports.Radio = Radio;
exports.RadioGroup = RadioGroup;
exports.Rating = Rating;
exports.Row = Row;
exports.ScrollArea = ScrollArea;
exports.SearchInput = SearchInput;
exports.Select = Select;
exports.Separator = Separator;
exports.Skeleton = Skeleton;
exports.Slider = Slider;
exports.Spacer = Spacer;
exports.Spinner = Spinner;
exports.Stack = Stack;
exports.Stat = Stat;
exports.Stepper = Stepper;
exports.Switch = Switch;
exports.Tab = Tab;
exports.TabList = TabList;
exports.TabPanel = TabPanel;
exports.Table = Table;
exports.TableBody = TableBody;
exports.TableCell = TableCell;
exports.TableHead = TableHead;
exports.TableHeader = TableHeader;
exports.TableRow = TableRow;
exports.Tabs = Tabs;
exports.TagInput = TagInput;
exports.Tbody = Tbody;
exports.Td = Td;
exports.Text = Text;
exports.Textarea = Textarea;
exports.Th = Th;
exports.Thead = Thead;
exports.Toast = Toast;
exports.Toaster = Toaster;
exports.Tooltip = Tooltip;
