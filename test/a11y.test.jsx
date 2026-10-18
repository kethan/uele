/** @jsxImportSource uele */
/**
 * Accessibility: axe-core over the shipped components, run in jsdom on
 * every `npm test` so a11y regressions fail locally — no browser needed.
 *
 * Scope note: jsdom has no layout or rendered colour, so `color-contrast`
 * is disabled here; the Playwright pass (`npm run test:browser`, CI) runs
 * the full wcag2a/wcag2aa tag set — contrast included — against the built
 * bundles in real Chromium. Everything else axe can judge from the DOM
 * (roles, names, labels, ARIA validity, focusability) is judged here.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import axe from 'axe-core';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { Accordion, Button, Checkbox, Dialog, Input, Label, Slider, Switch, Tabs, Textarea } from 'uele/ui';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});
afterEach(() => { document.body.innerHTML = ''; document.body.style.overflow = ''; });

const tick = () => new Promise((r) => setTimeout(r, 0));

/** axe with the jsdom-appropriate rule set; resolves to readable violation lines */
const violationsOf = async (root) => {
	const results = await axe.run(root, {
		runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
		rules: { 'color-contrast': { enabled: false } }, // needs rendered colour — browser pass covers it
	});
	return results.violations.map(
		(v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.html).join(' | ')}`,
	);
};

const mount = (node) => {
	const root = document.createElement('div');
	document.body.append(root);
	root.append(node);
	return root;
};

describe('axe: component gallery', () => {
	it('switch, accordion, tabs and button have no violations', async () => {
		const on = signal(false);
		const root = mount(
			<section>
				<Switch model={on} label="Notifications" />
				<Accordion items={[{ value: 'shipping', title: 'Shipping', content: 'Ships in 2 days.' }]} defaultValue="" />
				<Tabs
					items={[
						{ value: 'one', label: 'One', content: 'First panel' },
						{ value: 'two', label: 'Two', content: 'Second panel' },
					]}
				/>
				<Button>Save changes</Button>
			</section>,
		);
		await tick();
		expect(await violationsOf(root)).toEqual([]);
	});

	it('labelled form controls have no violations', async () => {
		const root = mount(
			<form>
				<Label>
					Email
					<Input type="email" name="email" />
				</Label>
				<Checkbox>Accept terms</Checkbox>
				<Slider aria-label="Volume" />
			</form>,
		);
		await tick();
		expect(await violationsOf(root)).toEqual([]);
	});

	it('an open dialog has no violations', async () => {
		const open = signal(true);
		mount(<Dialog open={open} trigger="Launch" title="Settings" description="Adjust your settings.">Body text</Dialog>);
		await tick();
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
		expect(await violationsOf(document.body)).toEqual([]);
	});
});

describe('labelling contract (regressions found by the axe suite)', () => {
	it('Checkbox wraps its input in a <label> from children or the label prop', () => {
		const fromChildren = mount(<Checkbox>Accept terms</Checkbox>);
		const labelEl = fromChildren.querySelector('label');
		expect(labelEl).not.toBeNull();
		expect(labelEl.querySelector('input[type="checkbox"]')).not.toBeNull();
		expect(labelEl.textContent).toContain('Accept terms');

		const fromProp = mount(<Checkbox label="Agree" />);
		expect(fromProp.querySelector('label')?.textContent).toContain('Agree');
		expect(fromProp.querySelector('label input[type="checkbox"]')).not.toBeNull();
	});

	it('Checkbox without label text stays a bare input', () => {
		const root = mount(<Checkbox aria-label="agree" />);
		expect(root.querySelector('label')).toBeNull();
		expect(root.querySelector('input[type="checkbox"]')).not.toBeNull();
	});

	it('Textarea uses string children as its initial value; explicit value wins', () => {
		mount(<Textarea>hello</Textarea>);
		expect(document.querySelector('textarea').value).toBe('hello');

		const direct = mount(Textarea({ children: 'direct' }));
		expect(direct.querySelector('textarea').value).toBe('direct');

		const root = mount(<Textarea value="preset">ignored</Textarea>);
		expect(root.querySelector('textarea').value).toBe('preset');

		const nonText = mount(<Textarea>{42}</Textarea>);
		expect(nonText.querySelector('textarea').value).toBe('');
	});
});
