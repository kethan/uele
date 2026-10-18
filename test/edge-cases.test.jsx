/** @jsxImportSource uele */
/**
 * Edge cases the behavioural suites did not reach, added after a coverage
 * audit (uncovered statements/branches in `uele/reactive`, `uele/ui`,
 * `uele/hooks`, `uele/themes`, `uele/flow` and `uele/router`):
 * defensive write targets, Toggle in group-membership mode, standalone
 * Radio, Lightbox keyboard navigation, OTP paste/keyboard edges, async
 * ErrorBoundary rejection, router fetch failure + link-interception guards,
 * clipboard fallback without `navigator.clipboard`, title restore, history
 * capacity bounds, partial-theme cssVars and variant resolution.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { write, read } from 'uele/reactive';
import { Toggle, Radio, Lightbox, OTPInput } from 'uele/ui';
import { ErrorBoundary, Portal } from 'uele/flow';
import { createRouter, useRouter } from 'uele/router';
import { useClipboard, useTitle, useHistory } from 'uele/hooks';
import { cssVars, cx, variants, styled } from 'uele/themes';

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.title = 'before';
	window.history.pushState(null, '', '/');
});

/* ------------------------------------------------- reactive write targets */

describe('reactive write() defensive targets', () => {
	it('ignores nullish and primitive targets instead of throwing', () => {
		expect(() => write(null, 1)).not.toThrow();
		expect(() => write(undefined, 1)).not.toThrow();
		expect(() => write(42, 1)).not.toThrow();
		expect(() => write('cell', 1)).not.toThrow();
	});

	it('writes through every explicit cell shape (.set/.next/.setState/.write)', () => {
		const seen = [];
		write({ set: (v) => seen.push(['set', v]) }, 1);
		write({ next: (v) => seen.push(['next', v]) }, 2);
		write({ setState: (v) => seen.push(['setState', v]) }, 3);
		write({ write: (v) => seen.push(['write', v]) }, 4);
		expect(seen).toEqual([['set', 1], ['next', 2], ['setState', 3], ['write', 4]]);
	});

	it('writes a plain { value } box', () => {
		const box = { value: 1 };
		write(box, 9);
		expect(box.value).toBe(9);
	});
});

/* ------------------------------------------------------- Toggle in a group */

describe('Toggle with value+selected (group membership mode)', () => {
	it('scalar selected: press selects, press again clears to ""', async () => {
		const selected = signal('');
		const changes = [];
		const node = (
			<div>
				<Toggle value="a" selected={selected} onChange={(v) => changes.push(v)}>A</Toggle>
				<Toggle value="b" selected={selected}>B</Toggle>
			</div>
		);
		document.body.append(node);
		const [a, b] = node.querySelectorAll('button');
		a.click();
		await tick();
		expect(selected.value).toBe('a');
		expect(a.getAttribute('aria-pressed')).toBe('true');
		expect(b.getAttribute('aria-pressed')).toBe('false');
		a.click();
		await tick();
		expect(selected.value).toBe('');
		expect(changes).toEqual(['a', '']);
	});

	it('array selected: presses add and remove membership', async () => {
		const selected = signal([]);
		const node = (
			<div>
				<Toggle value="a" selected={selected}>A</Toggle>
				<Toggle value="b" selected={selected}>B</Toggle>
			</div>
		);
		document.body.append(node);
		const [a, b] = node.querySelectorAll('button');
		a.click();
		b.click();
		await tick();
		expect(selected.value).toEqual(['a', 'b']);
		expect(b.getAttribute('aria-pressed')).toBe('true');
		a.click();
		await tick();
		expect(selected.value).toEqual(['b']);
		expect(a.getAttribute('aria-pressed')).toBe('false');
	});
});

/* --------------------------------------------------------- standalone Radio */

describe('Radio outside a RadioGroup', () => {
	it('renders a labelled input and reports its value on change', async () => {
		const onChange = vi.fn();
		document.body.append(<Radio value="pro" label="Pro plan" onChange={onChange} />);
		const input = document.body.querySelector('input[type="radio"]');
		expect(input.closest('label').textContent).toContain('Pro plan');
		input.click();
		await tick();
		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls[0][0]).toBe('pro');
	});

	it('renders a bare input when there is no label or children', () => {
		const node = <Radio value="x" />;
		expect(node.tagName).toBe('INPUT');
		document.body.append(node);
		expect(document.body.querySelector('label')).toBeNull();
	});
});

