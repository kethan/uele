/** @jsxImportSource uele */
/**
 * `uele/ui` used the way the docs show it — as JSX tags, with live props and
 * two-way `model` binding. (test/ui.test.js drives the same primitives through
 * `Card({ … })` calls; this one pins the jsx path, where a component receives
 * its children as an array.)
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { Form, Field, Button, Input, Textarea, Checkbox, Select, Card, Stack, Row, Label } from 'uele/ui';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
});

describe('primitives as jsx tags', () => {
	it('renders children from jsx (a single child arrives as [child])', () => {
		const card = <Card>hello</Card>;
		expect(card.textContent).toBe('hello');

		const nested = (
			<Card>
				<Stack>
					<Row>
						<Label>deep</Label>
					</Row>
				</Stack>
			</Card>
		);
		expect(nested.querySelector('label').textContent).toBe('deep');
	});

	it('Button defaults to type="button" and keeps its onclick', () => {
		let clicks = 0;
		const button = <Button onclick={() => clicks++}>Save</Button>;
		expect(button.type).toBe('button');
		expect(button.textContent).toBe('Save');
		button.click();
		expect(clicks).toBe(1);
	});

	it('Input binds two ways through model', () => {
		const name = signal('');
		const input = <Input model={name} aria-label="name" />;
		document.body.append(input);
		input.value = 'typed';
		input.dispatchEvent(new Event('input'));
		expect(name.value).toBe('typed');
		name.value = 'from the cell';
		expect(input.value).toBe('from the cell');
	});

	it('Textarea and Checkbox bind the same way', () => {
		const text = signal('a');
		const done = signal(false);
		const host = (
			<div>
				<Textarea model={text} />
				<Checkbox model={done} />
			</div>
		);
		document.body.append(host);
		const area = host.querySelector('textarea');
		const box = host.querySelector('input[type=checkbox]');
		expect(area.value).toBe('a');
		area.value = 'b';
		area.dispatchEvent(new Event('input'));
		expect(text.value).toBe('b');
		expect(box.checked).toBe(false);
		box.click();
		expect(done.value).toBe(true);
	});

	it('Checkbox shows a live `checked` cell and writes back on change', () => {
		const done = signal(false);
		const box = <Checkbox model={done} aria-label="done" />;
		document.body.append(box);
		done.value = true;
		expect(box.checked).toBe(true);
		box.click();
		expect(done.value).toBe(false);
	});

	it('Select renders its options (jsx children or the options prop)', () => {
		const choice = signal('a');
		const fromOptions = <Select model={choice} options={['a', { value: 'b', label: 'B' }]} />;
		expect(fromOptions.options.length).toBe(2);
		expect(fromOptions.value).toBe('a');

		const fromChildren = (
			<Select model={choice}>
				<option value="x">X</option>
				<option value="y">Y</option>
			</Select>
		);
		expect(fromChildren.options.length).toBe(2);
		fromChildren.value = 'y';
		fromChildren.dispatchEvent(new Event('change'));
		expect(choice.value).toBe('y');
	});

	it('Field labels its control', () => {
		const name = signal('');
		const field = (
			<Field label="Name">
				<Input model={name} />
			</Field>
		);
		expect(field.tagName).toBe('LABEL');
		expect(field.textContent).toContain('Name');
		expect(field.querySelector('input')).toBeTruthy();
	});

	it('Form prevents the default submit and calls onSubmit', () => {
		let submitted = 0;
		const form = (
			<Form onSubmit={() => submitted++}>
				<Button type="submit">Go</Button>
			</Form>
		);
		document.body.append(form);
		const event = new Event('submit', { bubbles: true, cancelable: true });
		form.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(submitted).toBe(1);
	});

	it('props stay live: a cell in any prop updates the element', () => {
		const disabled = signal(false);
		const label = signal('off');
		const button = <Button disabled={disabled}>{label}</Button>;
		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe('off');
		disabled.value = true;
		label.value = 'on';
		expect(button.disabled).toBe(true);
		expect(button.textContent).toBe('on');
	});

	it('a whole form works together', () => {
		const name = signal('');
		const done = signal(false);
		const app = (
			<Card>
				<Form onSubmit={() => {}}>
					<Field label="Name">
						<Input model={name} aria-label="name" />
					</Field>
					<Field label="Done">
						<Checkbox model={done} aria-label="done" />
					</Field>
					<Button type="submit">Save</Button>
				</Form>
			</Card>
		);
		document.body.append(app);
		app.querySelector('input[aria-label=name]').value = 'Ada';
		app.querySelector('input[aria-label=name]').dispatchEvent(new Event('input'));
		app.querySelector('input[aria-label=done]').click();
		expect(name.value).toBe('Ada');
		expect(done.value).toBe(true);
		expect(app.textContent).toContain('Name');
		expect(app.textContent).toContain('Done');
	});
});
