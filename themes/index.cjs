'use strict';

var uele = require('uele');
var reactive = require('uele/reactive');

/**
 * Themes for `uele` — Radix-Themes-style design tokens, CSS variables and a
 * `cva`-style variant helper, with zero dependencies and no build step.
 *
 *     import { ThemeProvider, createTheme, themes, variants } from "uele/themes";
 *
 *     const theme = createTheme({ appearance: "dark", accent: "rose" });
 *     document.body.append(ThemeProvider({ theme, children: App() }));
 *
 * A theme is a plain object of tokens. `ThemeProvider` turns it into
 * `--uele-*` CSS custom properties on a wrapper element, so every `uele/ui`
 * primitive (which reads those variables with a light-theme fallback) restyles
 * itself instantly — and because the theme may be a cell or a thunk from ANY
 * signal library, swapping it is a single reactive write: no re-render, no
 * class juggling. `stylesheet(theme)` renders the same tokens as CSS text for
 * `:root`, SSR or a `<style>` tag (`ThemeStyle`).
 */

/* ------------------------------------------------------------- accents */

/** Accent scales: `accent` (solid), `accentHover`, `accentText` (on solid), `accentSoft` (tinted bg). */
const accents = {
	slate: { accent: '#64748b', accentHover: '#475569', accentText: '#ffffff', accentSoft: '#f1f5f9' },
	blue: { accent: '#2563eb', accentHover: '#1d4ed8', accentText: '#ffffff', accentSoft: '#eff6ff' },
	emerald: { accent: '#059669', accentHover: '#047857', accentText: '#ffffff', accentSoft: '#ecfdf5' },
	rose: { accent: '#e11d48', accentHover: '#be123c', accentText: '#ffffff', accentSoft: '#fff1f2' },
	amber: { accent: '#d97706', accentHover: '#b45309', accentText: '#ffffff', accentSoft: '#fffbeb' },
	violet: { accent: '#7c3aed', accentHover: '#6d28d9', accentText: '#ffffff', accentSoft: '#f5f3ff' },
	cyan: { accent: '#0891b2', accentHover: '#0e7490', accentText: '#ffffff', accentSoft: '#ecfeff' },
	pink: { accent: '#db2777', accentHover: '#be185d', accentText: '#ffffff', accentSoft: '#fdf2f8' },
	orange: { accent: '#ea580c', accentHover: '#c2410c', accentText: '#ffffff', accentSoft: '#fff7ed' },
	teal: { accent: '#0d9488', accentHover: '#0f766e', accentText: '#ffffff', accentSoft: '#f0fdfa' },
	neutral: { accent: '#171717', accentHover: '#262626', accentText: '#ffffff', accentSoft: '#f5f5f5' }
};

const neutrals = {
	light: {
		bg: '#ffffff', surface: '#ffffff', surfaceHover: '#f8fafc', text: '#0f172a', textMuted: '#64748b',
		border: '#e2e8f0', danger: '#dc2626', success: '#16a34a', warning: '#d97706', info: '#0284c7',
		overlay: 'rgba(15, 23, 42, 0.5)', ring: 'rgba(37, 99, 235, 0.35)',
		shadowSm: '0 1px 2px rgba(15, 23, 42, 0.06)', shadowMd: '0 4px 16px rgba(15, 23, 42, 0.10)', shadowLg: '0 12px 32px rgba(15, 23, 42, 0.16)'
	},
	dark: {
		bg: '#0b1220', surface: '#111827', surfaceHover: '#1f2937', text: '#f1f5f9', textMuted: '#94a3b8',
		border: '#1f2937', danger: '#f87171', success: '#4ade80', warning: '#fbbf24', info: '#38bdf8',
		overlay: 'rgba(0, 0, 0, 0.65)', ring: 'rgba(96, 165, 250, 0.45)',
		shadowSm: '0 1px 2px rgba(0, 0, 0, 0.4)', shadowMd: '0 4px 16px rgba(0, 0, 0, 0.45)', shadowLg: '0 12px 32px rgba(0, 0, 0, 0.55)'
	}
};

const RADII = {
	none: { radiusSm: '0px', radiusMd: '0px', radiusLg: '0px', radiusFull: '9999px' },
	small: { radiusSm: '4px', radiusMd: '6px', radiusLg: '8px', radiusFull: '9999px' },
	medium: { radiusSm: '6px', radiusMd: '10px', radiusLg: '14px', radiusFull: '9999px' },
	large: { radiusSm: '10px', radiusMd: '14px', radiusLg: '20px', radiusFull: '9999px' },
	full: { radiusSm: '9999px', radiusMd: '9999px', radiusLg: '9999px', radiusFull: '9999px' }
};