/* -------------------------------------------------------------- Lightbox */

describe('Lightbox keyboard navigation', () => {
	it('arrows move (wrapping at both ends) and Escape closes', async () => {
		const images = [{ src: 'a.png' }, { src: 'b.png' }, { src: 'c.png' }];
		const node = <Lightbox images={images} />;
		document.body.append(node);
		node.querySelectorAll('button')[0].click();
		await tick();
		const shown = () => node.querySelector('[data-uele-lightbox-img]')?.getAttribute('src');
		expect(shown()).toBe('a.png');

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
		await tick();
		expect(shown()).toBe('c.png'); // wraps to the last image

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
		await tick();
		expect(shown()).toBe('a.png'); // and back around

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await tick();
		expect(node.querySelector('[role="dialog"]')).toBeNull();
	});
});

/* -------------------------------------------------------------- OTPInput */

describe('OTPInput paste and keyboard edges', () => {
	it('paste fills every box and completes; non-digits are stripped', async () => {
		const onComplete = vi.fn();
		const node = <OTPInput length={4} onComplete={onComplete} />;
		document.body.append(node);
		const host = node.querySelector('[data-uele-otp]') || node;
		const paste = new Event('paste', { bubbles: true });
		Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '9x8y7z6' } });
		host.dispatchEvent(paste);
		await tick();
		const inputs = [...node.querySelectorAll('input')];
		// paste goes through writeDigit, which strips non-digits but keeps order
		expect(onComplete).toHaveBeenCalledWith('9876');
		expect(inputs.map((i) => i.value).join('')).toBe('9876');
	});

	it('backspace on an empty box moves focus to the previous box', async () => {
		const node = <OTPInput length={3} />;
		document.body.append(node);
		const inputs = [...node.querySelectorAll('input')];
		inputs[0].value = '5';
		inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
		await tick();
		inputs[2].focus();
		inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
		expect(document.activeElement).toBe(inputs[1]);
		inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(document.activeElement).toBe(inputs[2]);
	});
});

/* ---------------------------------------------------------- ErrorBoundary */

describe('ErrorBoundary async rejection', () => {
	it('renders the fallback and calls onError when a child promise rejects', async () => {
		const seen = [];
		const node = (
			<ErrorBoundary fallback={(e) => <u>{e.message}</u>} onError={(e) => seen.push(e.message)}>
				{() => Promise.reject(new Error('late boom'))}
			</ErrorBoundary>
		);
		document.body.append(node);
		await tick();
		await tick();
		expect(node.textContent).toContain('late boom');
		expect(seen).toEqual(['late boom']);
	});
});

/* ----------------------------------------------------------------- router */

describe('useRouter failure and interception guards', () => {
	const build = () => {
		const app = createRouter();
		app.get('/', () => <h1>Home</h1>);
		app.get('/about', () => <h1>About</h1>);
		app.get('/boom', () => Promise.reject(new Error('network down')));
		return app;
	};

	it('renders notFound when the route fetch rejects', async () => {
		const [view, , go] = useRouter(build(), '', <h1>404</h1>);
		const node = <main>{view}</main>;
		document.body.append(node);
		await go('/boom');
		expect(node.textContent).toBe('404');
	});

	it('intercepts plain internal clicks only', async () => {
		const [view, linkProps] = useRouter(build(), '', <h1>404</h1>);
		const node = (
			<main {...linkProps()}>
				<a href="https://example.com/page">external</a>
				<a href="/about" target="_blank">new tab</a>
				<a href="/about">internal</a>
				<span>plain</span>
			</main>
		);
		document.body.append(node);
		await tick();
		const click = (el, opts = {}) => {
			// cancelable: real clicks are; without it preventDefault() is a no-op
			const e = new MouseEvent('click', { bubbles: true, cancelable: true, ...opts });
			el.dispatchEvent(e);
			return e;
		};
		const [external, newTab, internal] = node.querySelectorAll('a');

		expect(click(node.querySelector('span')).defaultPrevented).toBe(false);
		expect(click(external).defaultPrevented).toBe(false);
		expect(click(newTab).defaultPrevented).toBe(false);
		expect(click(internal, { ctrlKey: true }).defaultPrevented).toBe(false);
		expect(window.location.pathname).toBe('/');

		expect(click(internal).defaultPrevented).toBe(true);
		await tick();
		expect(window.location.pathname).toBe('/about');
	});
});

