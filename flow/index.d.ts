type Renderable = unknown;
type MaybeFn<T> = T | (() => T);

export declare const Await: (props?: {
	for?: unknown;
	children?: Renderable | ((value: any) => Renderable);
	fallback?: Renderable;
	catch?: (error: any) => Renderable;
}) => Node;
export declare const Suspense: (props?: { fallback?: Renderable; children?: MaybeFn<Renderable>; catch?: (error: any) => Renderable }) => Node;
export declare const ErrorBoundary: (props?: {
	children?: MaybeFn<Renderable>;
	fallback?: Renderable | ((error: any) => Renderable);
	onError?: (error: any) => void;
}) => Node;
export declare const Portal: (props?: { mount?: string | Element; children?: Renderable }) => Node;
export declare const Title: (props?: { children?: MaybeFn<Renderable> }) => Node;

export { If, Show, Match, For, Switch, Dynamic } from '../core/types.js';
export declare function createControlFlow(target: {
    get: (value: any) => any;
    map: typeof import('../core/types.js').map;
}): {
    If: typeof import('../core/types.js').If;
    Show: typeof import('../core/types.js').Show;
    Match: typeof import('../core/types.js').Match;
    For: typeof import('../core/types.js').For;
    Switch: typeof import('../core/types.js').Switch;
    Dynamic: typeof import('../core/types.js').Dynamic;
};
