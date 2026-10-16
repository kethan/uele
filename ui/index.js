/**
 * Dead-simple UI primitives for `uele`.
 *
 *     import { Button, Input, Field, Card } from "uele/ui";
 *
 * Every primitive is a thin `h()` wrapper with sensible defaults and works as
 * a JSX tag or a plain call. Every prop is LIVE: pass a signal anywhere a value
 * is expected (`disabled`, `value`, `class`, `style`) and it updates on change.
 * Form controls take `model` for two-way binding (a writable cell or a setter
 * function); pass the cell as `value` and it is used as the model automatically.
 * Zero dependencies, zero styles beyond the bare minimum.
 */
import { h, is } from 'uele';
import { write } from 'uele/reactive'; // one write path for every cell shape

/** `value`/`checked` display live (h's job); this wires the write-back */
const model = (el, cell, event, key) => {
	if (!cell) return;
	el.addEventListener(event, () => write(cell, key ? el[key] : el.value));
};

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

export const Button = ({ children, ...props } = {}) =>
	h('button', { type: 'button', ...props }, children);

export const Input = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = h('input', { type: 'text', ...props, value: value ?? (is(cell) ? cell : null), onInput });
	model(el, cell ?? (onInput === undefined && is(value) ? value : null), 'input'); // model (or a writable value) = two-way
	return el;
};

export const Textarea = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = h('textarea', { ...props, value: value ?? (is(cell) ? cell : null), onInput });
	model(el, cell ?? (onInput === undefined && is(value) ? value : null), 'input');
	return el;
};

export const Checkbox = ({ model: cell, onChange, checked, children, ...props } = {}) => {
	const el = h('input', { type: 'checkbox', ...props, checked: checked ?? (is(cell) ? cell : null), onChange });
	model(el, cell ?? (onChange === undefined && is(checked) ? checked : null), 'change', 'checked');
	return el;
};

export const Option = ({ children, ...props } = {}) => h('option', props, children);

export const Select = ({ model: cell, onChange, value, options, children, ...props } = {}) => {
	// jsx hands an empty `[]` over when there are no children, so fall back on `options`
	const kids = Array.isArray(children) ? (children.length ? children : null) : children ?? null;
	const el = h('select', { ...props, value: value ?? (is(cell) ? cell : null), onChange }, kids ?? (options || []).map((o) =>
		typeof o === 'object' ? h('option', { value: o.value }, o.label) : h('option', { value: o }, o)
	));
	model(el, cell ?? (onChange === undefined && is(value) ? value : null), 'change');
	return el;
};

export const Card = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', ...props.style } }, children);

export const Stack = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', ...props.style } }, children);

export const Row = ({ children, ...props } = {}) =>
	h('div', { ...props, style: { display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', ...props.style } }, children);