const isPlain = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && !reactive.isCell(v);
const merge = (base, over) => {
	const out = { ...base };
	for (const [k, v] of Object.entries(over || {})) out[k] = isPlain(v) && isPlain(out[k]) ? merge(out[k], v) : v;
	return out;
};

/* ------------------------------------------------------------ createTheme */

/**
 * Build a theme: `createTheme({ appearance, accent, radius, colors, name })`.
 * `accent` is an `accents` key, a CSS color (expanded into a scale) or a
 * partial accent object. `colors` overrides any neutral token. The result is
 * a plain, serialisable object — pass it around, store it, diff it.
 */
const createTheme = (options = {}) => {
	if (typeof options === 'string') return { ...(themes[options] || themes.light) };
	const { appearance = 'light', accent = 'blue', radius = 'medium', density = 'comfortable', name, colors = {}, radii, ...rest } = options;
	const accentTokens = typeof accent === 'string' && accents[accent]
		? accents[accent]
		: typeof accent === 'string'
			? { accent, accentHover: accent, accentText: '#ffffff', accentSoft: accent }
			: { ...accents.blue, ...accent };
	const radiusTokens = typeof radius === 'string' ? RADII[radius] || RADII.medium : { ...RADII.medium, ...(radii || {}) };
	return merge(
		{
			name: name || `${appearance}-${typeof accent === 'string' ? accent : 'custom'}`,
			appearance,
			accent: typeof accent === 'string' ? accent : 'custom',
			radius: typeof radius === 'string' ? radius : 'custom',
			density,
			colors: { ...(neutrals[appearance] || neutrals.light), ...accentTokens },
			radii: radiusTokens,
			font: { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: '16px' },
			fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
			space: { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.5rem', 6: '2rem' },
			shadow: {},
			control: { controlHeight: density === 'compact' ? '2rem' : '2.5rem' }
		},
		{ colors, ...(radii ? { radii } : {}), ...rest }
	);
};

/** alias with the naming other theme systems use */
const defineTheme = createTheme;

/** Ready-made themes, Radix-style: two appearances plus a few personalities. */
const themes = {
	light: createTheme({ name: 'light', appearance: 'light', accent: 'blue' }),
	dark: createTheme({ name: 'dark', appearance: 'dark', accent: 'blue' }),
	midnight: createTheme({
		name: 'midnight', appearance: 'dark', accent: 'violet',
		colors: { bg: '#0a0a1a', surface: '#12122b', surfaceHover: '#1b1b3a', border: '#23234a' }
	}),
	forest: createTheme({
		name: 'forest', appearance: 'dark', accent: 'emerald',
		colors: { bg: '#0a1510', surface: '#10231a', surfaceHover: '#183526', border: '#1d3d2c' }
	}),
	sunset: createTheme({
		name: 'sunset', appearance: 'light', accent: 'rose',
		colors: { bg: '#fff7f3', surface: '#ffffff', border: '#fed7cc', accentSoft: '#fff1ea' }
	}),
	ocean: createTheme({ name: 'ocean', appearance: 'light', accent: 'cyan' }),
	highContrast: createTheme({
		name: 'highContrast', appearance: 'light', accent: 'blue',
		colors: {
			bg: '#ffffff', surface: '#ffffff', surfaceHover: '#f0f0f0', text: '#000000', textMuted: '#333333',
			border: '#000000', accent: '#0033cc', accentHover: '#002a99', accentSoft: '#e6ecff',
			danger: '#b30000', success: '#005c00', warning: '#8a6d00', info: '#003d99'
		}
	})
};
const lightTheme = themes.light;
const darkTheme = themes.dark;

/* --------------------------------------------------------------- css vars */

const VAR_MAP = [
	['bg', '--uele-bg'], ['surface', '--uele-surface'], ['surfaceHover', '--uele-surface-hover'],
	['text', '--uele-text'], ['textMuted', '--uele-text-muted'], ['border', '--uele-border'],
	['accent', '--uele-accent'], ['accentHover', '--uele-accent-hover'], ['accentText', '--uele-accent-text'],
	['accentSoft', '--uele-accent-soft'], ['danger', '--uele-danger'], ['success', '--uele-success'],
	['warning', '--uele-warning'], ['info', '--uele-info'], ['overlay', '--uele-overlay'], ['ring', '--uele-ring']
];

/** theme -> `{ "--uele-bg": …, … }`, ready for a `style` prop or `setProperty` loop */
const cssVars = (theme) => {
	const t = resolveTheme(theme);
	const out = {};
	for (const [key, varName] of VAR_MAP) if (t.colors?.[key] != null) out[varName] = t.colors[key];
	const radii = t.radii || {};
	if (radii.radiusSm != null) out['--uele-radius-sm'] = radii.radiusSm;
	if (radii.radiusMd != null) out['--uele-radius'] = radii.radiusMd;
	if (radii.radiusMd != null) out['--uele-radius-md'] = radii.radiusMd;
	if (radii.radiusLg != null) out['--uele-radius-lg'] = radii.radiusLg;
	if (radii.radiusFull != null) out['--uele-radius-full'] = radii.radiusFull;
	const shadows = { ...(t.colors || {}), ...(t.shadow || {}) };
	if (shadows.shadowSm) out['--uele-shadow-sm'] = shadows.shadowSm;
	if (shadows.shadowMd) out['--uele-shadow'] = shadows.shadowMd;
	if (shadows.shadowMd) out['--uele-shadow-md'] = shadows.shadowMd;
	if (shadows.shadowLg) out['--uele-shadow-lg'] = shadows.shadowLg;
	if (t.font?.fontFamily) out['--uele-font-family'] = t.font.fontFamily;
	if (t.font?.fontSize) out['--uele-font-size'] = t.font.fontSize;
	if (t.control?.controlHeight) out['--uele-control-height'] = t.control.controlHeight;
	if (t.density) out['--uele-density'] = t.density;
	for (const [k, v] of Object.entries(t.fontSizes || {})) out[`--uele-font-size-${k}`] = v;
	for (const [k, v] of Object.entries(t.space || {})) out[`--uele-space-${k}`] = v;
	return out;
};

/**
 * Apply a theme imperatively to any element (no React tree needed):
 * sets every `--uele-*` variable + `data-theme`/`data-appearance`.
 * Returns the resolved theme.
 */
const applyTheme = (el, theme) => {
	const t = resolveTheme(theme);
	if (el?.style) for (const [name, value] of Object.entries(cssVars(t))) el.style.setProperty(name, value);
	el?.setAttribute?.('data-theme', t.name);
	el?.setAttribute?.('data-appearance', t.appearance);
	return t;
};

/** `'dark'` / `'light'` from the OS preference (defaults to `'light'`) */
const prefersColorScheme = () => {
	try {
		return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	} catch {
		return 'light';
	}
};
/** alias */
const themeVars = cssVars;

/** theme (or preset name / cell / thunk) -> the concrete theme object */
const resolveTheme = (input, fallback = themes.light) => {
	let value = input;
	if (reactive.isCell(value)) value = reactive.read(value);
	else if (typeof value === 'function') value = value();
	if (value == null) return fallback;
	if (typeof value === 'string') return themes[value] || fallback;
	// a partial theme object is completed against its appearance base
	return value.colors && value.radii ? value : createTheme(value);
};

/** CSS text for a theme: `stylesheet(theme)` -> `:root { --uele-bg: …; }` */
const stylesheet = (theme, selector = ':root') => {
	const vars = cssVars(theme);
	const body = Object.entries(vars).map(([k, v]) => `\t${k}: ${v};`).join('\n');
	return `${selector} {\n${body}\n}`;
};

/* ------------------------------------------------------------- components */

/**
 * Applies a theme to its subtree via CSS variables. `theme` may be a theme
 * object, a preset name (`"dark"`), a cell or a thunk — writes swap the whole
 * palette live. Renders a wrapper `<div data-theme data-appearance>`.
 */
const ThemeProvider = ({ theme = themes.light, children, style, ...props } = {}) => {
	const keys = Object.keys(cssVars(themes.light));
	const reactiveStyle = {};
	for (const key of keys) reactiveStyle[key] = () => cssVars(theme)[key];
	return uele.h('div', {
		...props,
		'data-theme': () => resolveTheme(theme).name,
		'data-appearance': () => resolveTheme(theme).appearance,
		'data-density': () => resolveTheme(theme).density || 'comfortable',
		style: { fontFamily: 'var(--uele-font-family)', color: 'var(--uele-text)', background: 'var(--uele-bg)', colorScheme: () => resolveTheme(theme).appearance, ...reactiveStyle, ...(style || {}) }
	}, children);
};

/** `<ThemeStyle theme={…} />` — a `<style>` element whose text follows the theme cell. */
const ThemeStyle = ({ theme = themes.light, selector = ':root' } = {}) =>
	uele.h('style', { 'data-uele-theme': '' }, () => stylesheet(theme, selector));

/**
 * Reactive theme state: `const t = useTheme("light")` ->
 * `{ theme (cell), setTheme, toggle (light <-> dark), appearance(), vars() }`.
 */
const useTheme = (initial = 'light') => {
	const theme = reactive.signal(resolveTheme(initial));
	return {
		theme,
		setTheme: (next) => reactive.write(theme, resolveTheme(typeof next === 'function' ? next(reactive.read(theme)) : next)),
		toggle: () => reactive.write(theme, reactive.read(theme).appearance === 'dark' ? themes.light : themes.dark),
		appearance: () => reactive.read(theme).appearance,
		vars: () => cssVars(theme)
	};
};

/* --------------------------------------------------------- cx / variants */

/** unwrap a maybe-reactive value one level (cells and thunks), else pass through */
const unwrap = (v) => (reactive.isCell(v) ? reactive.read(v) : typeof v === 'function' ? v() : v);

/** Join class names: strings, arrays, `{ class: truthy }` maps, cells and thunks. */
const cx = (...parts) => {
	const out = [];
	const walk = (part) => {
		part = unwrap(part);
		if (!part) return;
		if (typeof part === 'string') return void out.push(part);
		if (Array.isArray(part)) return void part.forEach(walk);
		if (typeof part === 'object') for (const [k, v] of Object.entries(part)) if (unwrap(v)) out.push(k);
	};
	parts.forEach(walk);
	return out.join(' ');
};

/**
 * `cva`-style variant resolver:
 *
 *     const button = variants({ base: "btn", variants: { size: { sm: "btn-sm" } }, defaultVariants: { size: "md" } });
 *     button({ size: "sm" }) // "btn btn-sm" — values may be cells/thunks too
 */
const variants = (config = {}) => {
	const { base = '', variants: groups = {}, defaultVariants = {}, compoundVariants = [] } = config;
	return (props = {}) => {
		const pick = (name) => {
			const raw = props[name] !== undefined ? unwrap(props[name]) : defaultVariants[name];
			return raw === true ? 'true' : raw === false ? 'false' : raw;
		};
		const classes = [base];
		for (const name of Object.keys(groups)) {
			const value = pick(name);
			if (value != null && groups[name][value] != null) classes.push(groups[name][value]);
		}
		for (const compound of compoundVariants) {
			const { class: cls, className, ...conditions } = compound;
			const norm = (v) => (v === true ? 'true' : v === false ? 'false' : v);
			if (Object.entries(conditions).every(([k, v]) => pick(k) === norm(v))) classes.push(cls || className);
		}
		if (props.class) classes.push(props.class);
		if (props.className) classes.push(props.className);
		return cx(...classes);
	};
};
/** alias (the name `class-variance-authority` popularised) */
const cva = variants;
/** alias */
const defineVariants = variants;

/**
 * Turn a tag + variant config into a uele component:
 *
 *     const Btn = styled("button", { base: "btn", variants: { tone: { brand: "btn-brand" } } });
 *     <Btn tone="brand">Save</Btn>
 */
const styled = (tag, config = {}) => {
	const resolve = typeof config === 'string' || Array.isArray(config) ? () => cx(config) : variants(config);
	return ({ children, class: klass, className, ...props } = {}) =>
		uele.h(tag, { ...props, class: cx(resolve(props), klass, className) }, children);
};

exports.ThemeProvider = ThemeProvider;
exports.ThemeStyle = ThemeStyle;
exports.accents = accents;
exports.applyTheme = applyTheme;
exports.createTheme = createTheme;
exports.cssVars = cssVars;
exports.cva = cva;
exports.cx = cx;
exports.darkTheme = darkTheme;
exports.defineTheme = defineTheme;
exports.defineVariants = defineVariants;
exports.lightTheme = lightTheme;
exports.prefersColorScheme = prefersColorScheme;
exports.resolveTheme = resolveTheme;
exports.styled = styled;
exports.stylesheet = stylesheet;
exports.themeVars = themeVars;
exports.themes = themes;
exports.useTheme = useTheme;
exports.variants = variants;
