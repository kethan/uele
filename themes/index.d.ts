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
export declare const themes: Record<'light' | 'dark' | 'midnight' | 'forest' | 'sunset' | 'ocean', UeleTheme>;
export declare const lightTheme: UeleTheme;
export declare const darkTheme: UeleTheme;
export declare function createTheme(options?: {
	name?: string; appearance?: string;
	accent?: string | Partial<(typeof accents)['blue']>;
	radius?: string; colors?: Record<string, string>; radii?: Record<string, string>;
	[key: string]: unknown;
} | string): UeleTheme;
export declare const defineTheme: typeof createTheme;
export declare function resolveTheme(input: unknown, fallback?: UeleTheme): UeleTheme;
export declare function cssVars(theme: unknown): Record<string, string>;
export declare const themeVars: typeof cssVars;
export declare function stylesheet(theme: unknown, selector?: string): string;
export declare const ThemeProvider: Factory<{ theme?: unknown; children?: unknown }>;
export declare const ThemeStyle: Factory<{ theme?: unknown; selector?: string }>;
export declare function useTheme(initial?: unknown): {
	theme: any;
	setTheme: (next: any) => void;
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
export declare const cva: typeof variants;
export declare const defineVariants: typeof variants;
export declare function styled(tag: string, config?: unknown): Factory<Record<string, unknown> & { children?: unknown }>;
