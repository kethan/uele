export declare type Props = {
    [K in string]: any;
};

/**
 * Anything an installed adapter recognises as a reactive value: a thunk, a `.value`
 * holder or a `.get()` holder. `For` and `map` take the list itself or a cell holding it.
 */
export type CellLike<T> = (() => T) | { value: T } | { get(): T };

export type Child =
    | null
    | undefined
    | boolean
    | bigint
    | number
    | string
    | symbol
    | Node
    | Promise<Child>
    | AsyncIterable<Child>
    | Array<Child>
    | (() => Child);

export type Element<T = Child> = () => T;

export declare type Factory<P> = (props: P, ...children: Child[]) => Child;
export declare type Fragment = ({ children }: { children: Child }) => Child;

type ComponentNode = Node;
/**
 * A function component. Deliberately not `Factory<P> | Node`: TypeScript refuses a
 * union that has no call signature as a JSX element type (TS2604), so annotating a
 * component with `Component` must still leave it usable as `<MyComponent />`.
 * Nodes are `Child`; `Dynamic` accepts either.
 */
export type Component<P = {}> = Factory<P>;

// h function with multiple overloads
export declare function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: Props | null,
    ...children: Child[]
): HTMLElementTagNameMap[K];
export declare function h(
    tag: string,
    props?: Props | null,
    ...children: Child[]
): HTMLElement;
export declare function h<P = {}>(
    tag: Factory<P>,
    props?: Props | null,
    ...children: Child[]
): Child;

// Lazily load a component module (needs a default export), with a fallback while loading or on failure
export declare function lazy<P = {}>(
    file: () => Promise<{ default: Factory<P> } | Record<string, any>>,
    fallback?: Child
): (props: P & { children?: Child[] }) => Promise<Child>;

// Control flow components - each of them returns a live thunk (a Child)
export declare function If<T = {}>({
    when,
    fallback,
    children
}: {
    when: T,
    fallback?: Child,
    children: Child | Child[]
}): Child;

export declare function Show<T = {}>({
    when,
    fallback,
    children
}: {
    when: T,
    fallback?: Child,
    children: Child | Child[]
}): Child;

export declare function Match<T = {}>({
    when,
    fallback,
    children
}: {
    when: T,
    fallback?: Child,
    children: Child | Child[]
}): Child;

export declare function For<T = {}>({
    each,
    fallback,
    key,
    children
}: {
    each: Iterable<T> | CellLike<Iterable<T>>,
    fallback?: Child,
    key?: (item: T, index: number) => any,
    children: ((item: T, index: number, items: T[]) => Child) | Array<(item: T, index: number, items: T[]) => Child>
}): Child;

// Efficient array mapping with keyed node reuse - `items` may be a cell holding the list
export declare function map<T = {}>(
    items: Iterable<T> | CellLike<Iterable<T>>,
    fn: (item: T, index: number, items: T[]) => Child,
    fallback?: Child,
    key?: (item: T, index: number) => any
): Child;

// Switch renders the first truthy child - use Match components as children
export declare function Switch({
    fallback,
    children
}: {
    fallback?: Child,
    children: Child | Child[]
}): Child;

// Renders a function component (with props and children), a node or nothing
export declare function Dynamic(props: Props & {
    component: ((props: any) => Child) | ComponentNode,
    children?: Child
}): Child;

// build dom nodes out of any child value - signals, promises, iterables, arrays, nodes, primitives
export declare function add(...children: Child[]): Node[];

// [nodes, setter] - a live region that replaces itself on every setter call
export declare function useLive<T>(
    value: T
): [Node[], (value: T | ((prev: T) => T)) => void];

// custom attribute/property handlers, keyed by attribute name
export declare const props: Map<string, (node: Node, value: any, name: string, attrs: Props) => void | (() => void)>;

// Utility functions
export declare function get<T>(v: T): T;
export declare function sub(
    target: any,
    next: (value: any) => void,
    error?: (err: any) => void,
    cleanup?: () => void
): () => void;

export declare function is(arg: any): boolean;
export declare function r(
    x: any,
    callback: (value: any, reactive: boolean) => void,
    error?: (err: any) => void,
    cleanup?: () => void
): void | (() => void);

// f creates tag factories: f(h).div({ id: 'a' }, 'child')
export declare function f(tag: typeof h): {
    [K in keyof HTMLElementTagNameMap]: (props?: Props | Child, ...children: Child[]) => HTMLElementTagNameMap[K];
} & {
    [K in string]: (props?: Props | Child, ...children: Child[]) => HTMLElement;
};

// API interface to define reactive behaviors
export interface Api {
    /** Optional authoring hooks installed by uele/signals/* integrations. */
    signal?: <T>(value: T) => any;
    computed?: <T>(fn: () => T) => any;
    set?: (cell: any, value: any) => void;
    batch?: <T>(fn: () => T) => T | void;
    untracked?: <T>(fn: () => T) => T;
    effect?: (f: () => void) => void;
    cleanup?: (cleanupFn: () => void) => void;
    any?: (
        target: any
    ) => (
        next: (value: any) => void,
        error?: (err: any) => void,
        cleanup?: () => void
    ) => () => void;
    is?: (v: any) => boolean;
    get?: <T>(v: T) => T;
    diff?: (parent: Node, oldNodes: Node[], newNodes: Node[], getOrEnd?: any, before?: Node) => void;
    udom?: (node: Node, index: number, end: Node) => Node;
}

// Export the api object for reactive behavior
export declare let api: Api;
