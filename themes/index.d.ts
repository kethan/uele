import type { Cell, Readable } from '../reactive/index.js';
import type { Factory } from '../dist/index.d.ts';

export interface UeleTheme {
	name: string;
	appearance: 'light' | 'dark' | string;
	accent: string;
	radius: string;
	colors: Record<string, string>;
	radii: Record<string, string>;
	font: { fontFamily: string; fontSize: string };
	shadow: Record<string, string>;
	control: { controlHeight: string };
	[key: string]: unknown;
}

export declare const accents: Record<string, { accent: string; accentHover: string; accentText: string; accentSoft: string }>;
export declare const themes: Record<'light' | 'dark' | 'midnight' | 'forest' | 'sunset' | 'ocean' | 'highContrast', UeleTheme>;
export declare const lightTheme: UeleTheme;
export declare const darkTheme: UeleTheme;
export interface ThemeOptions {
	name?: string; appearance?: string;
	accent?: string | Partial<(typeof accents)['blue']>;
	radius?: string; density?: 'compact' | 'comfortable' | string; colors?: Record<string, string>; radii?: Record<string, string>;
	[key: string]: unknown;
}
export declare function createTheme(options?: ThemeOptions | string): UeleTheme;
export declare function applyTheme(el: Element | null, theme: unknown): UeleTheme;
export declare function prefersColorScheme(): 'dark' | 'light';
export declare function resolveTheme(input: unknown, fallback?: UeleTheme): UeleTheme;
export declare function cssVars(theme: unknown): Record<string, string>;
export declare function stylesheet(theme: unknown, selector?: string): string;
export declare const ThemeProvider: Factory<{ theme?: unknown; children?: unknown }>;
export declare const ThemeStyle: Factory<{ theme?: unknown; selector?: string }>;
export type ThemeInput = string | ThemeOptions | UeleTheme;
export declare function useTheme(initial?: Readable<ThemeInput> | ThemeInput): {
	theme: Cell<UeleTheme>;
	setTheme: (next: ThemeInput | ((theme: UeleTheme) => ThemeInput)) => void;
	toggle: () => void;
	appearance: () => string;
	vars: () => Record<string, string>;
};
export declare function cx(...parts: unknown[]): string;
export declare function variants(config?: {
	base?: unknown;
	variants?: Record<string, Record<string, unknown>>;
	defaultVariants?: Record<string, unknown>;
	compoundVariants?: Array<Record<string, unknown>>;
}): (props?: Record<string, unknown>) => string;
export declare function styled(tag: string, config?: unknown): Factory<Record<string, unknown> & { children?: unknown }>;
