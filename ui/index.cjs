'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');

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

/** `value`/`checked` display live (h's job); this wires the write-back */
const model = (el, cell, event, key) => {
	if (!cell) return;
	el.addEventListener(event, () => reactive.write(cell, key ? el[key] : el.value));
};

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

const Button = ({ children, ...props } = {}) =>
	uele.h('button', { type: 'button', ...props }, children);

const Input = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = uele.h('input', { type: 'text', ...props, value: value ?? (uele.is(cell) ? cell : null), onInput });
	model(el, cell ?? (onInput === undefined && uele.is(value) ? value : null), 'input'); // model (or a writable value) = two-way
	return el;
};

const Textarea = ({ model: cell, onInput, value, children, ...props } = {}) => {
	const el = uele.h('textarea', { ...props, value: value ?? (uele.is(cell) ? cell : null), onInput });
	model(el, cell ?? (onInput === undefined && uele.is(value) ? value : null), 'input');
	return el;
};

const Checkbox = ({ model: cell, onChange, checked, children, ...props } = {}) => {
	const el = uele.h('input', { type: 'checkbox', ...props, checked: checked ?? (uele.is(cell) ? cell : null), onChange });
	model(el, cell ?? (onChange === undefined && uele.is(checked) ? checked : null), 'change', 'checked');
	return el;
};

const Option = ({ children, ...props } = {}) => uele.h('option', props, children);

const Select = ({ model: cell, onChange, value, options, children, ...props } = {}) => {
	// jsx hands an empty `[]` over when there are no children, so fall back on `options`
	const kids = Array.isArray(children) ? (children.length ? children : null) : children ?? null;
	const el = uele.h('select', { ...props, value: value ?? (uele.is(cell) ? cell : null), onChange }, kids ?? (options || []).map((o) =>
		typeof o === 'object' ? uele.h('option', { value: o.value }, o.label) : uele.h('option', { value: o }, o)
	));
	model(el, cell ?? (onChange === undefined && uele.is(value) ? value : null), 'change');
	return el;
};

const Card = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', ...props.style } }, children);

const Stack = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', ...props.style } }, children);

const Row = ({ children, ...props } = {}) =>
	uele.h('div', { ...props, style: { display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', ...props.style } }, children);

exports.Button = Button;
exports.Card = Card;
exports.Checkbox = Checkbox;
exports.Field = Field;
exports.Form = Form;
exports.Input = Input;
exports.Label = Label;
exports.Option = Option;
exports.Row = Row;
exports.Select = Select;
exports.Stack = Stack;
exports.Textarea = Textarea;
