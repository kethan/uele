/** @jsxImportSource uele */
/**
 * Edge wave 4 (final coverage mop-up): bare/null/empty prop shapes and the
 * plain-value (non-cell) wirings of `uele/ui` that the behavioural suites —
 * which favour rich props and cells — never evaluate.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { preactSignals } from 'uele/signals/preact';
import { signal } from '@preact/signals-core';
import {
	Accordion, Alert, AlertDialog, Avatar, AvatarGroup, Badge, Breadcrumb,
	BreadcrumbLink, BreadcrumbSeparator, Collapsible, Combobox, CommandPalette,
	Container, ContextMenu, CountdownTimer, DataTable, DatePicker, Dialog,
	Editable, FileList, InfiniteScroll, Lightbox, List, Listbox, Menu,
	MultiSelect, Navbar, NavigationMenu, NumberInput, OTPInput, Pagination,
	PasswordInput, Popover, Radio, RadioGroup, Rating, SegmentedControl,
	SkipLink, Slider, Spacer, Stat, StatusDot, Stepper, Switch, TabPanel, Tabs,
	TagInput, Timeline, Toaster, Toggle, ToggleGroup, Tree, VirtualList, Wizard
} from 'uele/ui';

beforeEach(() => {
	preactSignals();
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
const type = (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
const byText = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);

describe('bare and nullish collection shapes', () => {
	it('empty shells render without crashing', () => {
		add(<RadioGroup />); // no children, no options: (options || []) + auto name
		add(<Combobox options={null} label="F" />); // val(null) || []
		add(<Tabs items={signal(null)} />); // cell holding null: first-panel fallback of nothing
		add(<Toaster />); // no toasts at all
		add(<AvatarGroup />);
		add(<ToggleGroup />); // options || []
		add(<Listbox options={null} />);
		add(<Tree />);
		add(<VirtualList />);
		add(<DataTable columns={[{ key: 'n', label: 'N' }]} />); // neither data nor rows
		add(<Navbar brand="B" />); // no links/actions/children
		add(<Timeline />);
		add(<Wizard steps={signal(null)} />);
		add(Lightbox({ images: signal(null) }));
		add(<NavigationMenu items={null} />);
		expect(document.body.textContent).toContain('No rows');
		expect(document.querySelectorAll('[data-uele-toaster], [data-uele-tree], [data-uele-virtual-list]').length).toBeGreaterThan(0);
	});

	it('null-model collections treat null as empty until written', () => {
		const tagsModel = signal(null);
		const tagsRoot = add(<TagInput model={tagsModel} />);
		const tagInput = tagsRoot.querySelector('input');
		type(tagInput, 'fresh');
		key(tagInput, 'Enter'); // [...(null || []), 'fresh']
		expect(tagsModel.value).toEqual(['fresh']);
		key(tagInput, 'Backspace'); // input non-empty now? value cleared by add: safe either way

		const multiModel = signal(null);
		add(<MultiSelect model={multiModel} options={['a', 'b']} placeholder="Pick" />);
		const toggle = document.querySelector('[data-uele-multi-select] button');
		expect(toggle.textContent).toContain('Pick'); // summary over (null || [])
		toggle.click();
		document.querySelector('[data-uele-multi-select] [data-value="a"]').click();
		expect(multiModel.value).toEqual(['a']);

		const accModel = signal(null);
		add(Accordion({ type: 'multiple', model: accModel, items: [{ value: 'a', title: 'A', content: 'body' }] }));
		const header = byText(document, 'A');
		expect(header.getAttribute('aria-expanded')).toBe('false'); // (null || []).includes
		header.click();
		expect(accModel.value).toEqual(['a']);
	});

	it('Wizard accepts a cell of steps; Accordion single re-click collapses', () => {
		const steps = signal([{ label: 'One', content: 'p-one' }, { label: 'Two', content: 'p-two' }]);
		add(<Wizard steps={steps} />);
		expect(document.body.textContent).toContain('p-one');

		add(Accordion({ items: [{ value: 'a', title: 'First', content: 'B1' }, { value: 'b', title: 'Second', content: 'B2' }] }));
		const first = byText(document, 'First'); // single mode opens the first item by default
		expect(first.getAttribute('aria-expanded')).toBe('true');
		first.click(); // collapsible (default): closes to ''
		expect(first.getAttribute('aria-expanded')).toBe('false');
	});
});

describe('plain-value (non-cell) wirings', () => {
	it('Toggle with plain selected values reports without writing', () => {
		const onScalar = vi.fn();
		const scalar = add(<Toggle selected="a" value="b" onChange={onScalar}>S</Toggle>);
		scalar.click();
		expect(onScalar).toHaveBeenCalledWith('b', expect.anything()); // no cell to write
		const onArray = vi.fn();
		const arr = add(<Toggle selected={['a']} value="a" onChange={onArray}>A</Toggle>);
		arr.click();
		expect(onArray).toHaveBeenCalledWith([], expect.anything());
	});

	it('Stepper with only a plain current tolerates step clicks', () => {
		add(<Stepper steps={[{ label: 'One' }, { label: 'Two' }]} current={0} />);
		const two = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Two');
		two.click(); // (onChange || model || current) && setActive: current is the decider
		expect(two).toBeTruthy();
	});

	it('SegmentedControl defaults to the first string option', () => {
		add(<SegmentedControl options={['s', 'm']} />);
		const first = document.querySelector('[data-value="s"]');
		expect(first.getAttribute('aria-checked')).toBe('true');
	});

	it('Dialog onChange-only wiring; AlertDialog model cell drives open state', () => {
		const open = signal(false);
		add(<AlertDialog model={open} title="Sure?">Really?</AlertDialog>);
		expect(document.querySelector('[role=alertdialog], [role=dialog]')).toBeNull();
		open.value = true;
		expect(document.querySelector('[role=alertdialog], [role=dialog]')).toBeTruthy();
		[...document.querySelectorAll('button')].find((b) => b.getAttribute('data-action') === 'cancel').click();
		expect(open.value).toBe(false);

		const onChange = vi.fn();
		add(<Dialog trigger="Launch" onChange={onChange} title="T">Body</Dialog>);
		byText(document, 'Launch').click();
		expect(onChange).toHaveBeenCalledWith(true);
		expect(document.querySelector('[role=dialog]')).toBeTruthy();
	});

	it('MultiSelect plain value array; TabPanel explicit active flags', () => {
		add(<MultiSelect value={['a']} options={['a', 'b']} />);
		const toggle = document.querySelector('[data-uele-multi-select] button');
		expect(toggle.textContent).toContain('a'); // summary from a plain array
		add(<TabPanel active value="a">shown</TabPanel>);
		add(<TabPanel active={false} value="b">hidden</TabPanel>);
		const panels = [...document.querySelectorAll('[role=tabpanel]')];
		expect(panels.find((p) => p.textContent === 'shown').hidden).toBe(false);
		expect(panels.find((p) => p.textContent === 'hidden').hidden).toBe(true);
	});
});

describe('labels, defaults and fallbacks', () => {
	it('trigger/label/default chains resolve in order', () => {
		add(<Switch />); // kidsOf ?? label ?? ''
		add(<Popover label="Lbl">Body</Popover>); // trigger ?? label
		expect(byText(document, 'Lbl')).toBeTruthy();
		add(<Popover>Body2</Popover>); // neither: 'Open'
		expect(byText(document, 'Open')).toBeTruthy();
		add(<Menu items={[{ label: 'One' }]} />); // trigger ?? label ?? 'Menu'
		byText(document, 'Menu').click();
		expect(document.body.textContent).toContain('One');
		add(<Menu />); // (items || []) once opened
		byText(document, 'Menu').click();
		add(<Collapsible label="More">body</Collapsible>);
		add(<Collapsible>naked</Collapsible>); // 'Toggle'
		expect(byText(document, 'Toggle')).toBeTruthy();
		add(<SkipLink href="#x" />); // default text
		expect(document.body.textContent).toContain('Skip to content');
	});

	it('Stat slots, Container width, Spacer size, List default, tone fallbacks', () => {
		add(<Stat value={7} />); // no label span
		add(<Stat>kid-value</Stat>); // value ?? children
		expect(document.body.textContent).toContain('kid-value');
		const box = add(<Container maxWidth="30rem">c</Container>);
		expect(box.style.maxWidth).toBe('30rem');
		add(<Spacer size={12} />);
		add(<List><li>a</li></List>); // unordered default
		expect(document.querySelector('ul li').textContent).toBe('a');
		const bogus = add(<Badge tone="bogus">B</Badge>);
		expect(bogus.getAttribute('data-tone')).toBe('neutral');
		add(<Alert tone="bogus">careful</Alert>);
		expect(document.querySelector('[data-tone="info"]')).toBeTruthy();
		add(<Alert tone="danger">bad</Alert>);
		expect(document.querySelector('[role=alert]')).toBeTruthy();
		const dot = add(<StatusDot status="bogus" />);
		expect(dot.style.background).not.toBe('#22c55e'); // offline fallback colour
	});

	it('Avatar string sizes and image alt chains', () => {
		add(<Avatar size="3rem" name="Ada Lovelace" />); // string size passes through
		expect(document.body.textContent).toContain('AL');
		add(<Avatar src="https://x.test/a.png" name="Ada" />);
		const img = document.querySelector('img[src="https://x.test/a.png"]');
		expect(img.getAttribute('alt')).toBe('Ada'); // alt ?? val(name)
		add(<Avatar src="https://x.test/b.png" />);
		expect(document.querySelector('img[src="https://x.test/b.png"]').getAttribute('alt')).toBe(''); // both absent
	});

	it('Breadcrumb: non-last linkless item is a plain span; standalone link/separator', () => {
		add(<Breadcrumb items={[{ label: 'A' }, { label: 'B', href: '/b' }, { label: 'C' }]} />);
		const spans = [...document.querySelectorAll('[aria-label="Breadcrumb"] span')];
		expect(spans.some((s) => s.textContent === 'A' && !s.hasAttribute('aria-current'))).toBe(true);
		add(<BreadcrumbLink href="/x" current>X</BreadcrumbLink>);
		expect(document.querySelector('a[aria-current="page"]')).toBeTruthy();
		add(<BreadcrumbSeparator>›</BreadcrumbSeparator>);
		expect(document.body.textContent).toContain('›');
	});

	it('Pagination degenerate totals still render one page', () => {
		add(<Pagination totalPages={0} />); // Number(0) || 1
		add(<Pagination pageSize={5} />); // total undefined: NaN || 0
		add(<Pagination total={20} pageSize={5} />);
		document.querySelector('[data-page="2"]').click();
		expect(document.querySelector('[data-page="2"]').getAttribute('aria-current')).toBe('page');
	});
});

describe('remaining interaction branches', () => {
	it('Radio ignores change events that land unchecked', () => {
		const model = signal('a');
		add(<>
			<Radio model={model} name="g" value="a" label="A" />
			<Radio model={model} name="g" value="b" label="B" />
		</>);
		const [inputA, inputB] = document.querySelectorAll('input[type=radio]');
		inputB.click();
		expect(model.value).toBe('b');
		inputA.dispatchEvent(new Event('change', { bubbles: true })); // fires while unchecked: no write
		expect(model.value).toBe('b');
	});

	it('OTP paste clips overflow and tolerates a clipboard-less paste', () => {
		const done = vi.fn();
		const root = add(<OTPInput length={3} onComplete={done} />);
		const host = root.matches('[data-uele-otp]') ? root : root.querySelector('[data-uele-otp]');
		const paste = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '9999' } });
		host.dispatchEvent(paste); // 4 digits into 3 boxes: the 4th write is clipped
		expect(done).toHaveBeenCalledWith('999');
		host.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true })); // no clipboardData at all
	});

	it('NumberInput clears without writing; Rating ArrowLeft at zero stays; Editable null value', () => {
		const onNum = vi.fn();
		add(<NumberInput value={null} onChange={onNum} />);
		const [, up] = [...document.querySelectorAll('[data-uele-number-input] button')];
		up.click(); // (Number(null) || 0) + 1
		expect(onNum).toHaveBeenCalledWith(1);
		const input = document.querySelector('[data-uele-number-input] input');
		type(input, '5');
		type(input, ''); // '' branch: not a number, nothing written
		expect(onNum).not.toHaveBeenCalledWith('');

		add(<Rating label="R" />);
		const group = document.querySelector('[role=radiogroup]');
		key(group, 'ArrowLeft'); // (0 || 0) - 1 clamps at 0
		expect(group.querySelector('[data-value="1"]').getAttribute('aria-checked')).toBe('false');

		add(<Editable value={null} />);
		expect(document.body.textContent).toContain('Click to edit'); // ?? '' || placeholder
	});

	it('DatePicker formats Date values and only accepts ISO typing', () => {
		add(<DatePicker value={new Date(2026, 5, 15)} label="When" />);
		const input = document.querySelector('input[aria-label="When"]');
		expect(input.value).toBe('2026-06-15'); // instanceof Date branch
		type(input, 'garbage'); // parsed null: no commit
		expect(document.querySelector('[data-uele-datepicker]')).toBeTruthy();
		type(input, '2026-06-20');
		expect(input.value).toBe('2026-06-20');
	});

	it('CountdownTimer counts toward a `to` date without seconds', () => {
		const target = new Date(Date.now() + 90_000).toISOString();
		const root = add(<CountdownTimer to={target} />);
		expect(root.textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
	});

	it('InfiniteScroll gates on hasMore/loading; button shows Loading… without IO', async () => {
		let callback;
		vi.stubGlobal('IntersectionObserver', class {
			constructor(cb) { callback = cb; }
			observe() {}
			disconnect() {}
		});
		const onLoad = vi.fn();
		add(<InfiniteScroll onLoadMore={onLoad} hasMore={false}>x</InfiniteScroll>);
		await new Promise((r) => setTimeout(r, 10));
		callback([{ isIntersecting: true }]); // gated: hasMore false
		expect(onLoad).not.toHaveBeenCalled();
		vi.unstubAllGlobals();

		const loading = signal(true);
		const root = add(<InfiniteScroll onLoadMore={onLoad} loading={loading}>y</InfiniteScroll>); // no IO in jsdom
		const btn = root.querySelector('button');
		expect(btn.textContent).toContain('Loading…');
		expect(btn.disabled).toBe(true);
	});

	it('CommandPalette renders hints and shrugs off ordinary keys', () => {
		add(<CommandPalette defaultOpen items={[{ label: 'Alpha', hint: 'does alpha' }, 'Beta']} />);
		expect(document.body.textContent).toContain('does alpha');
		const input = document.querySelector('[data-uele-command-input]');
		key(input, 'a'); // not an arrow/enter/escape: ignored
		expect(document.querySelector('[data-uele-command-input]')).toBeTruthy();
	});

	it('ContextMenu closes on any later document click; null items open empty', () => {
		const root = add(<ContextMenu items={null}><div data-zone="">zone</div></ContextMenu>);
		const zone = root.querySelector('[data-zone]');
		zone.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
		expect(root.querySelector('[role=menu]')).toBeTruthy(); // (null || []) items
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(root.querySelector('[role=menu]')).toBeNull(); // document click closer
	});

	it('Lightbox survives its image list emptying mid-view and ignores stray keys', () => {
		const images = signal(['a.png', 'b.png']);
		const root = add(Lightbox({ images }));
		root.querySelector('[aria-label="View image 1"]').click();
		expect(root.querySelector('[data-uele-lightbox-img]')).toBeTruthy();
		key(document, 'x'); // open, but not a navigation key: nothing happens
		expect(root.querySelector('[data-uele-lightbox-img]')).toBeTruthy();
		images.value = []; // list empties while open: step() must use the || 1 length guard
		key(document, 'ArrowRight');
		key(document, 'Escape');
	});

	it('FileList renders sizes, error badges, progress and remove buttons', () => {
		const onRemove = vi.fn();
		add(<FileList onRemove={onRemove} files={[
			{ name: 'a.bin', size: 500, status: 'error', error: 'Boom' },
			{ name: 'b.bin', size: 2048, progress: 40 },
			{ name: 'c.bin', size: 1024 }
		]} />);
		expect(document.body.textContent).toContain('500 B'); // toFixed(0)
		expect(document.body.textContent).toContain('2.0 KB'); // toFixed(1)
		expect(document.body.textContent).toContain('Boom'); // file.error over 'Failed'
		expect(document.querySelector('[data-status="error"]')).toBeTruthy();
		expect(document.querySelector('[role=progressbar]')).toBeTruthy(); // progress < 100
		document.querySelector('[aria-label="Remove c.bin"]').click();
		expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ name: 'c.bin' }), 2);
	});

	it('PasswordInput strength meter paints across scores', () => {
		add(<PasswordInput showStrength label="Pw" />);
		const input = document.querySelector('[data-uele-password] input');
		const meter = document.querySelector('[aria-label="Password strength"]');
		type(input, 'abcdefgh'); // length only: score 1
		expect(meter.getAttribute('aria-valuenow')).toBe('1');
		type(input, 'Abcdef1!'); // all four signals: score 4
		expect(meter.getAttribute('aria-valuenow')).toBe('4');
	});
});
