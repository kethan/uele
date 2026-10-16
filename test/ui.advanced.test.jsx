/** @jsxImportSource uele */
/**
 * Wave-2 `uele/ui` components: the real-world catalogue — toggles, pickers,
 * calendar/date, command palette, data table, tree, virtual list, menus,
 * wizard, lightbox and app chrome — plus the dashboard example that
 * composes them.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import * as UI from 'uele/ui';
import {
	Toggle, ToggleGroup, SegmentedControl, MultiSelect, Listbox, PasswordInput,
	ColorPicker, InputGroup, CopyButton, VisuallyHidden, SkipLink, StatusDot,
	AvatarGroup, Calendar, DatePicker, TimeAgo, CountdownTimer, DataTable, Tree,
	VirtualList, InfiniteScroll, CommandPalette, ContextMenu, NavigationMenu,
	HoverCard, Dialog, Drawer, AlertDialog, SplitPane, Editable, Lightbox,
	FileList, Wizard, Toolbar, Navbar, AppShell, Timeline
} from 'uele/ui';
import { mountDashboard } from '../examples/dashboard.jsx';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});
afterEach(() => vi.useRealTimers());
const key = (el, k, opts = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }));

describe('catalogue size', () => {
	it('now exports 120+ names with working aliases', () => {
		expect(Object.keys(UI).length).toBeGreaterThanOrEqual(120);
		expect(UI.Sheet).toBe(UI.Drawer);
		expect(UI.TreeView).toBe(UI.Tree);
		expect(UI.Gallery).toBe(UI.Lightbox);
		expect(UI.Command).toBe(UI.CommandPalette);
		expect(UI.RelativeTime).toBe(UI.TimeAgo);
		expect(UI.ConfirmDialog).toBe(UI.AlertDialog);
	});
});

describe('toggles and segmented', () => {
	it('Toggle flips a pressed model', () => {
		const bold = signal(false);
		const el = <Toggle model={bold}>B</Toggle>;
		document.body.append(el);
		el.click();
		expect(bold.value).toBe(true);
		expect(el.getAttribute('aria-pressed')).toBe('true');
		expect(el.dataset.state).toBe('on');
	});

	it('ToggleGroup handles single and multiple models', () => {
		const align = signal('');
		const single = <ToggleGroup model={align} options={['left', 'center', 'right']} />;
		document.body.append(single);
		single.querySelectorAll('button')[1].click();
		expect(align.value).toBe('center');
		single.querySelectorAll('button')[1].click();
		expect(align.value).toBe('');

		const styles = signal([]);
		const multi = <ToggleGroup model={styles} type="multiple" options={[{ value: 'b', label: 'Bold' }, { value: 'i', label: 'Italic' }]} />;
		document.body.append(multi);
		multi.querySelectorAll('button')[0].click();
		multi.querySelectorAll('button')[1].click();
		expect(styles.value).toEqual(['b', 'i']);
	});

	it('SegmentedControl acts as a radiogroup', () => {
		const view = signal('grid');
		const el = <SegmentedControl model={view} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />;
		document.body.append(el);
		const buttons = el.querySelectorAll('button');
		expect(buttons[0].getAttribute('aria-checked')).toBe('true');
		buttons[1].click();
		expect(view.value).toBe('list');
		expect(buttons[1].dataset.state).toBe('active');
	});
});

describe('pickers and inputs', () => {
	it('MultiSelect toggles array values from a dropdown', () => {
		const picked = signal([]);
		const el = <MultiSelect model={picked} options={['Red', 'Green', 'Blue']} placeholder="Colours" />;
		document.body.append(el);
		const toggle = el.querySelector('button');
		expect(toggle.textContent).toBe('Colours');
		toggle.click();
		const options = el.querySelectorAll('[role=option]');
		expect(options.length).toBe(3);
		options[0].click();
		options[2].click();
		expect(picked.value).toEqual(['Red', 'Blue']);
		expect(toggle.textContent).toBe('Red, Blue');
		expect(options[0].getAttribute('aria-selected')).toBe('true');
	});

	it('Listbox selects by click and by keyboard', () => {
		const choice = signal('a');
		const el = <Listbox model={choice} options={['a', 'b', 'c']} label="Pick" />;
		document.body.append(el);
		el.querySelectorAll('li')[1].click();
		expect(choice.value).toBe('b');
		key(el, 'ArrowDown');
		key(el, 'Enter');
		expect(choice.value).toBe('c');
		expect(el.querySelectorAll('li')[2].getAttribute('aria-selected')).toBe('true');
	});

	it('PasswordInput reveals text and scores strength', () => {
		const secret = signal('');
		const el = <PasswordInput model={secret} showStrength aria-label="Password" />;
		document.body.append(el);
		const input = el.querySelector('input');
		expect(input.type).toBe('password');
		input.value = 'Abcdef1!';
		input.dispatchEvent(new Event('input'));
		expect(secret.value).toBe('Abcdef1!');
		expect(el.querySelector('[role=progressbar]').dataset.strength).toBe('4');
		el.querySelector('button').click();
		expect(input.type).toBe('text');
	});

	it('ColorPicker syncs swatch, hex and presets', () => {
		const colour = signal('#2563eb');
		const el = <ColorPicker model={colour} />;
		document.body.append(el);
		el.querySelector('[data-swatch="#e11d48"]').click();
		expect(colour.value).toBe('#e11d48');
		const hex = el.querySelectorAll('input')[1];
		expect(hex.value).toBe('#e11d48');
		const native = el.querySelectorAll('input')[0];
		native.value = '#059669';
		native.dispatchEvent(new Event('input'));
		expect(colour.value).toBe('#059669');
	});

	it('InputGroup renders addons; CopyButton copies', async () => {
		const group = (
			<InputGroup prefix="https://" suffix=".com">
				<input aria-label="site" />
			</InputGroup>
		);
		expect(group.querySelector('[data-addon=prefix]').textContent).toBe('https://');
		expect(group.querySelector('[data-addon=suffix]').textContent).toBe('.com');

		Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: vi.fn(() => Promise.resolve()) }, configurable: true });
		const copy = <CopyButton text="hello" />;
		document.body.append(copy);
		copy.click();
		await Promise.resolve();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
		expect(copy.textContent).toBe('Copied');
	});

	it('VisuallyHidden, SkipLink, StatusDot, AvatarGroup', () => {
		const hidden = <VisuallyHidden>secret</VisuallyHidden>;
		expect(hidden.style.position).toBe('absolute');
		expect(hidden.style.width).toBe('1px');
		const skip = <SkipLink href="#content" />;
		expect(skip.getAttribute('href')).toBe('#content');
		skip.dispatchEvent(new Event('focus'));
		expect(skip.style.left).toBe('0px');
		expect((<StatusDot status="busy" />).dataset.status).toBe('busy');
		const group = <AvatarGroup avatars={['Ada Lovelace', 'Grace Hopper', 'Linus T', 'Margaret H', 'Alan T', 'Edsger D']} max={3} />;
		expect(group.textContent).toContain('+3');
	});
});

describe('calendar and date picker', () => {
	it('Calendar renders a month, navigates and writes ISO for string models', () => {
		const value = signal('2026-10-16');
		const changes = [];
		const el = <Calendar model={value} onChange={(d, iso) => changes.push(iso)} />;
		document.body.append(el);
		expect(el.textContent).toContain('October 2026');
		expect(el.querySelectorAll('[data-date]').length).toBe(31);
		el.querySelector('[data-date="2026-10-20"]').click();
		expect(value.value).toBe('2026-10-20');
		expect(changes).toEqual(['2026-10-20']);
		el.querySelector('[aria-label="Next month"]').click();
		expect(el.textContent).toContain('November 2026');
		el.querySelector('[aria-label="Previous month"]').click();
		el.querySelector('[aria-label="Previous month"]').click();
		expect(el.textContent).toContain('September 2026');
	});

	it('Calendar respects min/max', () => {
		const el = <Calendar value="2026-10-16" min="2026-10-10" max="2026-10-20" />;
		document.body.append(el);
		expect(el.querySelector('[data-date="2026-10-09"]').disabled).toBe(true);
		expect(el.querySelector('[data-date="2026-10-15"]').disabled).toBe(false);
		expect(el.querySelector('[data-date="2026-10-21"]').disabled).toBe(true);
	});

	it('DatePicker picks from the popover calendar and accepts typed ISO', () => {
		const value = signal('');
		const el = <DatePicker model={value} />;
		document.body.append(el);
		el.querySelector('[aria-label="Open calendar"]').click();
		el.querySelector('[data-date$="-15"]').click();
		expect(value.value).toMatch(/^\d{4}-\d{2}-15$/);
		const input = el.querySelector('input');
		input.value = '2027-01-02';
		input.dispatchEvent(new Event('input'));
		expect(value.value).toBe('2027-01-02');
	});
});

describe('live time', () => {
	it('TimeAgo renders relative text', () => {
		const now = <TimeAgo date={new Date()} />;
		expect(now.textContent).toBe('just now');
		const past = <TimeAgo date={new Date(Date.now() - 5 * 60000)} />;
		expect(past.textContent).toBe('5 minutes ago');
		const future = <TimeAgo date={new Date(Date.now() + 2 * 3600000)} />;
		expect(future.textContent).toBe('in 2 hours');
	});

	it('CountdownTimer formats and completes', () => {
		vi.useFakeTimers();
		const done = vi.fn();
		const el = <CountdownTimer seconds={3661} onComplete={done} />;
		document.body.append(el);
		expect(el.textContent).toBe('01:01:01');
		vi.advanceTimersByTime(3661 * 1000);
		expect(el.textContent).toBe('00:00:00');
		expect(done).toHaveBeenCalledTimes(1);
		expect(el.dataset.done).toBe('true');
	});
});

describe('data-heavy components', () => {
	const columns = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'age', label: 'Age', sortable: true }
	];
	const rows = [{ name: 'Grace', age: 36 }, { name: 'Ada', age: 28 }, { name: 'Linus', age: 54 }];

	it('DataTable sorts by clicking headers', () => {
		const el = <DataTable columns={columns} data={rows} />;
		document.body.append(el);
		const names = () => [...el.querySelectorAll('tbody td:first-child')].map((td) => td.textContent);
		expect(names()).toEqual(['Grace', 'Ada', 'Linus']);
		el.querySelector('[data-sort="name"]').click();
		expect(names()).toEqual(['Ada', 'Grace', 'Linus']);
		el.querySelector('[data-sort="name"]').click();
		expect(names()).toEqual(['Linus', 'Grace', 'Ada']);
		el.querySelector('[data-sort="age"]').click();
		expect(names()).toEqual(['Ada', 'Grace', 'Linus']);
	});

	it('DataTable pages when pageSize is set', () => {
		const many = Array.from({ length: 12 }, (_, i) => ({ name: 'U' + i, age: i }));
		const el = <DataTable columns={columns} data={many} pageSize={5} />;
		document.body.append(el);
		expect(el.querySelectorAll('tbody tr').length).toBe(5);
		el.querySelector('[aria-label="Go to next page"]').click();
		expect(el.querySelectorAll('tbody tr').length).toBe(5);
		expect(el.querySelector('tbody td').textContent).toBe('U5');
	});

	it('Tree expands branches and selects leaves', () => {
		const selected = signal('');
		const items = [
			{ label: 'src', value: 'src', children: [{ label: 'index.js', value: 'src/index' }, { label: 'ui.js', value: 'src/ui' }] },
			{ label: 'README', value: 'readme' }
		];
		const el = <Tree items={items} model={selected} />;
		document.body.append(el);
		// children stay in the DOM under a hidden group (Radix-style) until expanded
		expect(el.querySelector('[role=group]').hidden).toBe(true);
		el.querySelectorAll('button')[0].click();
		expect(selected.value).toBe('src');
		expect(el.querySelector('[role=group]').hidden).toBe(false);
		[...el.querySelectorAll('button')].find((b) => b.textContent.includes('ui.js')).click();
		expect(selected.value).toBe('src/ui');
	});

	it('VirtualList only renders the visible window', () => {
		const items = Array.from({ length: 500 }, (_, i) => 'row ' + i);
		const el = <VirtualList items={items} itemHeight={20} height={100} renderItem={(item) => item} />;
		document.body.append(el);
		const rendered = el.querySelectorAll('[data-index]');
		expect(rendered.length).toBeGreaterThan(3);
		expect(rendered.length).toBeLessThan(30);
		expect(el.textContent).toContain('row 0');
		el.scrollTop = 1000;
		el.dispatchEvent(new Event('scroll'));
		expect(el.textContent).toContain('row 50');
	});

	it('InfiniteScroll falls back to a button without IntersectionObserver', () => {
		const load = vi.fn();
		const el = (
			<InfiniteScroll onLoadMore={load}>
				<p>content</p>
			</InfiniteScroll>
		);
		document.body.append(el);
		el.querySelector('button').click();
		expect(load).toHaveBeenCalledTimes(1);
	});
});

describe('command palette, context menu, nav menu, hover card', () => {
	it('CommandPalette filters, navigates and selects with the keyboard', () => {
		const picked = [];
		const items = [
			{ label: 'Open settings', onSelect: () => picked.push('settings') },
			{ label: 'Toggle theme', onSelect: () => picked.push('theme') },
			{ label: 'Sign out', onSelect: () => picked.push('out') }
		];
		const el = <CommandPalette trigger="Open palette" items={items} />;
		document.body.append(el);
		expect(el.querySelector('[role=dialog]')).toBe(null);
		el.querySelector('button').click();
		const input = el.querySelector('[data-uele-command-input]');
		expect(input).toBeTruthy();
		input.value = 'theme';
		input.dispatchEvent(new Event('input'));
		expect(el.querySelectorAll('[role=option]').length).toBe(1);
		key(input, 'Enter');
		expect(picked).toEqual(['theme']);
		expect(el.querySelector('[role=dialog]')).toBe(null);

		el.querySelector('button').click();
		const again = el.querySelector('[data-uele-command-input]');
		key(again, 'ArrowDown');
		key(again, 'Enter');
		expect(picked).toEqual(['theme', 'theme']);
	});

	it('ContextMenu opens on right click and selects', () => {
		const picked = [];
		const el = (
			<ContextMenu items={[{ label: 'Rename', onSelect: () => picked.push('rename') }]}>
				<div>target</div>
			</ContextMenu>
		);
		document.body.append(el);
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 }));
		const menu = el.querySelector('[role=menu]');
		expect(menu).toBeTruthy();
		expect(menu.style.left).toBe('10px');
		menu.querySelector('button').click();
		expect(picked).toEqual(['rename']);
		expect(el.querySelector('[role=menu]')).toBe(null);
	});

	it('NavigationMenu opens dropdown panels', () => {
		const el = (
			<NavigationMenu items={[
				{ label: 'Home', href: '/' },
				{ label: 'Products', links: [{ label: 'One', href: '/1' }, { label: 'Two', href: '/2' }] }
			]} />
		);
		document.body.append(el);
		const panel = el.querySelector('[role=menu]');
		expect(panel.hidden).toBe(true);
		[...el.querySelectorAll('button')].find((b) => b.textContent === 'Products').click();
		expect(panel.hidden).toBe(false);
		expect(panel.textContent).toContain('One');
	});

	it('HoverCard appears after the delay', () => {
		vi.useFakeTimers();
		const el = (
			<HoverCard trigger={<button>profile</button>} content="Ada, admin" delay={200} />
		);
		document.body.append(el);
		const card = el.querySelector('[data-uele-hover-card]');
		expect(card.hidden).toBe(true);
		el.dispatchEvent(new MouseEvent('mouseenter'));
		vi.advanceTimersByTime(200);
		expect(card.hidden).toBe(false);
		el.dispatchEvent(new MouseEvent('mouseleave'));
		vi.advanceTimersByTime(200);
		expect(card.hidden).toBe(true);
	});
});

describe('dialog hardening, drawer, confirm', () => {
	it('Dialog locks scroll while open and releases on close', () => {
		const open = signal(false);
		const el = <Dialog model={open} trigger="Open" title="T">body</Dialog>;
		document.body.append(el);
		el.querySelector('button').click();
		expect(document.body.style.overflow).toBe('hidden');
		el.querySelector('[aria-label="Close"]').click();
		expect(document.body.style.overflow).toBe('');
	});

	it('Drawer is anchored to its edge, Sheet is its alias', () => {
		const open = signal(true);
		const el = <Drawer model={open} side="right" title="Menu">links</Drawer>;
		document.body.append(el);
		const panel = el.querySelector('[role=dialog]');
		expect(panel.dataset.side).toBe('right');
		expect(panel.style.left).toBe('auto');
		expect(panel.style.transform).toBe('none');
	});

	it('AlertDialog confirms and cancels, closing either way', () => {
		const open = signal(true);
		const events = [];
		const el = (
			<AlertDialog model={open} title="Delete?" danger onConfirm={() => events.push('confirm')} onCancel={() => events.push('cancel')}>
				Really delete?
			</AlertDialog>
		);
		document.body.append(el);
		el.querySelector('[data-action="cancel"]').click();
		expect(events).toEqual(['cancel']);
		expect(open.value).toBe(false);
		open.value = true;
		el.querySelector('[data-action="confirm"]').click();
		expect(events).toEqual(['cancel', 'confirm']);
		expect(open.value).toBe(false);
	});
});

describe('split pane, editable, lightbox, file list, wizard', () => {
	it('SplitPane divider keys move the ratio', () => {
		const ratio = signal(0.5);
		const el = <SplitPane model={ratio} first={<p>L</p>} second={<p>R</p>} />;
		document.body.append(el);
		const divider = el.querySelector('[data-uele-split-divider]');
		key(divider, 'ArrowRight');
		expect(ratio.value).toBeGreaterThan(0.5);
		key(divider, 'ArrowLeft');
		key(divider, 'ArrowLeft');
		expect(ratio.value).toBeLessThan(0.5);
		expect(divider.getAttribute('aria-valuenow')).toBe(String(Math.round(ratio.value * 100)));
	});

	it('Editable commits on Enter and cancels on Escape', () => {
		const name = signal('Ada');
		const el = <Editable model={name} />;
		document.body.append(el);
		el.querySelector('button').click();
		const input = el.querySelector('input');
		expect(el.dataset.editing).toBe('true');
		input.value = 'Grace';
		input.dispatchEvent(new Event('input'));
		key(input, 'Enter');
		expect(name.value).toBe('Grace');
		expect(el.dataset.editing).toBe('false');
	});

	it('Lightbox navigates images and closes', () => {
		const el = <Lightbox images={[{ src: '/a.png', alt: 'A' }, { src: '/b.png', alt: 'B' }]} />;
		document.body.append(el);
		el.querySelectorAll('button')[0].click();
		expect(el.querySelector('[data-uele-lightbox-img]').getAttribute('src')).toBe('/a.png');
		el.querySelector('[aria-label="Next image"]').click();
		expect(el.querySelector('[data-uele-lightbox-img]').getAttribute('src')).toBe('/b.png');
		el.querySelector('[aria-label="Close viewer"]').click();
		expect(el.querySelector('[role=dialog]')).toBe(null);
	});

	it('FileList shows progress, done and remove', () => {
		const removed = [];
		const files = signal([
			{ name: 'a.zip', size: 2048, progress: 50 },
			{ name: 'b.png', size: 1024, status: 'error', error: 'Too big' }
		]);
		const el = <FileList files={files} onRemove={(f) => removed.push(f.name)} />;
		document.body.append(el);
		expect(el.textContent).toContain('a.zip');
		expect(el.textContent).toContain('2.0 KB');
		expect(el.textContent).toContain('Too big');
		el.querySelectorAll('[aria-label^="Remove"]')[0].click();
		expect(removed).toEqual(['a.zip']);
	});

	it('Wizard walks steps and finishes', () => {
		const finished = vi.fn();
		const steps = [
			{ label: 'One', content: 'first panel' },
			{ label: 'Two', content: 'second panel' }
		];
		const el = <Wizard steps={steps} onFinish={finished} />;
		document.body.append(el);
		expect(el.querySelector('[data-uele-wizard-panel]').textContent).toBe('first panel');
		el.querySelector('[data-action="next"]').click();
		expect(el.querySelector('[data-uele-wizard-panel]').textContent).toBe('second panel');
		el.querySelector('[data-action="finish"]').click();
		expect(finished).toHaveBeenCalledTimes(1);
	});
});

describe('app chrome', () => {
	it('Toolbar, Navbar, AppShell, Timeline compose', () => {
		const toolbar = (
			<Toolbar label="Format">
				<button>Bold</button>
			</Toolbar>
		);
		expect(toolbar.getAttribute('role')).toBe('toolbar');
		const shell = (
			<AppShell header={<Navbar brand="Admin" links={[{ label: 'Home', href: '/', current: true }]} />} sidebar={<span>side</span>}>
				<p>main content</p>
			</AppShell>
		);
		document.body.append(shell);
		expect(shell.querySelector('[data-uele-brand]').textContent).toBe('Admin');
		expect(shell.querySelector('aside').textContent).toBe('side');
		expect(shell.querySelector('main').textContent).toBe('main content');
		const timeline = <Timeline items={[{ title: 'Shipped', time: 'today', description: 'v1' }]} />;
		expect(timeline.textContent).toContain('Shipped');
	});
});

describe('dashboard example composes the catalogue', () => {
	it('mounts, filters the table and opens settings', () => {
		const app = mountDashboard(document.body);
		expect(app.textContent).toContain('uele admin');
		expect(app.textContent).toContain('Ada');
		const input = app.querySelector('input[type=search], input[aria-label="Filter users"]');
		input.value = 'grace';
		input.dispatchEvent(new Event('input'));
		expect(app.textContent).toContain('Grace');
		expect(app.textContent).not.toContain('Linus');
		const settings = [...app.querySelectorAll('button')].find((b) => b.textContent === 'Settings');
		settings.click();
		expect(app.querySelector('[role=dialog]')).toBeTruthy();
	});
});
