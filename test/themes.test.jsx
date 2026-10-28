/** @jsxImportSource uele */
/**
 * `uele/themes` — token themes, CSS variables, the variant helper and the
 * reactive ThemeProvider, on preact signals (any preset works the same).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { preactSignals } from 'uele/signals/preact';
import { signal } from '@preact/signals-core';
import { read } from 'uele/reactive';
import {
	accents, themes, lightTheme, darkTheme, createTheme, resolveTheme,
	cssVars, stylesheet, ThemeProvider, ThemeStyle, useTheme, cx,
	variants, styled, applyTheme, prefersColorScheme
} from 'uele/themes';
import { Button } from 'uele/ui';

beforeEach(() => {
	preactSignals();
	document.body.innerHTML = '';
});

describe('createTheme and presets', () => {
	it('defaults to a light blue theme with radii and font tokens', () => {
		const theme = createTheme();
		expect(theme.appearance).toBe('light');
		expect(theme.colors.accent).toBe(accents.blue.accent);
		expect(theme.radii.radiusMd).toBe('10px');
		expect(theme.font.fontFamily).toContain('system-ui');
	});

	it('builds dark, accented and customised themes', () => {
		const dark = createTheme({ appearance: 'dark', accent: 'rose', radius: 'small' });
		expect(dark.colors.bg).toBe('#0b1220');
		expect(dark.colors.accent).toBe(accents.rose.accent);
		expect(dark.radii.radiusMd).toBe('6px');

		const custom = createTheme({ accent: '#123456', colors: { bg: '#fafafa' } });
		expect(custom.colors.accent).toBe('#123456');
		expect(custom.colors.bg).toBe('#fafafa');
		expect(createTheme('dark').appearance).toBe('dark');
	});

	it('ships named presets', () => {
		expect(Object.keys(themes)).toEqual(expect.arrayContaining(['light', 'dark', 'midnight', 'forest', 'sunset', 'ocean']));
		expect(lightTheme.appearance).toBe('light');
		expect(darkTheme.appearance).toBe('dark');
		expect(themes.midnight.appearance).toBe('dark');
	});

	it('resolveTheme accepts names, objects, cells and thunks', () => {
		expect(resolveTheme('dark')).toBe(darkTheme);
		expect(resolveTheme(lightTheme)).toBe(lightTheme);
		const cell = signal('dark');
		expect(resolveTheme(cell)).toBe(darkTheme);
		expect(resolveTheme(() => 'midnight')).toBe(themes.midnight);
		expect(resolveTheme({ appearance: 'dark' }).colors.accent).toBe(accents.blue.accent);
		expect(resolveTheme(null)).toBe(lightTheme);
	});
});

describe('cssVars and stylesheet', () => {
	it('maps tokens to --uele-* variables', () => {
		const vars = cssVars(darkTheme);
		expect(vars['--uele-bg']).toBe(darkTheme.colors.bg);
		expect(vars['--uele-accent']).toBe(accents.blue.accent);
		expect(vars['--uele-radius']).toBe('10px');
		expect(vars['--uele-font-family']).toContain('system-ui');
		expect(cssVars('light')['--uele-text']).toBe(lightTheme.colors.text);
	});

	it('renders CSS text for a selector', () => {
		const css = stylesheet(createTheme({ accent: 'emerald' }), '[data-theme="x"]');
		expect(css).toContain('[data-theme="x"] {');
		expect(css).toContain('--uele-accent: ' + accents.emerald.accent);
		expect(stylesheet(lightTheme)).toContain(':root {');
	});
});

describe('cx and variants', () => {
	it('cx joins strings, arrays, objects, cells and thunks', () => {
		const cell = signal('live');
		expect(cx('a', ['b', ['c']], { d: true, e: false }, null, undefined)).toBe('a b c d');
		expect(cx(cell, () => 'thunk')).toBe('live thunk');
	});

	it('variants resolves groups, defaults, compounds and reactive values', () => {
		const button = variants({
			base: 'btn',
			variants: {
				tone: { brand: 'btn-brand', plain: 'btn-plain' },
				small: { true: 'btn-sm', false: 'btn-md' }
			},
			defaultVariants: { tone: 'plain', small: false },
			compoundVariants: [{ tone: 'brand', small: true, class: 'btn-brand-sm' }]
		});
		expect(button()).toBe('btn btn-plain btn-md');
		expect(button({ tone: 'brand' })).toBe('btn btn-brand btn-md');
		expect(button({ tone: 'brand', small: true })).toBe('btn btn-brand btn-sm btn-brand-sm');
		const tone = signal('brand');
		expect(button({ tone })).toBe('btn btn-brand btn-md');
	});

	it('styled turns a tag + config into a component', () => {
		const BrandButton = styled('button', {
			base: 'btn',
			variants: { tone: { brand: 'btn-brand' } },
			defaultVariants: { tone: 'brand' }
		});
		const el = <BrandButton id="go">Go</BrandButton>;
		expect(el.tagName).toBe('BUTTON');
		expect(el.className).toBe('btn btn-brand');
		expect(el.id).toBe('go');
		expect(el.textContent).toBe('Go');
	});
});

describe('ThemeProvider, ThemeStyle, useTheme', () => {
	it('applies CSS variables and follows a theme cell live', () => {
		const theme = signal(lightTheme);
		const el = (
			<ThemeProvider theme={theme}>
				<Button>inside</Button>
			</ThemeProvider>
		);
		document.body.append(el);
		expect(el.dataset.theme).toBe('light');
		expect(el.dataset.appearance).toBe('light');
		expect(el.style.getPropertyValue('--uele-bg')).toBe(lightTheme.colors.bg);
		expect(el.textContent).toBe('inside');

		theme.value = darkTheme;
		expect(el.dataset.theme).toBe('dark');
		expect(el.style.getPropertyValue('--uele-bg')).toBe(darkTheme.colors.bg);
		expect(el.style.getPropertyValue('--uele-accent')).toBe(darkTheme.colors.accent);
	});

	it('accepts a preset name and merges user style', () => {
		const el = <ThemeProvider theme="midnight" style={{ padding: '1rem' }}>x</ThemeProvider>;
		expect(el.dataset.appearance).toBe('dark');
		expect(el.style.padding).toBe('1rem');
	});

	it('ThemeStyle renders reactive CSS text', () => {
		const theme = signal('light');
		const el = <ThemeStyle theme={theme} />;
		document.body.append(el);
		expect(el.textContent).toContain('--uele-bg: ' + lightTheme.colors.bg);
		theme.value = 'dark';
		expect(el.textContent).toContain('--uele-bg: ' + darkTheme.colors.bg);
	});

	it('useTheme toggles appearance and exposes vars', () => {
		const t = useTheme('light');
		expect(t.appearance()).toBe('light');
		t.toggle();
		expect(t.appearance()).toBe('dark');
		t.toggle();
		expect(t.appearance()).toBe('light');
		t.setTheme('dark');
		expect(read(t.theme).name).toBe('dark');
		expect(t.vars()['--uele-bg']).toBe(darkTheme.colors.bg);
	});
});

describe('wave-2 theme additions', () => {
	it('ships pink/orange/teal accents and a high-contrast preset', () => {
		expect(accents.pink.accent).toBe('#db2777');
		expect(accents.teal.accent).toBe('#0d9488');
		expect(themes.highContrast.colors.text).toBe('#000000');
		expect(themes.highContrast.colors.border).toBe('#000000');
		expect(createTheme({ accent: 'orange' }).colors.accent).toBe(accents.orange.accent);
	});

	it('density and the spacing/type scales become CSS variables', () => {
		const compact = cssVars(createTheme({ density: 'compact' }));
		expect(compact['--uele-density']).toBe('compact');
		expect(compact['--uele-control-height']).toBe('2rem');
		expect(compact['--uele-space-4']).toBe('1rem');
		expect(compact['--uele-font-size-sm']).toBe('0.875rem');
		expect(cssVars(createTheme())['--uele-control-height']).toBe('2.5rem');
	});

	it('applyTheme writes variables + data attributes onto any element', () => {
		const el = document.createElement('section');
		const applied = applyTheme(el, 'dark');
		expect(applied).toBe(darkTheme);
		expect(el.style.getPropertyValue('--uele-bg')).toBe(darkTheme.colors.bg);
		expect(el.dataset.theme).toBe('dark');
		expect(el.dataset.appearance).toBe('dark');
	});

	it('prefersColorScheme answers light/dark', () => {
		expect(['light', 'dark']).toContain(prefersColorScheme());
	});
});
