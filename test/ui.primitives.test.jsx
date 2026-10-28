/** @jsxImportSource uele */
/**
 * The expanded `uele/ui` primitives (everything past the original twelve):
 * forms, layout, typography, data display, navigation, disclosure and
 * overlays — driven as JSX with live signal props, controlled and
 * uncontrolled, exactly as the README shows them.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preactSignals } from 'uele/signals/preact';
import { alienSignals } from 'uele/signals/alien-signals';
import { signal } from '@preact/signals-core';
import * as UI from 'uele/ui';
import {
	RadioGroup, Radio, Switch, Slider, Rating, NumberInput, SearchInput, OTPInput, TagInput,
	FileInput, Dropzone, Combobox, Grid, Container, Center, Spacer, Separator, AspectRatio,
	ScrollArea, Heading, Text, Link, Kbd, Code, Blockquote, List, ListItem, Badge, Avatar,
	Skeleton, Spinner, Alert, Progress, Stat, Empty, Table, TableHead, TableBody, TableRow,
	TableHeader, TableCell, Breadcrumb, Pagination, paginationRange, TabList, Tab, TabPanel,
	Tabs, Accordion, Collapsible, Dialog, Drawer, Popover, Tooltip, Menu, Toast, Toaster,
	Stepper, Carousel, FieldHint, FieldError, Button
} from 'uele/ui';

beforeEach(() => {
	preactSignals();
	document.body.innerHTML = '';
});

const key = (el, k, opts = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));

describe('the expanded catalogue', () => {
	it('exports 35+ primitives (60+ including aliases and helpers)', () => {
		const names = Object.keys(UI);
		expect(names.length).toBeGreaterThanOrEqual(60);
		for (const name of ['Pagination', 'OTPInput', 'Tabs', 'Dialog', 'Accordion', 'Combobox', 'Rating', 'Stepper', 'Carousel', 'Breadcrumb', 'Toaster', 'paginationRange'])
			expect(names, name).toContain(name);
	});
});

describe('form primitives', () => {
	it('RadioGroup is two-way via model and renders options', () => {
		const choice = signal('a');
		const group = <RadioGroup model={choice} name="pick" options={['a', { value: 'b', label: 'Bee' }]} />;
		document.body.append(group);
		const inputs = group.querySelectorAll('input[type=radio]');
		expect(group.getAttribute('role')).toBe('radiogroup');
		expect(inputs.length).toBe(2);
		expect(inputs[0].checked).toBe(true);
		inputs[1].click();
		expect(choice.value).toBe('b');
		expect(inputs[1].checked).toBe(true);
		choice.value = 'a';
		expect(inputs[0].checked).toBe(true);
	});

	it('Switch toggles a boolean model with switch semantics', () => {
		const on = signal(false);
		const el = <Switch model={on} label="Wi-Fi" />;
		document.body.append(el);
		expect(el.getAttribute('role')).toBe('switch');
		expect(el.getAttribute('aria-checked')).toBe('false');
		expect(el.dataset.state).toBe('unchecked');
		el.click();
		expect(on.value).toBe(true);
		expect(el.getAttribute('aria-checked')).toBe('true');
		expect(el.dataset.state).toBe('checked');
		el.click();
		expect(on.value).toBe(false);
	});

	it('Slider writes numbers back to the model', () => {
		const volume = signal(10);
		const el = <Slider model={volume} min={0} max={100} aria-label="Volume" />;
		document.body.append(el);
		expect(el.value).toBe('10');
		el.value = '42';
		el.dispatchEvent(new Event('input'));
		expect(volume.value).toBe(42);
		volume.value = 7;
		expect(el.value).toBe('7');
	});

	it('Rating selects stars and follows the keyboard', () => {
		const score = signal(0);
		const el = <Rating model={score} />;
		document.body.append(el);
		const stars = el.querySelectorAll('button');
		expect(stars.length).toBe(5);
		stars[3].click();
		expect(score.value).toBe(4);
		expect(stars[3].textContent).toBe('★');
		expect(stars[4].textContent).toBe('☆');
		expect(stars[3].getAttribute('aria-checked')).toBe('true');
		key(el, 'ArrowRight');
		expect(score.value).toBe(5);
		key(el, 'ArrowLeft');
		expect(score.value).toBe(4);
	});

	it('NumberInput steps, clamps and accepts typing', () => {
		const count = signal(1);
		const el = <NumberInput model={count} min={0} max={3} />;
		document.body.append(el);
		const [dec, inc] = el.querySelectorAll('button');
		const input = el.querySelector('input');
		inc.click();
		expect(count.value).toBe(2);
		inc.click();
		inc.click();
		expect(count.value).toBe(3);
		dec.click();
		expect(count.value).toBe(2);
		input.value = '0';
		input.dispatchEvent(new Event('input'));
		expect(count.value).toBe(0);
	});

	it('SearchInput clears through the × button', () => {
		const query = signal('uele');
		const searches = [];
		const el = <SearchInput model={query} onSearch={(v) => searches.push(v)} />;
		document.body.append(el);
		const input = el.querySelector('input');
		expect(input.value).toBe('uele');
		el.querySelector('button').click();
		expect(query.value).toBe('');
		expect(searches.at(-1)).toBe('');
	});

	it('OTPInput advances, accepts paste and completes', () => {
		const code = signal('');
		const done = vi.fn();
		const el = <OTPInput length={4} model={code} onComplete={done} />;
		document.body.append(el);
		const inputs = el.querySelectorAll('input');
		expect(inputs.length).toBe(4);
		inputs[0].value = '1';
		inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
		expect(code.value).toBe('1');
		expect(document.activeElement).toBe(inputs[1]);

		const paste = new Event('paste', { bubbles: true, cancelable: true });
		paste.clipboardData = { getData: () => '234' };
		inputs[1].dispatchEvent(paste);
		expect(code.value.length).toBeGreaterThanOrEqual(3);

		code.value = '';
		inputs.forEach((input, i) => {
			input.value = String(i + 5);
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(code.value).toBe('5678');
		expect(done).toHaveBeenCalledWith('5678');
	});

	it('TagInput adds on Enter, removes with × and Backspace', () => {
		const tags = signal(['one']);
		const el = <TagInput model={tags} />;
		document.body.append(el);
		const input = el.querySelector('input');
		expect(el.querySelectorAll('[data-tag]').length).toBe(1);
		input.value = 'two';
		key(input, 'Enter');
		expect(tags.value).toEqual(['one', 'two']);
		expect(el.querySelectorAll('[data-tag]').length).toBe(2);
		el.querySelector('[data-tag="one"] button').click();
		expect(tags.value).toEqual(['two']);
		key(input, 'Backspace');
		expect(tags.value).toEqual([]);
	});

	it('FileInput and Dropzone report picked/dropped files', () => {
		const picked = vi.fn();
		const dropped = vi.fn();
		const file = <FileInput onFiles={picked} label="Upload" />;
		const zone = <Dropzone onFiles={dropped}>Drop it</Dropzone>;
		document.body.append(file, zone);
		const input = file.querySelector('input[type=file]');
		const f = new File(['x'], 'a.txt', { type: 'text/plain' });
		Object.defineProperty(input, 'files', { value: [f], configurable: true });
		input.dispatchEvent(new Event('change'));
		expect(picked).toHaveBeenCalledWith([f]);

		const drop = new Event('drop', { bubbles: true, cancelable: true });
		drop.dataTransfer = { files: [f] };
		zone.dispatchEvent(drop);
		expect(dropped).toHaveBeenCalledWith([f]);
	});

	it('Combobox filters, selects and closes', () => {
		const fruit = signal('');
		const el = <Combobox model={fruit} options={['Apple', 'Banana', 'Cherry']} placeholder="Fruit" />;
		document.body.append(el);
		const input = el.querySelector('input');
		const list = el.querySelector('ul');
		expect(list.hidden).toBe(true);
		input.focus();
		expect(list.hidden).toBe(false);
		input.value = 'an';
		input.dispatchEvent(new Event('input'));
		const visible = [...list.querySelectorAll('li')].map((li) => li.textContent);
		expect(visible).toEqual(['Banana']);
		list.querySelector('li').click();
		expect(fruit.value).toBe('Banana');
		expect(list.hidden).toBe(true);
	});

	it('FieldHint and FieldError render small text, error announces', () => {
		expect((<FieldHint>hint</FieldHint>).tagName).toBe('SPAN');
		const err = <FieldError>Required</FieldError>;
		expect(err.getAttribute('role')).toBe('alert');
		expect(err.textContent).toBe('Required');
		const btn = <Button variant="solid" size="sm">Save</Button>;
		expect(btn.dataset.variant).toBe('solid');
		expect(btn.dataset.size).toBe('sm');
	});
});

describe('layout and typography', () => {
	it('Grid, Container, Center, Spacer, Separator, AspectRatio, ScrollArea', () => {
		const grid = <Grid columns={3}>x</Grid>;
		expect(grid.style.display).toBe('grid');
		expect(grid.style.gridTemplateColumns).toContain('repeat(3');
		expect((<Container>y</Container>).style.maxWidth).toBe('72rem');
		expect((<Center>z</Center>).style.justifyContent).toBe('center');
		expect((<Spacer />).style.flex).toContain('1');
		const sep = <Separator orientation="vertical" decorative={false} />;
		expect(sep.dataset.orientation).toBe('vertical');
		expect(sep.getAttribute('role')).toBe('separator');
		expect((<AspectRatio ratio="4/3" />).style.aspectRatio).toBe('4/3');
		expect((<ScrollArea>body</ScrollArea>).style.overflow).toBe('auto');
	});

	it('Heading, Text, Link, Kbd, Code, Blockquote, List', () => {
		expect((<Heading level={3}>T</Heading>).tagName).toBe('H3');
		expect((<Heading level={9}>T</Heading>).tagName).toBe('H6');
		expect((<Text as="span">t</Text>).tagName).toBe('SPAN');
		const link = <Link href="/docs">docs</Link>;
		expect(link.getAttribute('href')).toBe('/docs');
		expect((<Kbd>Ctrl</Kbd>).tagName).toBe('KBD');
		expect((<Code>x()</Code>).tagName).toBe('CODE');
		expect((<Blockquote>q</Blockquote>).tagName).toBe('BLOCKQUOTE');
		const list = (
			<List ordered>
				<ListItem>one</ListItem>
			</List>
		);
		expect(list.tagName).toBe('OL');
		expect(list.querySelector('li').textContent).toBe('one');
	});
});

describe('data display', () => {
	it('Badge, Avatar, Skeleton, Spinner, Stat, Empty', () => {
		const badge = <Badge tone="danger">3</Badge>;
		expect(badge.dataset.tone).toBe('danger');
		expect(badge.textContent).toBe('3');
		expect((<Avatar name="Ada Lovelace" />).textContent).toBe('AL');
		expect((<Avatar src="/a.png" alt="Ada" />).tagName).toBe('IMG');
		expect((<Skeleton />).getAttribute('aria-hidden')).toBe('true');
		expect((<Spinner />).getAttribute('role')).toBe('status');
		const stat = <Stat label="Users" value={42} help="+4 today" />;
		expect(stat.textContent).toContain('Users');
		expect(stat.textContent).toContain('42');
		expect((<Empty title="Nothing here" description="Add one" />).textContent).toContain('Nothing here');
	});

	it('Alert announces danger, Progress follows its value cell', () => {
		expect((<Alert tone="danger" title="Boom">bad</Alert>).getAttribute('role')).toBe('alert');
		expect((<Alert tone="info">fyi</Alert>).getAttribute('role')).toBe('status');
		const value = signal(40);
		const bar = <Progress value={value} />;
		document.body.append(bar);
		expect(bar.getAttribute('aria-valuenow')).toBe('40');
		expect(bar.querySelector('[data-uele-progress-bar]').style.width).toBe('40%');
		value.value = 80;
		expect(bar.getAttribute('aria-valuenow')).toBe('80');
		expect(bar.querySelector('[data-uele-progress-bar]').style.width).toBe('80%');
	});

	it('Table family renders table semantics', () => {
		const table = (
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Name</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>Ada</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		);
		expect(table.tagName).toBe('TABLE');
		expect(table.querySelector('th').textContent).toBe('Name');
		expect(table.querySelector('td').textContent).toBe('Ada');
	});
});

describe('navigation', () => {
	it('Breadcrumb marks the last item as the current page', () => {
		const el = <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'UI' }]} />;
		expect(el.getAttribute('aria-label')).toBe('Breadcrumb');
		expect(el.querySelectorAll('a').length).toBe(2);
		expect(el.querySelector('[aria-current="page"]').textContent).toBe('UI');
	});

	it('paginationRange windows the pages', () => {
		expect(paginationRange(1, 1)).toEqual([1]);
		expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(paginationRange(1, 10)).toEqual([1, 2, '…', 10]);
		expect(paginationRange(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10]);
		expect(paginationRange(10, 10)).toEqual([1, '…', 9, 10]);
		expect(UI.paginationRange).toBe(paginationRange);
	});

	it('Pagination navigates, disables at the ends and reports onChange', () => {
		const page = signal(1);
		const changes = [];
		const el = <Pagination page={page} totalPages={10} onChange={(p) => changes.push(p)} />;
		document.body.append(el);
		const prev = el.querySelector('[aria-label="Go to previous page"]');
		const next = el.querySelector('[aria-label="Go to next page"]');
		expect(prev.disabled).toBe(true);
		expect(el.querySelector('[data-page="1"]').getAttribute('aria-current')).toBe('page');
		next.click();
		expect(page.value).toBe(2);
		el.querySelector('[data-page="10"]').click();
		expect(page.value).toBe(10);
		expect(next.disabled).toBe(true);
		prev.click();
		expect(page.value).toBe(9);
		expect(changes).toEqual([2, 10, 9]);
	});

	it('Pagination also derives pages from total + pageSize, uncontrolled', () => {
		const el = <Pagination total={95} pageSize={10} defaultPage={3} />;
		document.body.append(el);
		expect(el.querySelectorAll('[data-page]').length).toBeGreaterThan(3);
		expect(el.querySelector('[data-page="3"]').getAttribute('aria-current')).toBe('page');
		el.querySelector('[aria-label="Go to next page"]').click();
		expect(el.querySelector('[data-page="4"]').getAttribute('aria-current')).toBe('page');
	});
});

describe('tabs, accordion, collapsible', () => {
	const items = [
		{ value: 'a', label: 'Alpha', content: 'panel A' },
		{ value: 'b', label: 'Beta', content: 'panel B' }
	];

	it('Tabs (data-driven) switch panels through the model', () => {
		const tab = signal('a');
		const el = <Tabs items={items} model={tab} />;
		document.body.append(el);
		const tabs = el.querySelectorAll('[role=tab]');
		expect(tabs.length).toBe(2);
		expect(tabs[0].getAttribute('aria-selected')).toBe('true');
		expect(el.querySelector('[role=tabpanel]').textContent).toBe('panel A');
		tabs[1].click();
		expect(tab.value).toBe('b');
		expect(tabs[1].getAttribute('aria-selected')).toBe('true');
		expect(el.querySelector('[role=tabpanel]').textContent).toBe('panel B');
	});

	it('Tabs (compositional) share a selected cell', () => {
		const selected = signal('a');
		const el = (
			<Tabs>
				<TabList>
					<Tab selected={selected} value="a">A</Tab>
					<Tab selected={selected} value="b">B</Tab>
				</TabList>
				<TabPanel selected={selected} value="a">first</TabPanel>
				<TabPanel selected={selected} value="b">second</TabPanel>
			</Tabs>
		);
		document.body.append(el);
		const panels = el.querySelectorAll('[role=tabpanel]');
		expect(panels[0].hidden).toBe(false);
		expect(panels[1].hidden).toBe(true);
		el.querySelectorAll('[role=tab]')[1].click();
		expect(selected.value).toBe('b');
		expect(panels[0].hidden).toBe(true);
		expect(panels[1].hidden).toBe(false);
	});

	it('Accordion opens one item at a time (single) or many (multiple)', () => {
		const el = <Accordion items={items} />;
		document.body.append(el);
		const buttons = el.querySelectorAll('button[aria-expanded]');
		const regions = el.querySelectorAll('[role=region]');
		expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
		buttons[1].click();
		expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
		expect(regions[0].hidden).toBe(true);
		expect(regions[1].hidden).toBe(false);

		const open = signal([]);
		const multi = <Accordion items={items} type="multiple" model={open} />;
		document.body.append(multi);
		multi.querySelectorAll('button[aria-expanded]')[0].click();
		multi.querySelectorAll('button[aria-expanded]')[1].click();
		expect(open.value.sort()).toEqual(['a', 'b']);
	});

	it('Collapsible toggles its region', () => {
		const el = <Collapsible trigger="More">details</Collapsible>;
		document.body.append(el);
		const region = el.querySelector('div');
		expect(el.querySelector('div[hidden]')).toBeTruthy();
		el.querySelector('button').click();
		expect(region.hidden).toBe(false);
		expect(el.querySelector('button').getAttribute('aria-expanded')).toBe('true');
	});
});

describe('overlays', () => {
	it('Dialog opens from its trigger, closes on Escape and ×', () => {
		const open = signal(false);
		const el = <Dialog model={open} trigger="Open dialog" title="Hello" description="A modal">body text</Dialog>;
		document.body.append(el);
		expect(el.querySelector('[role=dialog]')).toBe(null);
		el.querySelector('button').click();
		expect(open.value).toBe(true);
		const panel = el.querySelector('[role=dialog]');
		expect(panel).toBeTruthy();
		expect(panel.textContent).toContain('Hello');
		expect(panel.textContent).toContain('body text');
		key(panel, 'Escape');
		expect(open.value).toBe(false);
		el.querySelector('button').click();
		el.querySelector('[aria-label="Close"]').click();
		expect(open.value).toBe(false);
	});

	it('Drawer is a Dialog with a side', () => {
		const open = signal(true);
		const el = <Drawer model={open} side="left" title="Menu">links</Drawer>;
		document.body.append(el);
		expect(el.querySelector('[role=dialog]').dataset.side).toBe('left');
	});

	it('Popover toggles its panel; Tooltip shows on hover', () => {
		const pop = <Popover trigger="Info">pop body</Popover>;
		document.body.append(pop);
		expect(pop.querySelector('[role=dialog]')).toBe(null);
		pop.querySelector('button').click();
		expect(pop.querySelector('[role=dialog]').textContent).toBe('pop body');
		pop.querySelector('button').click();
		expect(pop.querySelector('[role=dialog]')).toBe(null);

		const tip = (
			<Tooltip label="Helpful">
				<button>hover me</button>
			</Tooltip>
		);
		document.body.append(tip);
		const bubble = tip.querySelector('[role=tooltip]');
		expect(bubble.hidden).toBe(true);
		tip.dispatchEvent(new MouseEvent('mouseenter'));
		expect(bubble.hidden).toBe(false);
		tip.dispatchEvent(new MouseEvent('mouseleave'));
		expect(bubble.hidden).toBe(true);
	});

	it('Menu selects an item and closes', () => {
		const picked = [];
		const el = <Menu label="Actions" items={[{ label: 'Edit', onSelect: () => picked.push('edit') }, { label: 'Delete' }]} />;
		document.body.append(el);
		el.querySelector('button').click();
		const items = el.querySelectorAll('[role=menuitem]');
		expect(items.length).toBe(2);
		items[0].click();
		expect(picked).toEqual(['edit']);
		expect(el.querySelector('[role=menu]')).toBe(null);
	});

	it('Toast dismisses itself; Toaster renders a live stack', () => {
		const open = signal(true);
		const toast = <Toast model={open} title="Saved" description="All good" duration={0} />;
		document.body.append(toast);
		expect(toast.textContent).toContain('Saved');
		toast.querySelector('[aria-label="Dismiss"]').click();
		expect(open.value).toBe(false);
		expect(toast.querySelector('[data-uele-toast]')).toBe(null);

		const toasts = signal([{ id: 1, title: 'One' }, { id: 2, title: 'Two' }]);
		const stack = <Toaster toasts={toasts} />;
		document.body.append(stack);
		expect(stack.querySelectorAll('[data-uele-toast]').length).toBe(2);
		stack.querySelector('[aria-label="Dismiss"]').click();
		expect(toasts.value.length).toBe(1);
	});
});

describe('stepper and carousel', () => {
	it('Stepper tracks complete/current/upcoming and jumps on click', () => {
		const current = signal(0);
		const el = <Stepper steps={[{ label: 'Cart' }, { label: 'Pay' }, { label: 'Done' }]} model={current} />;
		document.body.append(el);
		const steps = el.querySelectorAll('li');
		expect(steps[0].dataset.state).toBe('current');
		expect(steps[1].dataset.state).toBe('upcoming');
		steps[2].querySelector('button').click();
		expect(current.value).toBe(2);
		expect(steps[0].dataset.state).toBe('complete');
		expect(steps[2].dataset.state).toBe('current');
	});

	it('Carousel pages through items with buttons and dots', () => {
		const index = signal(0);
		const el = <Carousel items={['one', 'two', 'three']} model={index} />;
		document.body.append(el);
		expect(el.querySelector('[data-uele-carousel-track]').textContent).toBe('one');
		el.querySelector('[aria-label="Next slide"]').click();
		expect(index.value).toBe(1);
		expect(el.querySelector('[data-uele-carousel-track]').textContent).toBe('two');
		el.querySelector('[aria-label="Go to slide 3"]').click();
		expect(el.querySelector('[data-uele-carousel-track]').textContent).toBe('three');
		el.querySelector('[aria-label="Next slide"]').click();
		expect(el.querySelector('[data-uele-carousel-track]').textContent).toBe('one');
	});
});

describe('works on other signal libraries too (alien-signals)', () => {
	it('Pagination and Tabs run unchanged on function signals', async () => {
		alienSignals();
		const [{ signal: alienSignal }, { read }] = [await import('alien-signals'), await import('uele/reactive')];
		const page = alienSignal(1);
		const el = Pagination({ page, totalPages: 5 });
		document.body.append(el);
		el.querySelector('[aria-label="Go to next page"]').click();
		expect(read(page)).toBe(2);

		const tab = alienSignal('a');
		const tabs = Tabs({
			model: tab,
			items: [
				{ value: 'a', label: 'A', content: 'first' },
				{ value: 'b', label: 'B', content: 'second' }
			]
		});
		document.body.append(tabs);
		tabs.querySelectorAll('[role=tab]')[1].click();
		expect(read(tab)).toBe('b');
		expect(tabs.querySelector('[role=tabpanel]').textContent).toBe('second');
	});
});
