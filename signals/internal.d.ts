export interface Preset<T extends object = any> {
	(target?: T): T;
}
export declare const scoped: (run: (fn: () => void) => any) => { effect: (fn: () => void) => () => void; cleanup: (fn?: unknown) => void };
export declare const HOOKS: Record<string, undefined>;
export declare const install: <T extends object>(target: T, overrides: Record<string, unknown>) => T;
