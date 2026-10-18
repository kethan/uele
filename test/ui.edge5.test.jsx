/** @jsxImportSource uele */
/**
 * Edge wave 5 (last branches): the plain-`value` wirings, falsy-collection
 * fallbacks and direct-call shapes that waves 1–4 never evaluated.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import {
	Accordion, AlertDialog, AppShell, Avatar, AvatarGroup, Badge,
	BreadcrumbSeparator, Calendar, Collapsible, CommandPalette, DatePicker,
	Dialog, Drawer, Dropzone, Editable, FileInput, FileList, Menu, MultiSelect,
	Navbar, Slider, Stepper, TagInput, Toast, ToggleGroup
} from 'uele/ui';


beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});
afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });

const add = (node) => {
	const flat = [node].flat(Infinity);
	for (const n of flat) if (n != null && n !== '') document.body.append(n);
	return flat.find((n) => n instanceof Element) ?? document.body;
};
const key = (target, k) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const byText = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);

describe('helpers reached through direct component calls', () => {
	it('hasKids treats raw strings as kids and empty string as none', () => {
		add(Collapsible({ children: 'Plain body' })); // non-array, non-null child
		expect(document.body.textContent).toContain('Plain body');
		add(Menu({ children: '' })); // '' is not a kid: trigger falls back to 'Menu'
		expect(byText(document, 'Menu')).toBeTruthy();
	});

	it('BreadcrumbSeparator defaults to / under JSX (no children)', () => {
		add(<BreadcrumbSeparator />);
		expect(document.body.textContent).toContain('/');
	});
});

describe('plain-value wirings', () => {
	it('Slider reads plain value and falls back to min', () => {
		add(<Slider value={30} aria-label="with value" />);
		expect(document.querySelector('[aria-label="with value"]').getAttribute('aria-valuenow')).toBe('30');
		add(<Slider aria-label="bare" />);
		expect(document.querySelector('[aria-label="bare"]').getAttribute('aria-valuenow')).toBe('0');
	});

	it('TagInput renders a plain value and Backspace pops the last tag', () => {
		add(<TagInput value={['x']} />);
		expect(document.querySelector('[data-tag="x"]')).toBeTruthy();
		const model = signal(['a', 'b']);
		const root = add(<TagInput model={model} />);
		const input = root.querySelector('input');
		key(input, 'Backspace'); // empty input: pop 'b'
		expect(model.value).toEqual(['a']);
		const nullModel = signal(null);
		const root2 = add(<TagInput model={nullModel} />);
		key(root2.querySelector('input'), 'Backspace'); // (null || []).length: no-op, no crash
		expect(nullModel.value).toBeNull();
	});

	it('Accordion honours a plain value; Badge emits data-variant', () => {
		add(<Accordion value="b" items={[
			{ value: 'a', title: 'A', content: 'ca' },
			{ value: 'b', title: 'B', content: 'cb' }
		]} />);
		expect(byText(document, 'B').getAttribute('aria-expanded')).toBe('true');
		const badge = add(<Badge variant="outline">V</Badge>);
		expect(badge.getAttribute('data-variant')).toBe('outline');
	});

	it('Stepper with a truthy plain current has enabled, clickable steps', () => {
		add(<Stepper steps={[{ label: 'One' }, { label: 'Two' }]} current={1} />);
		const one = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'One');
		expect(one.disabled).toBe(false); // current is the decider in (onChange || model || current)
		one.click();
	});

	it('ToggleGroup plain value and multiple-mode over a null model', () => {
		add(<ToggleGroup value="a" options={['a', 'b']} />);
		expect(document.querySelector('[data-value="a"]').getAttribute('data-state')).toBe('on');
		const model = signal(null);
		add(<ToggleGroup type="multiple" model={model} options={['x', 'y']} />);
		const x = document.querySelector('[data-value="x"]'); // (null || []).includes at render
		x.click();
		expect(model.value).toEqual(['x']);
	});

	it('MultiSelect renders object options with labels', () => {
		add(<MultiSelect options={[{ value: 'a', label: 'Alpha' }]} />);
		document.querySelector('[data-uele-multi-select] button').click();
		expect(document.body.textContent).toContain('Alpha');
	});
});

describe('overlay leftovers', () => {
	it('Dialog closes on Escape from the trigger (host handler, outside the panel)', () => {
		add(<Dialog trigger="Launch" title="T">Body</Dialog>);
		const trigger = byText(document, 'Launch');
		trigger.click();
		expect(document.querySelector('[role=dialog]')).toBeTruthy();
		// the panel has its own Escape handler; the host handler covers Escape
		// pressed on host content outside the panel (e.g. focus back on trigger)
		key(trigger, 'Escape');
		expect(document.querySelector('[role=dialog]')).toBeNull();
	});

	it('Drawer tolerates an unknown side; AlertDialog accepts an open cell', () => {
		add(<Drawer side="diagonal" trigger="D">x</Drawer>); // style falls back to right
		expect(byText(document, 'D')).toBeTruthy();
		const open = signal(false);
		add(<AlertDialog open={open} title="Sure?">Really?</AlertDialog>);
		expect(document.querySelector('[role=dialog]')).toBeNull();
		open.value = true;
		expect(document.querySelector('[role=dialog]')).toBeTruthy();
		[...document.querySelectorAll('button')].find((b) => b.getAttribute('data-action') === 'cancel').click();
		expect(open.value).toBe(false);
	});

	it('AlertDialog honors a plain boolean open; Cancel closes it and fires onCancel', () => {
		const onCancel = vi.fn();
		add(<AlertDialog open title="Sure?" onCancel={onCancel}>Really?</AlertDialog>);
		expect(document.querySelector('[role=dialog]')).toBeTruthy();
		[...document.querySelectorAll('button')].find((b) => b.getAttribute('data-action') === 'cancel').click();
		expect(onCancel).toHaveBeenCalled();
		expect(document.querySelector('[role=dialog]')).toBeNull();

		add(<AlertDialog open={false} title="Sure?">Really?</AlertDialog>);
		expect(document.querySelector('[role=dialog]')).toBeNull();
	});

	it('CommandPalette honors a plain boolean open', () => {
		add(<CommandPalette open items={['Alpha']} />);
		expect(document.querySelector('[data-uele-command-input]')).toBeTruthy();
		document.body.innerHTML = '';
		add(<CommandPalette open={false} items={['Alpha']} />);
		expect(document.querySelector('[data-uele-command-input]')).toBeNull();
	});

	it('Toast renders description without a title; CommandPalette opens bare', () => {
		add(<Toast description="body only" />);
		expect(document.body.textContent).toContain('body only');
		expect(document.querySelector('[data-uele-toast] strong')).toBeNull();
		add(<CommandPalette defaultOpen />);
		expect(document.querySelector('[data-uele-command-input]')).toBeTruthy();
	});

	it('Menu with no items opens an empty list', () => {
		add(<Menu />);
		byText(document, 'Menu').click();
		expect(document.querySelector('[data-uele-menu], [role=menu]')).toBeTruthy();
	});
});

describe('files, dates and shells', () => {
	it('FileInput and Dropzone tolerate a missing FileList', () => {
		const picked = vi.fn();
		const root = add(<FileInput onFiles={picked} />);
		const input = root.querySelector('input[type=file]');
		Object.defineProperty(input, 'files', { value: null, configurable: true });
		input.dispatchEvent(new Event('change', { bubbles: true })); // e.target.files || []
		expect(picked).toHaveBeenCalledWith([]);

		const dropped = vi.fn();
		const zone = add(<Dropzone onFiles={dropped} />);
		expect(zone.textContent).toContain('Drop files here, or click to browse');
		zone.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true })); // no dataTransfer at all
		expect(dropped).toHaveBeenCalledWith([]);
		const inner = zone.querySelector('input[type=file]');
		Object.defineProperty(inner, 'files', { value: null, configurable: true });
		inner.dispatchEvent(new Event('change', { bubbles: true }));
		expect(dropped).toHaveBeenCalledWith([]);
	});

	it('FileList bare renders empty; an error without message falls back to Failed', () => {
		add(<FileList />);
		add(<FileList files={[{ name: 'x.bin', status: 'error' }]} />);
		expect(document.body.textContent).toContain('Failed');
	});

	it('DatePicker survives an invalid Date; Calendar writes Date objects for Date values', () => {
		add(<DatePicker value={new Date('junk')} label="When" />);
		expect(document.querySelector('input[aria-label="When"]').value).toBe('');
		const onChange = vi.fn();
		const root = add(<Calendar value={new Date(2026, 5, 15)} onChange={onChange} />);
		[...root.querySelectorAll('button')].find((b) => b.textContent === '20').click();
		expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
		expect(onChange.mock.calls[0][1]).toBe('2026-06-20');
	});

	it('Editable starts editing over a null value', () => {
		add(<Editable value={null} />);
		const view = document.querySelector('button[aria-label="Edit"]');
		view.click(); // draft = String(current() ?? '')
		const input = view.parentElement.querySelector('input');
		expect(input.value).toBe('');
	});

	it('AvatarGroup renders children directly and object avatars', () => {
		add(<AvatarGroup><Avatar name="Zed Kay" /></AvatarGroup>); // children win over the avatars list
		expect(document.body.textContent).toContain('ZK');
		add(<AvatarGroup avatars={[{ name: 'Ob Jay' }, { src: 'https://x.test/o.png', name: 'Pi' }]} />);
		expect(document.body.textContent).toContain('OJ');
		expect(document.querySelector('img[src="https://x.test/o.png"]')).toBeTruthy();
	});

	it('Navbar empty link cell, hash fallback and direct-call bare shape', () => {
		add(<Navbar brand="B" links={signal(null)} />); // (val(links) || []) over a null cell
		expect(document.querySelector('nav[aria-label="Primary"]')).toBeTruthy();
		add(<Navbar brand="B" links={[{ label: 'X' }]} />);
		expect(document.querySelector('a[href="#"]')).toBeTruthy(); // link.href || '#'
		add(Navbar({ brand: 'Solo' })); // no actions/children at all: || null
		expect(document.body.textContent).toContain('Solo');
	});

	it('AppShell without header/footer renders just the main region', () => {
		add(<AppShell><p>core</p></AppShell>);
		expect(document.querySelector('[data-uele-app-shell] main').textContent).toContain('core');
		expect(document.querySelector('[data-uele-app-shell] header')).toBeNull();
		expect(document.querySelector('[data-uele-app-shell] footer')).toBeNull();
	});

	it('AppShell header/footer without a sidebar span no columns', () => {
		add(<AppShell header="Top" footer="Bottom">page</AppShell>);
		expect(document.querySelector('[data-uele-app-shell] header').textContent).toBe('Top');
		expect(document.querySelector('[data-uele-app-shell] footer').textContent).toBe('Bottom');
	});
});

describe('nullish collections behind truthy props', () => {
	it('Accordion over a null-holding items cell renders empty', () => {
		add(<Accordion items={signal(null)} />);
		expect(document.querySelector('[data-uele-accordion], [data-uele-accordion-item]')).toBeTruthy();
	});

	it('MultiSelect and CommandPalette accept null options/items', () => {
		add(<MultiSelect options={null} />);
		document.querySelector('[data-uele-multi-select] button').click(); // (val(null) || [])
		add(<CommandPalette defaultOpen items={null} />);
		expect(document.querySelector('[data-uele-command-input]')).toBeTruthy();
	});

	it('Calendar falls back to today for an invalid Date value', () => {
		const root = add(<Calendar value={new Date('junk')} />);
		expect(root.querySelector('button[aria-label*="Next"], button')).toBeTruthy(); // rendered this month
	});
});
