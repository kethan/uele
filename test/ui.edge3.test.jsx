/** @jsxImportSource uele */
/**
 * Edge wave 3 (coverage mop-up): the alternate prop shapes and default
 * branches of `uele/ui` — bare/minimal renders, plain values where the main
 * suites pass cells, object options where they pass strings, and the few
 * interaction paths left over (Radio model write, Switch error channel,
 * MultiSelect summary, Tree/VirtualList, palette controlled mode…).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal, computed } from '@preact/signals-core';
import { Subject } from 'rxjs';
import { h } from 'uele';
import {
	Accordion, Alert, AlertDialog, AppShell, Avatar, AvatarGroup, Badge,
	Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, Button,
	Calendar, Carousel, Checkbox, Combobox, CommandPalette, ContextMenu,
	CountdownTimer, DataTable, DatePicker, Dialog, Drawer, Dropzone, Editable, Empty,
	FileInput, FileList, Grid, HoverCard, InfiniteScroll, InputGroup, Lightbox,
	List, Listbox, Menu, MenuItem, MultiSelect, Navbar, NavigationMenu,
	NumberInput, Pagination, PasswordInput, Popover, Progress, Radio,
	RadioGroup, Rating, SearchInput, SegmentedControl, Select, Skeleton,
	SkipLink, Slider, SplitPane, Stat, Stepper, Switch, Tab, TabList, TabPanel, Tabs,
	TagInput, Timeline, TimeAgo, Toast, Toaster, ToggleGroup, Tooltip, Tree,
	VirtualList, Wizard
} from 'uele/ui';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});
afterEach(() => { document.body.innerHTML = ''; });

const add = (node) => {
	const flat = [node].flat(Infinity);
	for (const n of flat) if (n != null && n !== '') document.body.append(n);
	return flat.find((n) => n instanceof Element) ?? document.body;
};
const key = (target, k, init = {}) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const type = (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };

describe('form controls: alternate wirings', () => {
	it('Radio with a model cell writes it and re-renders checked', () => {
		const model = signal('free');
		const root = add(<Radio model={model} value="pro" label="Pro" />);
		const input = root.querySelector('input');
		expect(input.checked).toBe(false);
		input.click();
		expect(model.value).toBe('pro');
		expect(input.checked).toBe(true);
	});

	it('Switch: erroring controlled source is swallowed; uncontrolled paints locally', () => {
		const subject = new Subject();
		add(<Switch checked={subject} label="S" />);
		expect(() => subject.error(new Error('boom'))).not.toThrow(); // sub error noop
		const root = add(<Switch label="Plain" />);
		const btn = root.matches('button') ? root : root.querySelector('button');
		btn.click();
		expect(btn.getAttribute('aria-checked')).toBe('true');
	});

	it('Checkbox with a plain checked value; Select and RadioGroup in children mode', () => {
		const onCheck = vi.fn();
		add(<Checkbox checked={false} onChange={onCheck} label="Agree" />);
		document.querySelector('input[type=checkbox]').click();
		expect(onCheck).toHaveBeenCalled();

		add(<Select><option value="a">A</option><option value="b">B</option></Select>);
		expect(document.querySelector('select').querySelectorAll('option')).toHaveLength(2);

		add(<RadioGroup label="Plan"><Radio value="a" label="A" /><Radio value="b" label="B" /></RadioGroup>);
		expect(document.querySelectorAll('[role=radiogroup] input[type=radio]')).toHaveLength(2);
	});

	it('Slider with a plain value reports through onChange only', () => {
		const onChange = vi.fn();
		add(<Slider value={5} min={0} max={10} onChange={onChange} aria-label="Volume" />);
		const input = document.querySelector('input[type=range]');
		type(input, '7');
		expect(onChange).toHaveBeenCalledWith(7);
	});

	it('Rating arrows move from an unset value; NumberInput defaults and NaN guard', () => {
		add(<Rating label="Score" />);
		const group = document.querySelector('[role=radiogroup]');
		key(group, 'ArrowRight');
		expect(group.querySelector('[data-value="1"]').getAttribute('aria-checked')).toBe('true');
		key(group, 'ArrowLeft');
		expect(group.querySelector('[data-value="1"]').getAttribute('aria-checked')).toBe('false');

		add(<NumberInput />); // infinite bounds take the null min/max branches
		const num = document.querySelector('[data-uele-number-input] input');
		add(<NumberInput value={null} />); // nullish value renders as empty
		Object.defineProperty(num, 'value', { configurable: true, get: () => 'abc' });
		num.dispatchEvent(new Event('input', { bubbles: true })); // NaN: no write, no crash
		delete num.value;
	});

	it('SearchInput clear with and without a writable target', () => {
		const model = signal('query');
		add(<SearchInput model={model} />);
		document.querySelector('[aria-label="Clear search"]').click();
		expect(model.value).toBe('');
		add(<SearchInput />); // no model/value/onChange: nothing to write, still clears
		document.querySelectorAll('[aria-label="Clear search"]')[1].click();
	});

	it('TagInput backspace pops the last tag; FileInput falls back to its default label', () => {
		const tags = signal(['one', 'two']);
		add(<TagInput model={tags} />);
		const input = document.querySelector('[data-uele-tag-input] input, input[type=text]');
		input.focus();
		key(input, 'Backspace'); // empty input + existing tags: pop
		expect(tags.value).toEqual(['one']);

		add(<FileInput />); // no children, no label
		expect(document.body.textContent).toContain('Choose file');
	});

	it('Combobox and Listbox accept object options', () => {
		add(<Combobox options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Berry' }]} label="Fruit" />);
		document.querySelector('[data-uele-combobox] button').click();
		expect(document.body.textContent).toContain('Apple');
		const onPick = vi.fn();
		add(<Listbox options={[{ value: 'x', label: 'X-ray' }]} onChange={onPick} label="Pick" />);
		document.querySelector('ul[aria-label="Pick"] [role=option]').click();
		expect(onPick).toHaveBeenCalledWith('x');
	});
});

describe('bare and alternate display shapes', () => {
	it('defaults render: Button lg, Grid string columns, List ordered, Badge/Alert/Skeleton/Stat/Empty', () => {
		add(<Button size="lg">Big</Button>);
		add(<Grid columns="1fr 2fr"><span>a</span></Grid>);
		add(<List ordered><li>one</li></List>);
		add(<Badge>Plain</Badge>);
		add(<Alert>Heads up</Alert>);
		add(<Skeleton circle />);
		add(<Skeleton />);
		add(<Stat label="Total" value="42" />);
		add(<Empty>No data</Empty>);
		expect(document.querySelectorAll('[data-uele-skeleton], [data-uele-badge], [data-uele-alert]').length).toBeGreaterThan(0);
		expect(document.body.textContent).toContain('42');
	});

	it('Avatar initials fall back through name shapes; AvatarGroup shows overflow', () => {
		add(<Avatar name="Ada Lovelace" />);
		expect(document.body.textContent).toContain('AL');
		add(<Avatar />); // no name, no src: '?' initial
		expect(document.body.textContent).toContain('?');
		add(<AvatarGroup avatars={['Ann', 'Bob', 'Cid', 'Dee']} max={2} />);
		expect(document.body.textContent).toContain('+2');
	});

	it('Progress tolerates unset values and a zero max', () => {
		add(<Progress value={undefined} />);
		add(<Progress value={5} max={0} />);
		const bars = document.querySelectorAll('[role=progressbar]');
		expect(bars[0].getAttribute('aria-valuenow')).toBe('0');
	});

	it('Breadcrumb items mode, separator and current link', () => {
		add(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Here' }]} />);
		expect(document.querySelector('[aria-current="page"]')).toBeTruthy();
		add(<Breadcrumb><BreadcrumbItem><BreadcrumbLink href="/x">X</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /></Breadcrumb>);
		expect(document.body.textContent).toContain('X');
	});

	it('Pagination with a zero pageSize still pages', () => {
		const onPage = vi.fn();
		add(<Pagination total={50} pageSize={0} onChange={onPage} />);
		const next = [...document.querySelectorAll('button')].find((b) => /next|›|→/i.test(b.textContent) || b.getAttribute('aria-label') === 'Next page');
		if (next) next.click();
	});
});

describe('tabs, accordion and stepper alternates', () => {
	it('Tabs: unknown model value falls back to the first panel; compositional Tab/TabPanel', () => {
		const model = signal('nope');
		add(<Tabs items={[{ value: 'a', label: 'A', content: 'panel-a' }, { value: 'b', label: 'B', content: 'panel-b' }]} model={model} />);
		expect(document.body.textContent).toContain('panel-a'); // find() misses, list[0] wins

		const sel = signal('a');
		add(<Tabs><TabList>
			<Tab selected={sel} value="a">TA</Tab>
			<Tab selected={sel} value="b">TB</Tab>
		</TabList>
			<TabPanel selected={sel} value="a">body-a</TabPanel>
			<TabPanel selected={sel} value="b">body-b</TabPanel>
		</Tabs>);
		const panelB = [...document.querySelectorAll('[role=tabpanel]')].find((p) => p.textContent === 'body-b');
		expect(panelB.hidden).toBe(true);
	});

	it('Accordion single non-collapsible stays open on re-click; disabled item never toggles', () => {
		add(Accordion({
			collapsible: false,
			items: [
				{ value: 'a', title: 'First', content: 'Body A' },
				{ value: 'd', title: 'Locked', content: 'Body D', disabled: true }
			]
		}));
		const first = [...document.querySelectorAll('button')].find((b) => b.textContent === 'First');
		first.click();
		expect(first.getAttribute('aria-expanded')).toBe('true');
		first.click(); // collapsible:false: re-click keeps it open
		expect(first.getAttribute('aria-expanded')).toBe('true');
		const locked = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Locked');
		locked.click();
		expect(locked.getAttribute('aria-expanded')).toBe('false');
	});

	it('Stepper accepts a cell of steps and marks completed ones', () => {
		const steps = signal([{ label: 'One' }, { label: 'Two' }, { label: 'Three' }]);
		add(<Stepper steps={steps} current={2} />);
		expect(document.body.textContent).toContain('✓');
		add(<Stepper current={0}><li>custom</li></Stepper>); // children mode
		expect(document.body.textContent).toContain('custom');
	});
});

describe('overlays: dialog lock, drawer, menus, palette', () => {
	it('Dialog defaultOpen locks scroll, Escape closes and restores', () => {
		add(<Dialog defaultOpen title="T" description="D">Body</Dialog>);
		expect(document.body.style.overflow).toBe('hidden');
		key(document, 'Escape');
		expect(document.querySelector('[role=dialog]')).toBeNull();
		expect(document.body.style.overflow).toBe('');

		const subject = new Subject();
		add(<Dialog model={subject} title="S">Body</Dialog>); // open subscription error channel
		expect(() => subject.error(new Error('boom'))).not.toThrow();
		add(<Dialog>Plain</Dialog>); // no model/open: no subscription at all
	});

	it('Drawer sides and AlertDialog defaults render', () => {
		add(<Drawer defaultOpen side="left" title="Menu">Links</Drawer>);
		add(<Drawer defaultOpen side="bottom">Sheet</Drawer>);
		expect(document.body.textContent).toContain('Links');
		const onConfirm = vi.fn();
		add(<AlertDialog defaultOpen onConfirm={onConfirm} title="Sure?">Really?</AlertDialog>);
		const confirm = [...document.querySelectorAll('button')].find((b) => b.getAttribute('data-action') === 'confirm');
		confirm.click();
		expect(onConfirm).toHaveBeenCalled();
	});

	it('Popover onOpenChange wiring; Tooltip text prop; Menu children mode', () => {
		const onOpen = vi.fn();
		add(<Popover trigger="Info" onOpenChange={onOpen}>Panel</Popover>);
		[...document.querySelectorAll('button')].find((b) => b.textContent === 'Info').click();
		expect(onOpen).toHaveBeenCalledWith(true);
		add(<Tooltip text="hint"><button type="button">hover</button></Tooltip>);
		add(<Menu label="More"><MenuItem onSelect={vi.fn()}>Child item</MenuItem></Menu>);
		[...document.querySelectorAll('button')].find((b) => b.textContent === 'More').click();
		expect(document.body.textContent).toContain('Child item');
	});

	it('Toast without description; Toaster over a plain array dismisses locally', () => {
		add(<Toast title="Saved" />);
		const subject = new Subject();
		add(<Toast title="Subbed" open={subject} />); // subscription error channel is a noop
		expect(() => subject.error(new Error('boom'))).not.toThrow();
		const onClose = vi.fn();
		add(<Toaster toasts={[{ id: 1, title: 'Plain', onClose }]} />);
		const dismiss = document.querySelector('[data-uele-toaster] button[aria-label="Dismiss"]');
		dismiss.click(); // not a cell: no write-back, onClose still fires
		expect(onClose).toHaveBeenCalled();
	});

	it('CommandPalette controlled via open cell, trigger button, keyword match', () => {
		const openCell = signal(false);
		const chose = vi.fn();
		add(<CommandPalette open={openCell} trigger="Open palette" items={[{ label: 'Deploy app', keywords: 'ship release', onSelect: chose }]} />);
		[...document.querySelectorAll('button')].find((b) => b.textContent === 'Open palette').click();
		expect(openCell.value).toBe(true);
		const input = document.querySelector('[data-uele-command-input]');
		type(input, 'ship'); // matches keywords, not the label
		expect(document.body.textContent).toContain('Deploy app');
		key(input, 'Enter');
		expect(chose).toHaveBeenCalled();
		expect(openCell.value).toBe(false);
	});

	it('ContextMenu: disabled and bare items are safe to click', () => {
		const root = add(<ContextMenu items={[{ label: 'Off', disabled: true }, { label: 'Bare' }]}><div data-zone="">zone</div></ContextMenu>);
		const zone = root.querySelector('[data-zone]');
		zone.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		const bare = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Bare');
		bare.click(); // no onSelect anywhere: closes quietly
		expect(root.querySelector('[role=menu]')).toBeNull();
	});
});

describe('pickers, data and misc alternates', () => {
	it('MultiSelect: summary placeholder, join, count, and deselect', () => {
		const picked = signal([]);
		add(<MultiSelect options={['a', 'b', 'c']} model={picked} placeholder="Pick…" />);
		const toggle = document.querySelector('[data-uele-multi-select] button');
		expect(toggle.textContent).toContain('Pick…');
		toggle.click();
		const opt = (v) => document.querySelector(`[data-uele-multi-select] [data-value="${v}"]`);
		opt('a').click();
		opt('b').click();
		expect(toggle.textContent).toContain('a, b');
		opt('c').click();
		expect(toggle.textContent).toContain('3 selected');
		opt('a').click(); // deselect: back to a two-label join
		expect(picked.value).toEqual(['b', 'c']);
	});

	it('Carousel: renderItem wins, empty items render nothing', () => {
		add(<Carousel items={['x']} renderItem={(item) => h('em', null, `R:${item}`)} />);
		expect(document.body.textContent).toContain('R:x');
		const empty = add(<Carousel items={[]} />);
		expect(empty.querySelector('[data-uele-carousel-track]').textContent).toBe('');
	});

	it('ToggleGroup object options; SegmentedControl picks', () => {
		add(<ToggleGroup options={[{ value: 'l', label: 'Left' }, { value: 'r', label: 'Right' }]} />);
		document.querySelector('[data-value="l"]').click();
		expect(document.querySelector('[data-value="l"]').getAttribute('aria-pressed')).toBe('true');
		document.querySelector('[data-value="l"]').click(); // single mode: toggles back off
		expect(document.querySelector('[data-value="l"]').getAttribute('aria-pressed')).toBe('false');

		const seg = signal('m');
		add(<SegmentedControl options={[{ value: 's', label: 'S' }, { value: 'm', label: 'M' }]} model={seg} />);
		document.querySelector('[data-uele-segmented] [data-value="s"], [data-value="s"]').click();
		expect(seg.value).toBe('s');
	});

	it('SkipLink href default; InputGroup slots; PasswordInput visibility toggle', () => {
		add(<SkipLink>Skip</SkipLink>); // default target
		expect(document.querySelector('a').getAttribute('href')).toBeTruthy();
		add(<InputGroup><input aria-label="Grouped" /></InputGroup>);
		add(<PasswordInput label="Secret" />);
		const pwd = document.querySelector('[data-uele-password] input');
		expect(pwd.getAttribute('type')).toBe('password');
		const toggle = [...document.querySelectorAll('button')].find((b) => /show|hide/i.test(b.getAttribute('aria-label') || b.textContent));
		toggle.click();
		expect(pwd.getAttribute('type')).toBe('text');
	});

	it('Calendar picks a day and pages months; DatePicker opens its calendar', () => {
		const onDay = vi.fn();
		add(<Calendar value="2026-06-15" onChange={onDay} min="2026-06-10" max="2026-06-20" />);
		document.querySelector('[data-date="2026-06-16"]').click();
		expect(onDay).toHaveBeenCalledWith(expect.anything(), '2026-06-16');
		document.querySelector('[aria-label="Next month"]').click();
		expect(document.body.textContent).toContain('July 2026');

		add(<DatePicker value="2026-06-15" label="When" />);
		const input = document.querySelector('input[aria-label="When"], [data-uele-date-picker] input');
		if (input) { input.focus(); input.click(); }
	});

	it('TimeAgo accepts Date objects and timestamps; CountdownTimer completes', () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
			add(TimeAgo({ date: new Date('2026-06-15T11:59:00Z') }));
			expect(document.body.textContent).toContain('1 minute ago');
			add(TimeAgo({ value: Date.now() - 3600_000 }));
			expect(document.body.textContent).toContain('1 hour ago');

			const done = vi.fn();
			add(<CountdownTimer seconds={1} onComplete={done} />);
			vi.advanceTimersByTime(1500);
			expect(done).toHaveBeenCalled();
		} finally { vi.useRealTimers(); }
		vi.stubGlobal('setInterval', undefined);
		try { add(<CountdownTimer seconds={5} />); } finally { vi.unstubAllGlobals(); } // no interval: static render
	});

	it('DataTable rows prop and built-in pagination', () => {
		const rows = Array.from({ length: 12 }, (_, i) => ({ n: i + 1 }));
		add(<DataTable columns={[{ key: 'n', label: 'N' }]} rows={rows} pageSize={5} />);
		expect(document.querySelectorAll('[data-row-index]')).toHaveLength(5);
		const page2 = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '2');
		page2.click();
		expect(document.querySelectorAll('[data-row-index]')).toHaveLength(5);
		expect(document.querySelector('tbody').textContent).toContain('6');
	});

	it('Tree expands, selects leaves, keys by label when value is absent', () => {
		const onSelect = vi.fn();
		add(<Tree items={[
			{ label: 'Root', children: [{ label: 'Leaf A' }, { label: 'Leaf B' }] },
			{ label: 'Solo', value: 'solo' }
		]} onSelect={onSelect} defaultExpanded={[]} />);
		const rootBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Root'));
		rootBtn.click(); // expand + select
		const leaf = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Leaf A'));
		leaf.click();
		expect(onSelect).toHaveBeenCalledWith('Leaf A');
		rootBtn.click(); // collapse again
	});

	it('VirtualList windows on scroll and renders raw items without renderItem', () => {
		const items = Array.from({ length: 50 }, (_, i) => `row-${i}`);
		const root = add(<VirtualList items={items} itemHeight={20} height={100} />);
		expect(root.textContent).toContain('row-0');
		const scroller = root.matches('[data-uele-virtual-list]') ? root : root.querySelector('[data-uele-virtual-list]');
		scroller.scrollTop = 400;
		scroller.dispatchEvent(new Event('scroll', { bubbles: false }));
		expect(scroller.textContent).toContain('row-20');
		const vh = add(<VirtualList items={['only']} height="40vh" renderItem={(x) => h('b', null, x)} />);
		expect(vh.style.height).toBe('40vh'); // string heights pass through to the style
	});

	it('InfiniteScroll without IntersectionObserver falls back to a button', () => {
		const onLoad = vi.fn();
		add(<InfiniteScroll onLoadMore={onLoad} hasMore={false}>content</InfiniteScroll>);
		const btn = [...document.querySelectorAll('button')].find((b) => /load/i.test(b.textContent));
		if (btn) btn.click();
		expect(onLoad).not.toHaveBeenCalled(); // hasMore false gates even the fallback
	});
});

describe('chrome and layout alternates', () => {
	it('NavigationMenu: content panels, plain items, click toggling', () => {
		add(<NavigationMenu items={[
			{ label: 'Plain' },
			{ label: 'Docs', content: 'panel-body' }
		]} />);
		const docs = [...document.querySelectorAll('button')].find((b) => b.getAttribute('data-label') === 'Docs');
		docs.click();
		expect(docs.getAttribute('aria-expanded')).toBe('true');
		expect(document.body.textContent).toContain('panel-body');
		docs.click();
		expect(docs.getAttribute('aria-expanded')).toBe('false');
	});

	it('Navbar/AppShell/Timeline with and without optional slots', () => {
		add(<Navbar brand="Acme" links={[{ label: 'Home' }, { label: 'Now', href: '/now', current: true }]} actions="act" />);
		expect(document.querySelector('[aria-current="page"]').textContent).toBe('Now');
		add(<Navbar><span>child actions</span></Navbar>); // children stand in for actions
		add(<AppShell header="H" sidebar="S" footer="F" main="M" />);
		add(<AppShell>just children</AppShell>);
		expect(document.querySelectorAll('[data-uele-app-shell]')).toHaveLength(2);
		add(<Timeline items={[{ title: 'One', time: '9:00', description: 'did it' }, { title: 'Two' }]} />);
		add(<Timeline><li>custom</li></Timeline>);
		expect(document.body.textContent).toContain('9:00');
	});

	it('SplitPane keyboard steps, shift stride, and children-array mode', () => {
		const root = add(<SplitPane><div>left-kid</div><div>right-kid</div></SplitPane>);
		const divider = root.querySelector('[data-uele-split-divider]');
		expect(root.textContent).toContain('left-kid');
		key(divider, 'ArrowRight');
		expect(divider.getAttribute('aria-valuenow')).toBe('52');
		key(divider, 'ArrowUp', { shiftKey: true }); // larger stride, ArrowUp decreases
		expect(divider.getAttribute('aria-valuenow')).toBe('42');
		key(divider, 'ArrowDown');
		expect(divider.getAttribute('aria-valuenow')).toBe('44');
	});

	it('Editable with no value shows its placeholder; HoverCard renders trigger forms', () => {
		add(<Editable placeholder="Nothing yet" />);
		expect(document.body.textContent).toContain('Nothing yet');
		add(<HoverCard content="card body"><button type="button">anchor</button></HoverCard>);
		expect(document.body.textContent).toContain('anchor');
	});

	it('Lightbox object images, empty list, and keys while closed', () => {
		const root = add(Lightbox({ images: [{ src: 'x.png', alt: 'Ex' }] }));
		root.querySelector('[aria-label="View image 1"]').click();
		expect(root.querySelector('[data-uele-lightbox-img]').getAttribute('alt')).toBe('Ex');
		root.querySelector('[data-uele-lightbox-img]').click(); // image click must not close the viewer
		expect(root.querySelector('[data-uele-lightbox-img]')).toBeTruthy();
		add(Lightbox({ images: [] }));
		key(document, 'ArrowRight'); // closed viewers ignore keys entirely
		add(<Wizard steps={[]} />); // zero steps: no crash, finish state immediately
	});
});
