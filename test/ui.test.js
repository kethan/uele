import { describe, it, expect, beforeEach } from 'vitest';
import { h, get } from 'uele';
import { useUlive } from 'uele/adapters/ulive';
import { signal } from 'ulive';
const g = signal;
const s = (c, v) => (c.value = v);
import { Form, Field, Label, Button, Input, Textarea, Checkbox, Option, Select, Card, Stack, Row } from 'uele/ui';

beforeEach(() => { document.body.innerHTML = ''; });

const text = (el) => el.textContent.trim();

describe('ui primitives — structure & defaults', () => {
	it('Button defaults to type=button and forwards props and children', () => {
		const b = Button({ children: 'Go', id: 'x', onclick: () => {} });
		expect(b.tagName).toBe('BUTTON');
		expect(b.type).toBe('button');
		expect(b.id).toBe('x');
		expect(text(b)).toBe('Go');
		expect(Button({ type: 'submit', children: 'S' }).type).toBe('submit');
		expect(Button({ children: [h('i', null, 'a'), 'b'] }).innerHTML).toContain('<i>a</i>');
	});

	it('Input and Textarea default sensibly and forward props', () => {
		const i = Input({ placeholder: 'p' });
		expect(i.tagName).toBe('INPUT');
		expect(i.type).toBe('text');
		expect(i.placeholder).toBe('p');
		expect(Input({ type: 'email' }).type).toBe('email');
		expect(Textarea({ rows: 3 }).rows).toBe(3);
	});

	it('Form prevents default submit then calls onSubmit', () => {
		let seen = null;
		const form = Form({ onSubmit: (e) => (seen = e), children: Button({ children: 'go', type: 'submit' }) });
		document.body.append(form);
		const e = new Event('submit', { cancelable: true });
		form.dispatchEvent(e);
		expect(e.defaultPrevented).toBe(true);
		expect(seen).toBe(e);
		Form().dispatchEvent(new Event('submit', { cancelable: true }));
	});

	it('Field wraps a labeled control; Label forwards', () => {
		const f = Field({ label: 'Name', for: 'n', children: Input({ id: 'n' }) });
		expect(f.tagName).toBe('LABEL');
		expect(text(f)).toContain('Name');
		expect(f.querySelector('input')).toBeTruthy();
		expect(Label({ children: 'x' }).tagName).toBe('LABEL');
	});

	it('Select renders options (strings and objects) or children', () => {
		const s = Select({ options: ['a', { value: 'b', label: 'B' }] });
		expect(s.querySelectorAll('option').length).toBe(2);
		expect(s.options[0].value).toBe('a');
		expect(s.options[1].text).toBe('B');
		const s2 = Select({ children: Option({ value: 'z', children: 'Z' }) });
		expect(s2.querySelector('option').value).toBe('z');
		expect(Select().querySelectorAll('option').length).toBe(0);
	});

	it('Card, Stack, Row carry minimal default styles, mergeable with user style', () => {
		expect(Card({ children: 'x' }).style.padding).toBe('1rem');
		expect(Stack().style.display).toBe('flex');
		expect(Stack().style.flexDirection).toBe('column');
		expect(Row().style.flexDirection).toBe('row');
		expect(Card({ style: { padding: '9px' }, children: 'x' }).style.padding).toBe('9px');
	});
});

describe('ui primitives — live props and two-way model', () => {
	it('value/checked display live via signals', () => {
		useUlive();
		const v = g('hi');
		const input = Input({ value: v });
		expect(input.value).toBe('hi');
		s(v, 'bye');
		expect(input.value).toBe('bye');

		const on = g(false);
		const cb = Checkbox({ checked: on });
		expect(cb.checked).toBe(false);
		s(on, true);
		expect(cb.checked).toBe(true);

		const sv = g('a');
		const sel = Select({ value: sv, options: ['a', 'b'] });
		expect(sel.value).toBe('a');
		s(sv, 'b');
		expect(sel.value).toBe('b');

		const ta = Textarea({ value: v });
		s(v, 'ta!');
		expect(ta.value).toBe('ta!');
	});

	it('model writes back on input/change for every cell shape', () => {
		useUlive();
		const c1 = g('x');
		const i1 = Input({ model: c1 });
		i1.value = 'typed';
		i1.dispatchEvent(new Event('input'));
		expect(get(c1)).toBe('typed');
		const i2 = Input({ model: (v) => s(c1, 'fn:' + v) });
		i2.value = 'q';
		i2.dispatchEvent(new Event('input'));
		expect(get(c1)).toBe('fn:q');
		const c3 = { set: (v) => s(c1, 'set:' + v) };
		Input({ model: c3 }).dispatchEvent(new Event('input'));
		expect(get(c1)).toBe('set:');
		const c4 = { next: () => s(c1, 'next') };
		Input({ model: c4 }).dispatchEvent(new Event('input'));
		expect(get(c1)).toBe('next');
		const c5 = { setState: () => s(c1, 'state') };
		Input({ model: c5 }).dispatchEvent(new Event('input'));
		expect(get(c1)).toBe('state');
		Input({ model: null }).dispatchEvent(new Event('input'));
		Input({ model: 42 }).dispatchEvent(new Event('input'));
	});

	it('auto-model: a writable value cell becomes the model', () => {
		useUlive();
		const v = g('');
		const i = Input({ value: v });
		i.value = 'auto';
		i.dispatchEvent(new Event('input'));
		expect(get(v)).toBe('auto');
		s(v, 'shown');
		expect(i.value).toBe('shown');

		let calls = 0;
		const i2 = Input({ value: v, onInput: () => calls++ });
		i2.dispatchEvent(new Event('input'));
		expect(calls).toBe(1);
		expect(get(v)).toBe('shown'); // not rewritten by i2

		const i3 = Input({ value: 'lit' });
		i3.dispatchEvent(new Event('input'));
		expect(i3.value).toBe('lit');
	});

	it('Checkbox model writes checked on change', () => {
		useUlive();
		const on = g(false);
		const cb = Checkbox({ model: on });
		cb.checked = true;
		cb.dispatchEvent(new Event('change'));
		expect(get(on)).toBe(true);
		s(on, false);
		expect(cb.checked).toBe(false);

		const cb2 = Checkbox({ checked: on });
		cb2.checked = true;
		cb2.dispatchEvent(new Event('change'));
		expect(get(on)).toBe(true);
		expect(Checkbox({ model: null })).toBeTruthy();
	});

	it('Select model writes value on change', () => {
		useUlive();
		const v = g('a');
		const sel = Select({ model: v, options: ['a', 'b'] });
		sel.value = 'b';
		sel.dispatchEvent(new Event('change'));
		expect(get(v)).toBe('b');
		s(v, 'a');
		expect(sel.value).toBe('a');
		const sel2 = Select({ value: v, options: ['a', 'b'] });
		sel2.value = 'b';
		sel2.dispatchEvent(new Event('change'));
		expect(get(v)).toBe('b');
		expect(Select({ model: null })).toBeTruthy();
	});
});

describe('ui primitives — null-ish props are safe', () => {
	it('null/undefined style and class do not throw (core isObject fix)', () => {
		expect(() => h('div', { style: null })).not.toThrow();
		expect(() => h('div', { style: undefined })).not.toThrow();
		expect(() => h('div', { class: null })).not.toThrow();
		expect(() => h('div', { class: undefined })).not.toThrow();
		expect(Label({ children: 'x', style: null }).style.textDecoration).toBe('');
		expect(h('div', { class: { a: true } }).className).toBe('a');
	});
});
