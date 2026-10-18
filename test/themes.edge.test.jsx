/** @jsxImportSource uele */
/**
 * `uele/themes` edges the main suite did not reach: raw/partial/unknown
 * accents, unknown radius and appearance names, sparse hand-rolled theme
 * objects through `cssVars`, OS scheme stubbing, imperative `applyTheme`
 * on odd targets, and the string/array form of `styled()`.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import { read } from 'uele/reactive';
import {
	accents, themes, createTheme, resolveTheme, cssVars, stylesheet,
	ThemeProvider, useTheme, cx, variants, styled, applyTheme, prefersColorScheme
} from 'uele/themes';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	localStorage.clear();
});
afterEach(() => {
	delete window.matchMedia;
});

describe('createTheme input edges', () => {
	it('expands a raw CSS color accent into a scale', () => {
		const t = createTheme({ accent: '#ff6600' });
		expect(t.colors.accent).toBe('#ff6600');
		expect(t.colors.accentHover).toBe('#ff6600');
		expect(t.colors.accentText).toBe('#ffffff');
		expect(t.accent).toBe('#ff6600');
	});

	it('merges a partial accent object over the blue scale and names it custom', () => {
		const t = createTheme({ accent: { accent: '#111111' } });
		expect(t.colors.accent).toBe('#111111');
		expect(t.colors.accentHover).toBe(accents.blue.accentHover);
		expect(t.accent).toBe('custom');
		expect(t.name).toBe('light-custom');
	});

	it('falls back to medium radii for an unknown radius name', () => {
		expect(createTheme({ radius: 'enormous' }).radii).toEqual(createTheme({ radius: 'medium' }).radii);
		expect(createTheme({ radius: 'enormous' }).radius).toBe('enormous');
	});

	it('object radii override individual tokens over the medium base', () => {
		const t = createTheme({ radii: { radiusSm: '1px' } });
		expect(t.radii.radiusSm).toBe('1px');
		expect(t.radii.radiusMd).toBe('10px');
	});

	it('falls back to light neutrals for an unknown appearance', () => {
		const t = createTheme({ appearance: 'sepia' });
		expect(t.colors.bg).toBe(themes.light.colors.bg);
	});

	it('compact density shrinks the control height', () => {
		const t = createTheme({ density: 'compact' });
		expect(t.control.controlHeight).toBe('2rem');
		expect(t.density).toBe('compact');
	});

	it('a non-string radius is reported as custom and uses medium tokens (or given radii)', () => {
		const plain = createTheme({ radius: null });
		expect(plain.radius).toBe('custom');
		expect(plain.radii).toEqual(createTheme({ radius: 'medium' }).radii);
		const custom = createTheme({ radius: null, radii: { radiusSm: '7px' } });
		expect(custom.radii.radiusSm).toBe('7px');
		expect(custom.radii.radiusMd).toBe('10px');
	});

	it('an explicit name wins over the generated one', () => {
		expect(createTheme({ name: 'brand' }).name).toBe('brand');
	});

	it('merge replaces (never deep-merges) non-plain overrides and unknown groups', () => {
		const t = createTheme({ font: 'monospace', brand: { hue: 1 } });
		expect(t.font).toBe('monospace'); // a string replaces the font object wholesale
		expect(t.brand).toEqual({ hue: 1 }); // a new token group lands as-is
	});

	it('deep-merges token groups but replaces non-plain values', () => {
		const t = createTheme({ space: { 9: '9rem' }, font: { fontSize: '18px' } });
		expect(t.space[1]).toBe('0.25rem'); // merged, not replaced
		expect(t.space[9]).toBe('9rem');
		expect(t.font.fontSize).toBe('18px');
		expect(t.font.fontFamily).toContain('system-ui');
	});

	it('a preset name string returns a copy of that preset', () => {
		const t = createTheme('dark');
		expect(t).toEqual(themes.dark);
		expect(t).not.toBe(themes.dark);
		expect(createTheme('nope')).toEqual(themes.light);
	});
});

describe('cssVars with sparse hand-rolled themes', () => {
	it('emits only what a colors+radii-complete sparse object defines', () => {
		const vars = cssVars({ colors: { accent: '#111111' }, radii: {} });
		expect(vars).toEqual({ '--uele-accent': '#111111' });
	});

	it('reads shadows from colors or the shadow group, radii token by token', () => {
		const vars = cssVars({
			colors: { shadowSm: '0 0 1px #000' },
			radii: { radiusSm: '2px', radiusFull: '9px' },
			shadow: { shadowLg: '0 0 9px #000' },
			font: { fontSize: '15px' },
			control: { controlHeight: '3rem' },
			density: 'compact',
			fontSizes: { xs: '0.7rem' },
			space: { 1: '1px' }
		});
		expect(vars['--uele-shadow-sm']).toBe('0 0 1px #000');
		expect(vars['--uele-shadow-lg']).toBe('0 0 9px #000');
		expect(vars['--uele-radius-sm']).toBe('2px');
		expect(vars['--uele-radius-full']).toBe('9px');
		expect(vars['--uele-radius']).toBeUndefined();
		expect(vars['--uele-font-size']).toBe('15px');
		expect(vars['--uele-control-height']).toBe('3rem');
		expect(vars['--uele-density']).toBe('compact');
		expect(vars['--uele-font-size-xs']).toBe('0.7rem');
		expect(vars['--uele-space-1']).toBe('1px');
	});

	it('stylesheet honours a custom selector', () => {
		const css = stylesheet('dark', '.scope');
		expect(css.startsWith('.scope {\n')).toBe(true);
		expect(css).toContain('--uele-bg:');
	});
});

describe('resolveTheme input forms', () => {
	it('resolves cells, thunks, nullish and unknown names', () => {
		const cell = signal(themes.dark);
		expect(resolveTheme(cell)).toBe(themes.dark);
		expect(resolveTheme(() => 'dark')).toBe(themes.dark);
		expect(resolveTheme(null)).toBe(themes.light);
		expect(resolveTheme(undefined, themes.dark)).toBe(themes.dark);
		expect(resolveTheme('nope')).toBe(themes.light);
	});

	it('completes a partial object against its appearance', () => {
		const t = resolveTheme({ appearance: 'dark', colors: { bg: '#000000' } });
		expect(t.colors.bg).toBe('#000000');
		expect(t.colors.text).toBe(themes.dark.colors.text);
		expect(t.radii.radiusMd).toBeTruthy();
	});
});

describe('applyTheme on odd targets', () => {
	it('tolerates null and style-less targets, still returning the theme', () => {
		expect(applyTheme(null, 'dark')).toBe(themes.dark);
		expect(applyTheme({}, 'dark')).toBe(themes.dark);
	});

	it('sets variables and data attributes on a real element', () => {
		const el = document.createElement('section');
		const t = applyTheme(el, 'dark');
		expect(t).toBe(themes.dark);
		expect(el.getAttribute('data-theme')).toBe('dark');
		expect(el.getAttribute('data-appearance')).toBe('dark');
		expect(el.style.getPropertyValue('--uele-bg')).toBe(themes.dark.colors.bg);
	});
});

describe('prefersColorScheme', () => {
	it('is light without matchMedia (jsdom default)', () => {
		expect(prefersColorScheme()).toBe('light');
	});

	it('follows a stubbed dark OS preference, and survives a throwing one', () => {
		window.matchMedia = () => ({ matches: true });
		expect(prefersColorScheme()).toBe('dark');
		window.matchMedia = () => { throw new Error('nope'); };
		expect(prefersColorScheme()).toBe('light');
	});
});

describe('useTheme function updates and toggling from dark', () => {
	it('setTheme accepts an updater; toggle from dark goes light', () => {
		const t = useTheme('dark');
		expect(t.appearance()).toBe('dark');
		t.toggle();
		expect(t.appearance()).toBe('light');
		t.setTheme((current) => (current.appearance === 'light' ? 'dark' : 'light'));
		expect(t.appearance()).toBe('dark');
		expect(t.vars()['--uele-bg']).toBe(themes.dark.colors.bg);
		expect(read(t.theme).name).toBe('dark');
	});
});

describe('cx / variants / styled remaining forms', () => {
	it('cx unwraps cells and thunks and skips empty object values', () => {
		const cell = signal('from-cell');
		expect(cx(cell, () => 'from-thunk', { a: cell, b: 0, c: '' })).toBe('from-cell from-thunk a');
		expect(cx('a', 42, true)).toBe('a'); // non-string primitives contribute nothing
	});

	it('compound variants can condition on a false boolean', () => {
		const chip = variants({
			base: 'chip',
			variants: { on: { true: 'is-on', false: 'is-off' } },
			compoundVariants: [{ on: false, class: 'chip-off-compound' }]
		});
		expect(chip({ on: false })).toBe('chip is-off chip-off-compound');
		expect(chip({ on: true })).toBe('chip is-on');
	});

	it('variants appends class and className props, and className compounds', () => {
		const chip = variants({
			base: 'chip',
			variants: { tone: { hot: 'chip-hot' } },
			compoundVariants: [{ tone: 'hot', className: 'chip-compound' }]
		});
		expect(chip({ tone: 'hot', class: 'extra' })).toBe('chip chip-hot chip-compound extra');
		expect(chip({ tone: 'hot', className: 'more' })).toBe('chip chip-hot chip-compound more');
		expect(chip({})).toBe('chip'); // no default, no prop: group contributes nothing
	});

	it('variants reads variant values from thunks', () => {
		const chip = variants({ variants: { tone: { hot: 'chip-hot' } } });
		expect(chip({ tone: () => 'hot' })).toBe('chip-hot');
	});

	it('styled accepts a plain class string or an array config', () => {
		const A = styled('div', 'one two');
		const B = styled('div', ['three', { four: true }]);
		document.body.append(A({ children: 'a' }), B({ children: 'b' }));
		const [a, b] = document.body.querySelectorAll('div');
		expect(a.getAttribute('class')).toBe('one two');
		expect(b.getAttribute('class')).toBe('three four');
	});

	it('ThemeProvider spreads extra props and merges a custom style', () => {
		const node = (
			<ThemeProvider theme="dark" id="shell" style={{ margin: '1px' }}>
				<span>inside</span>
			</ThemeProvider>
		);
		document.body.append(node);
		expect(node.id).toBe('shell');
		expect(node.style.margin).toBe('1px');
		expect(node.getAttribute('data-theme')).toBe('dark');
	});

	it('ThemeProvider defaults the density attribute for density-less themes', () => {
		const sparse = { name: 'sparse', appearance: 'light', colors: { bg: '#ffffff' }, radii: {} };
		const node = <ThemeProvider theme={sparse}><span>x</span></ThemeProvider>;
		document.body.append(node);
		expect(node.getAttribute('data-density')).toBe('comfortable');
		expect(node.getAttribute('data-theme')).toBe('sparse');
	});
});