/* ------------------------------------------------------------------ hooks */

describe('hook edges', () => {
	it('useClipboard falls back when navigator.clipboard is unavailable', async () => {
		const { copied, copy } = useClipboard({ timeout: 40 });
		expect(await copy('hello')).toBe(true);
		expect(read(copied)).toBe(true);
		expect(document.querySelector('textarea')).toBeNull(); // fallback cleans up after itself
		await new Promise((r) => setTimeout(r, 60));
		expect(read(copied)).toBe(false);
	});

	it('useTitle applies immediately and restore() brings the old title back', () => {
		const t = useTitle('Dashboard');
		expect(document.title).toBe('Dashboard');
		t.restore();
		expect(document.title).toBe('before');
	});

	it('useHistory honours capacity, no-ops on identical values, and bounds undo/redo', () => {
		const hist = useHistory('a', 2);
		hist.set('b');
		hist.set('c');
		hist.set('d');
		expect(hist.past()).toEqual(['b', 'c']); // capacity 2 trims the oldest entry
		hist.set('d'); // identical value: no history entry
		expect(hist.past()).toEqual(['b', 'c']);

		hist.undo();
		hist.undo();
		expect(read(hist.value)).toBe('b');
		expect(read(hist.canUndo)).toBe(false);
		hist.undo(); // at the bound: no-op
		expect(read(hist.value)).toBe('b');

		hist.redo();
		expect(read(hist.value)).toBe('c');
		hist.set('z'); // a fresh write clears the redo stack
		expect(read(hist.canRedo)).toBe(false);
		expect(hist.future()).toEqual([]);
	});
});

/* ----------------------------------------------------------------- themes */

describe('theme helper edges', () => {
	it('cssVars merges a partial theme over the defaults it does not mention', () => {
		const vars = cssVars({ colors: { accent: '#123456' } });
		expect(vars['--uele-accent']).toBe('#123456'); // the override wins
		expect(vars['--uele-bg']).toBeTruthy(); // unspecified colors fall back to the base theme
		expect(vars['--uele-radius']).toBeTruthy(); // and so do radii from the base theme
	});

	it('cx flattens strings, arrays, object maps, falsy parts and thunks', () => {
		expect(cx('a', ['b', ['c']], { d: true, e: false }, null, undefined, () => 'f')).toBe('a b c d f');
	});

	it('variants resolves defaults, boolean variants and compound rules', () => {
		const chip = variants({
			base: 'chip',
			variants: { tone: { hot: 'chip-hot', cold: 'chip-cold' }, on: { true: 'is-on', false: 'is-off' } },
			defaultVariants: { tone: 'cold' },
			compoundVariants: [{ tone: 'hot', on: true, class: 'chip-hot-on' }]
		});
		expect(chip({})).toBe('chip chip-cold');
		expect(chip({ tone: 'hot', on: true })).toBe('chip chip-hot is-on chip-hot-on');
		expect(chip({ on: false })).toBe('chip chip-cold is-off');
	});

	it('styled() builds a component that merges variant and ad-hoc classes', () => {
		const Chip = styled('span', {
			base: 'chip',
			variants: { tone: { hot: 'chip-hot' } },
			defaultVariants: { tone: 'hot' }
		});
		const node = Chip({ class: 'extra', children: 'x' });
		document.body.append(node);
		expect(node.tagName).toBe('SPAN');
		expect(node.getAttribute('class')).toBe('chip chip-hot extra');
		expect(node.textContent).toBe('x');
	});
});

/* ------------------------------------------------------------------ Portal */

describe('Portal target edges', () => {
	it('falls back to document.body when the selector matches nothing', () => {
		const root = document.createElement('div');
		document.body.append(root);
		root.append(<Portal mount="#no-such-target"><b>into body</b></Portal>);
		const b = document.body.querySelector('b');
		expect(b.textContent).toBe('into body');
		expect(b.parentElement).toBe(document.body);
	});
});
