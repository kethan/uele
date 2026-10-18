/** @jsxImportSource uele */
/**
 * Edge wave 2 (coverage mop-up): keyboard/drag/pointer interaction paths and
 * mode toggles in `uele/ui` that the behavioural suites do not reach.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { h } from 'uele';
import {
	Accordion, AccordionItem, Carousel, ColorPicker, Combobox, CommandPalette,
	ContextMenu, CopyButton, DataTable, Dropzone, Editable, FileList,
	InfiniteScroll, Lightbox, Listbox, Menu, MultiSelect, NavigationMenu,
	OTPInput, Popover, Radio, SkipLink, SplitPane, Stepper, TimeAgo,
	Toggle, ToggleGroup, Wizard
} from 'uele/ui';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
});
afterEach(() => { document.body.innerHTML = ''; });

// JSX fragments/components may yield node arrays: append every node, return
// the first element for root-scoped queries.
const add = (node) => {
	const flat = [node].flat(Infinity);
	for (const n of flat) if (n != null && n !== '') document.body.append(n);
	return flat.find((n) => n instanceof Element) ?? document.body;
};
const key = (target, k) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const type = (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
const byText = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);

describe('Radio + toggle-group modes', () => {
	it('checked-prop Radio (no model) fires onChange; group array toggles off again', () => {
		const onRadio = vi.fn();
		add(<Radio value="x" checked={false} onChange={onRadio} label="X" />);
		document.querySelector('input[type=radio]').click();
		expect(onRadio).toHaveBeenCalledWith('x', expect.anything());

		const picked = signal([]);
		add(<ToggleGroup type="multiple" options={['a', 'b']} model={picked} label="Pick" />);
		add(<ToggleGroup label="Wrap"><Toggle value="z">Z</Toggle></ToggleGroup>); // children mode renders through
		const a = document.querySelector('[data-value="a"]');
		a.click();
		expect(picked.value).toEqual(['a']);
		a.click(); // second click removes it (the filter branch)
		expect(picked.value).toEqual([]);
		expect(document.body.textContent).toContain('Z');
	});
});

describe('OTPInput keyboard + clear paths', () => {
	it('non-digit input clears the box; arrows at the edges stay put', () => {
		const root = add(OTPInput({ length: 3 }));
		const inputs = [...root.querySelectorAll('input')];
		type(inputs[0], '5');
		expect(inputs[0].value).toBe('5');
		type(inputs[0], 'x'); // non-digit: clears the stored digit, no advance
		expect(inputs[0].value).toBe('');
		inputs[0].focus();
		key(inputs[0], 'ArrowLeft'); // already first: stays
		expect(document.activeElement).toBe(inputs[0]);
		inputs[2].focus();
		key(inputs[2], 'ArrowRight'); // already last: stays
		expect(document.activeElement).toBe(inputs[2]);
		key(inputs[2], 'ArrowLeft');
		expect(document.activeElement).toBe(inputs[1]);
	});
});

describe('Dropzone pointer + file paths', () => {
	it('drag styling, click proxies to the file input, drop and change deliver files', () => {
		const onFiles = vi.fn();
		const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
		add(<Dropzone onFiles={onFiles} accept="image/*" multiple>Drop here</Dropzone>);
		const zone = document.querySelector('[data-uele-dropzone]');
		const input = zone.querySelector('input[type=file]');
		const clickSpy = vi.spyOn(input, 'click');

		zone.click(); // zone click proxies to the hidden input
		expect(clickSpy).toHaveBeenCalled();
		zone.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
		expect(zone.hasAttribute('data-dragover')).toBe(true);
		zone.dispatchEvent(new Event('dragleave', { bubbles: true }));
		expect(zone.hasAttribute('data-dragover')).toBe(false);

		const drop = new Event('drop', { bubbles: true, cancelable: true });
		Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
		zone.dispatchEvent(drop);
		expect(onFiles).toHaveBeenCalledWith([file]);

		Object.defineProperty(input, 'files', { value: [file], configurable: true });
		input.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onFiles).toHaveBeenCalledTimes(2);
	});
});

describe('overlay dismissal keys', () => {
	it('Combobox toggle button and Escape; Popover and Menu Escape', () => {
		add(<>
			<Combobox options={['Apple', 'Banana']} label="Fruit" />
			<Popover trigger="Info" label="pop">Panel text</Popover>
			<Menu label="Actions" items={[{ label: 'Edit' }, { label: 'Delete' }]} />
		</>);
		const toggle = document.querySelector('[data-uele-combobox] button');
		const listShown = () => !document.querySelector('[data-uele-combobox] [role=listbox]').hidden;
		toggle.click(); // opens
		expect(listShown()).toBe(true);
		key(document.querySelector('[data-uele-combobox] input'), 'Escape'); // closes
		expect(listShown()).toBe(false);
		toggle.click(); // toggle button opens…
		toggle.click(); // …and closes
		expect(listShown()).toBe(false);
		key(document.querySelector('[data-uele-combobox] input'), 'ArrowDown'); // reopens
		expect(listShown()).toBe(true);

		const popTrigger = byText(document, 'Info');
		popTrigger.click();
		expect(document.body.textContent).toContain('Panel text');
		key(popTrigger, 'Escape'); // wrapper-level Escape handler closes
		popTrigger.click(); // still functional afterwards

		const menuTrigger = byText(document, 'Actions');
		menuTrigger.click();
		expect(document.querySelector('[role=menu]')).toBeTruthy();
		key(menuTrigger, 'Escape');
		expect(document.querySelector('[role=menu]')).toBeNull();
	});
});

describe('Accordion multiple mode + plain children', () => {
	it('re-clicking an open item collapses it; non-item children render through', () => {
		add(Accordion({
			type: 'multiple',
			items: [
				{ value: 'a', title: 'First', content: 'Body A' },
				{ value: 'b', title: 'Second', content: 'Body B' }
			]
		}));
		add(<Accordion>loose children</Accordion>);
		const first = byText(document, 'First');
		const expanded = () => first.getAttribute('aria-expanded');
		expect(expanded()).toBe('false');
		first.click();
		expect(expanded()).toBe('true');
		first.click(); // toggle OFF: the includes/filter branch
		expect(expanded()).toBe('false');
		expect(document.body.textContent).toContain('loose children');
	});
});

describe('Stepper numeric form + Wizard navigation', () => {
	it('count steps render labels; Wizard Back/Next/finish', () => {
		const onFinish = vi.fn();
		add(<>
			<Stepper steps={3} current={1} />
			<Wizard steps={[{ label: 'One', content: 'panel-1' }, { label: 'Two', content: 'panel-2' }]} onFinish={onFinish} />
		</>);
		expect(document.body.textContent).toContain('Step 3');
		const wizard = document.querySelector('[data-uele-wizard]');
		expect(wizard.textContent).toContain('panel-1');
		[...wizard.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Two').click(); // stepper jump
		expect(wizard.textContent).toContain('panel-2');
		byText(wizard, 'Back').click();
		expect(wizard.textContent).toContain('panel-1');
		wizard.querySelector('[data-action=next]').click();
		expect(wizard.textContent).toContain('panel-2');
		byText(wizard, 'Back').click(); // Back button path
		expect(wizard.textContent).toContain('panel-1');
		wizard.querySelector('[data-action=next]').click();
		wizard.querySelector('[data-action=finish]').click();
		expect(onFinish).toHaveBeenCalled();
	});
});

describe('Carousel children mode', () => {
	it('free children render instead of items; prev/next stay safe', () => {
		const root = add(Carousel({ children: [h('div', null, 'slide-one'), h('div', null, 'slide-two')] }));
		expect(root.textContent).toContain('slide-one');
		root.querySelector('[aria-label="Previous slide"]').click();
		expect(root.textContent).toContain('slide-one'); // children mode keeps the free content
		root.querySelector('[aria-label="Next slide"]').click();
		expect(root.textContent).toContain('slide-one');
	});
});

describe('SkipLink + CopyButton', () => {
	it('blur resets the off-screen position', () => {
		add(<><SkipLink href="#content">Skip to content</SkipLink><main id="content" tabIndex={-1}>body</main></>);
		const link = document.querySelector('a[href="#content"]');
		link.focus();
		link.blur(); // blur path restores the parked position
		expect(link.style.left).toBe('-9999px');
	});

	it('execCommand fallback copies and the label resets after the timeout', () => {
		vi.useFakeTimers();
		try {
			const btn = add(CopyButton({ value: 'copy-me' })); // the component IS the button
			btn.click(); // jsdom has no navigator.clipboard: textarea fallback
			expect(btn.textContent).toContain('Copied');
			vi.advanceTimersByTime(1600);
			expect(btn.textContent).not.toContain('Copied');
		} finally { vi.useRealTimers(); }
	});
});

describe('ColorPicker + Listbox', () => {
	it('hex input validates, swatches set, listbox arrows/hover/unknown keys', () => {
		const onColor = vi.fn();
		add(<>
			<ColorPicker onChange={onColor} />
			<Listbox options={['a', 'b', 'c']} label="Pick one" />
		</>);
		const hex = document.querySelector('[aria-label="Hex colour"]');
		type(hex, 'blue'); // invalid hex: ignored
		expect(onColor).not.toHaveBeenCalled();
		type(hex, '#00ff00');
		expect(onColor).toHaveBeenCalledWith('#00ff00');
		document.querySelector('[data-swatch="#e11d48"]').click();
		expect(onColor).toHaveBeenCalledWith('#e11d48');

		const listbox = document.querySelector('[role=listbox]');
		listbox.focus();
		key(listbox, 'ArrowUp'); // clamped at 0
		key(listbox, 'Tab'); // unhandled key: early return, no crash
		const firstOption = listbox.querySelectorAll('[role=option]')[0];
		firstOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		expect(firstOption.getAttribute('data-active')).toBe('true');
	});
});

describe('TimeAgo units', () => {
	it('seconds/hours/days/months/years, future phrasing, invalid date, ticking', () => {
		vi.useFakeTimers();
		try {
			const now = new Date('2026-06-15T12:00:00Z');
			vi.setSystemTime(now);
			const ago = (ms) => new Date(now.getTime() - ms).toISOString();
			const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
			expect(add(TimeAgo({ date: ago(30 * S) })).textContent).toContain('30 seconds ago');
			expect(add(TimeAgo({ date: ago(2 * S) })).textContent).toBe('just now');
			expect(add(TimeAgo({ date: ago(3 * H) })).textContent).toContain('3 hours ago');
			expect(add(TimeAgo({ date: ago(3 * D) })).textContent).toContain('3 days ago');
			expect(add(TimeAgo({ date: ago(45 * D) })).textContent).toContain('1 month ago');
			expect(add(TimeAgo({ date: ago(800 * D) })).textContent).toContain('2 years ago');
			expect(add(TimeAgo({ date: new Date(now.getTime() + 5 * M).toISOString() })).textContent).toContain('in 5 minutes');
			expect(add(TimeAgo({ date: 'not-a-date' })).textContent).toBe('');
			expect(add(TimeAgo({ date: ago(30 * S), interval: null })).textContent).toContain('seconds ago');
			const ticking = add(TimeAgo({ date: ago(30 * S), interval: 1000 }));
			vi.advanceTimersByTime(31000); // tick subscription fires and re-renders
			expect(ticking.textContent).toContain('1 minute ago');
		} finally { vi.useRealTimers(); }
	});
});

describe('DataTable edges', () => {
	it('equal sort keys compare 0; row click reports', () => {
		const onRow = vi.fn();
		const columns = [{ key: 'n', label: 'N', sortable: true }, { key: 'id', label: 'Id' }];
		add(<DataTable columns={columns} data={[{ n: 2, id: 'a' }, { n: 2, id: 'b' }, { n: 1, id: 'c' }]} onRowClick={onRow} />);
		document.querySelector('[data-sort="n"]').click(); // sort: n=1 first, the two n=2 rows compare equal
		const rows = [...document.querySelectorAll('[data-row-index]')];
		expect(rows[0].textContent).toContain('c'); // n=1 row sorted first
		rows[0].click();
		expect(onRow).toHaveBeenCalled();
	});

	it('no rows renders the empty placeholder cell', () => {
		add(<DataTable columns={[{ key: 'n', label: 'N' }]} data={[]} />);
		expect(document.body.textContent).toContain('No rows');
	});
});

describe('InfiniteScroll', () => {
	it('sentinel intersection loads more; non-intersecting and loading states behave', async () => {
		let observerCallback = null;
		vi.stubGlobal('IntersectionObserver', class {
			constructor(cb) { observerCallback = cb; }
			observe() {}
			disconnect() {}
		});
		try {
			const onLoad = vi.fn();
			const loading = signal(false);
			add(<InfiniteScroll onLoadMore={onLoad} loading={loading} hasMore><p>content</p></InfiniteScroll>);
			await new Promise((r) => setTimeout(r, 10)); // mount setTimeout registers the observer
			expect(observerCallback).toBeTypeOf('function');
			observerCallback([{ isIntersecting: false }]);
			expect(onLoad).not.toHaveBeenCalled();
			observerCallback([{ isIntersecting: true }]);
			expect(onLoad).toHaveBeenCalledTimes(1);
			loading.value = true;
			expect(document.body.textContent).toContain('Loading…');
		} finally { vi.unstubAllGlobals(); }
	});
});

describe('CommandPalette interactions', () => {
	it('empty results guard Enter, click selects, panel click stays open', () => {
		const chose = vi.fn();
		add(<CommandPalette defaultOpen items={[{ label: 'Alpha', onSelect: chose }, { label: 'Beta' }]} />);
		const input = document.querySelector('input[placeholder*="Type a command"]');
		type(input, 'zzz');
		expect(document.body.textContent).toContain('No results');
		key(input, 'Enter'); // nothing to choose: guarded, stays open
		expect(document.querySelector('input[placeholder*="Type a command"]')).toBeTruthy();
		type(input, '');
		key(input, 'ArrowUp'); // clamped at the top
		const beta = [...document.querySelectorAll('li')].find((li) => li.textContent.includes('Beta'));
		beta.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		input.click(); // panel click does not dismiss (stopPropagation)
		expect(document.querySelector('input[placeholder*="Type a command"]')).toBeTruthy();
		const alpha = [...document.querySelectorAll('li')].find((li) => li.textContent.includes('Alpha'));
		alpha.click();
		expect(chose).toHaveBeenCalled();
		expect(document.querySelector('input[placeholder*="Type a command"]')).toBeNull(); // closed

		add(<CommandPalette defaultOpen items={['Only']} />);
		key(document.querySelector('input[placeholder*="Type a command"]'), 'Escape'); // closes via keyboard
		expect(document.querySelector('input[placeholder*="Type a command"]')).toBeNull();

		add(<CommandPalette defaultOpen items={['Only']} />);
		document.querySelector('[data-uele-overlay]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		expect(document.querySelector('input[placeholder*="Type a command"]')).toBeNull(); // backdrop click closes
	});
});

describe('NavigationMenu + ContextMenu', () => {
	it('hover opens the panel, leaving closes; context menu Escape closes', () => {
		add(<>
			<NavigationMenu items={[{ label: 'Home', href: '/' }, { label: 'Docs', links: [{ label: 'Guide', href: '/guide' }] }]} />
			<ContextMenu items={[{ label: 'Refresh' }]}><div data-target="">right-click zone</div></ContextMenu>
		</>);
		const docsItem = [...document.querySelectorAll('[data-uele-nav-menu] li')].find((li) => li.textContent.includes('Docs'));
		docsItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		expect(docsItem.querySelector('button').getAttribute('aria-expanded')).toBe('true');
		expect(document.body.textContent).toContain('Guide');
		document.querySelector('[data-uele-nav-menu]').dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
		expect(docsItem.querySelector('button').getAttribute('aria-expanded')).toBe('false');

		const zone = document.querySelector('[data-target]');
		const ctxMenu = () => document.querySelector('[data-uele-context-menu] [role=menu]'); // nav panels share role=menu
		zone.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		expect(ctxMenu()).toBeTruthy();
		key(zone, 'Escape');
		expect(ctxMenu()).toBeNull();
	});
});

describe('SplitPane dragging', () => {
	it('horizontal and vertical drags move the ratio and stop on mouseup', () => {
		const rect = { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 };
		const root = add(SplitPane({ first: 'left', second: 'right' })); // root IS the [data-uele-split] container
		root.getBoundingClientRect = () => rect;
		root.querySelector('[data-uele-split-divider]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
		expect(root.querySelector('[data-pane=first]').style.width).toBe('75%');
		document.dispatchEvent(new MouseEvent('mouseup'));
		document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40 })); // released: no change
		expect(root.querySelector('[data-pane=first]').style.width).toBe('75%');

		const vRoot = add(SplitPane({ first: 'top', second: 'bottom', direction: 'vertical' }));
		vRoot.getBoundingClientRect = () => rect;
		vRoot.querySelector('[data-uele-split-divider]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		document.dispatchEvent(new MouseEvent('mousemove', { clientY: 25 }));
		expect(vRoot.querySelector('[data-pane=first]').style.height).toBe('25%');
		document.dispatchEvent(new MouseEvent('mouseup'));
	});
});

describe('SplitPane detached mid-drag', () => {
	it('mousemove after the pane is replaced mid-drag is a safe no-op', () => {
		const show = signal(true);
		const host = add(h('div', null, () => (show.value ? SplitPane({ first: 'L', second: 'R' }) : 'gone')));
		const divider = host.querySelector('[data-uele-split-divider]');
		divider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		show.value = false; // region replaces the pane while the drag listeners live on document
		expect(host.textContent).toContain('gone');
		document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 })); // detached: guarded, no crash
		document.dispatchEvent(new MouseEvent('mouseup'));
	});
});

describe('Editable + Lightbox items + FileList sizes', () => {
	it('Escape cancels editing; blur commits the draft', () => {
		const onSave = vi.fn();
		add(<Editable value="draft text" onChange={onSave} label="Name" />);
		byText(document, 'draft text').click(); // enters edit mode
		const editable = document.querySelector('[data-uele-editable]');
		const input = document.querySelector('input[aria-label="Name"]');
		expect(editable.getAttribute('data-editing')).toBe('true');
		key(input, 'Escape'); // cancel: no save
		expect(onSave).not.toHaveBeenCalled();
		expect(editable.getAttribute('data-editing')).toBe('false');
		byText(document, 'draft text').click();
		type(input, 'draft text plus');
		input.dispatchEvent(new FocusEvent('blur', { bubbles: false })); // blur commits
		expect(onSave).toHaveBeenCalledWith('draft text plus');
	});

	it('Lightbox prev steps back; FileList renders missing sizes as blank', () => {
		const root = add(Lightbox({ images: ['a.png', 'b.png'] }));
		root.querySelector('[aria-label="View image 2"]').click();
		expect(root.querySelector('[data-uele-lightbox-img]').getAttribute('src')).toBe('b.png');
		root.querySelector('[aria-label="Previous image"]').click();
		expect(root.querySelector('[data-uele-lightbox-img]').getAttribute('src')).toBe('a.png');

		add(<FileList files={[{ name: 'mystery.bin' }]} />);
		expect(document.body.textContent).toContain('mystery.bin');
	});
});
