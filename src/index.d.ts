/** Attribute bags intentionally permit custom properties registered via `props`. */
export type Props = Record<string, any>;
export type Cleanup = () => void;
export interface Observable<T> {
    subscribe(next: (value: T) => void, error?: (error: unknown) => void, cleanup?: Cleanup):
        Cleanup | { unsubscribe(): void } | void;
}
export type Readable<T> = T | (() => Readable<T>) | { readonly value: T };
export type Source<T> = Readable<T> | PromiseLike<T> | AsyncIterable<T> | Observable<T>;
export type Child = null | undefined | boolean | bigint | number | string | Node |
    Child[] | (() => Child) | PromiseLike<Child> | AsyncIterable<Child> |
    Observable<Child> | { readonly value: Child };
export type Element<T = Child> = () => T;
export type Component<P = {}> = (props: P & { children: Child[] }) => Child;
export type Factory<P = Props> = Component<P>;
export type Fragment = typeof h;

export function h(tag: typeof h, attrs?: Props | null, ...children: Child[]): Child[];
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Props | Child, ...children: Child[]): HTMLElementTagNameMap[K];
export function h<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Props | Child, ...children: Child[]): SVGElementTagNameMap[K];
export function h<K extends keyof MathMLElementTagNameMap>(tag: K, attrs?: Props | Child, ...children: Child[]): MathMLElementTagNameMap[K];
export function h(tag: string, attrs?: Props | Child, ...children: Child[]): HTMLElement;
export function h<P, R extends Child>(tag: (props: P & { children: Child[] }) => R, attrs: P, ...children: Child[]): R;
export function h<R extends Child>(tag: (props: { children: Child[] }) => R, attrs?: null, ...children: Child[]): R;

export function add(...children: Child[]): Node[];
export function dispose(...nodes: (Node | Node[])[]): void;
export function useLive<T>(value: T & Child): [Node[], (next: T | ((previous: T) => T)) => void];
export const props: Map<string, (node: HTMLElement | SVGElement | MathMLElement, value: any, name: string, attrs: Props) => void>;
export function f(tag: typeof h): { [tag: string]: (attrs?: Props | Child, ...children: Child[]) => HTMLElement };

export function lazy<P = {}>(loader: () => PromiseLike<{ default: (props: P) => Child }>, fallback?: Child): (props: P) => Promise<Child>;
export function If({ when, children, fallback }: {
    when: unknown;
    children: (Child | ((when: boolean) => Child))[];
    fallback?: Child;
}): () => Child;
export { If as Show, If as Match };
export function Switch({ children, fallback }: { children: Child[]; fallback?: Child }): () => Child;
export function Dynamic<P extends Props>({ component, children, ...props }: P & {
    component: Child | ((props: Omit<P, 'component' | 'children'>, children: Child[]) => Child);
    children?: Child[];
}): () => Child;

/** Keys must be unique. Render results and creation-time indices are cached while their keys remain present. */
export function map<T>(items: Readable<T[] | null | undefined>, callback: (item: T, index: number) => Child, fallback?: Child, key?: (item: T, index: number) => unknown): Node[];
export function For<T>({ each, children, fallback, key }: {
    each: Readable<T[] | null | undefined>;
    children: [(item: T, index: number) => Child];
    fallback?: Child;
    key?: (item: T, index: number) => unknown;
}): Node[];

export function get<T>(value: Readable<T>): T;
/** `is` delegates to usub, which preserves nullish/falsy inputs rather than always returning boolean. */
export function is(value: any): boolean | null | undefined | 0 | '';
export function sub<T>(source: Source<T>, next: (value: T) => void, error?: (error: unknown) => void, cleanup?: Cleanup): Cleanup | undefined;
export function r<T, R>(source: Source<T>, next: (value: T, reactive: boolean) => R, error?: (error: unknown) => void, cleanup?: Cleanup): R | Cleanup | undefined;

export interface Api {
    effect?: (effect: () => unknown) => Cleanup | void;
    is: (value: any) => unknown;
    get: (value: any) => any;
    cleanup?: (cleanup?: Cleanup) => void;
    any?: (source: any) => ((next: (value: any) => void, error?: (error: unknown) => void, cleanup?: Cleanup) => Cleanup | void) | undefined;
    diff?: (parent: Node, oldNodes: Node[], newNodes: Node[], endOrGet: Node | ((node: Node) => Node), end?: Node) => unknown;
    udom?: (node: Node) => Node;
}
export const api: Api;
