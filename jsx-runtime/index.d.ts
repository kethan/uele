export declare type Props = {
    [K in string]: any;
};

export type Child =
    | null
    | undefined
    | boolean
    | bigint
    | number
    | string
    | symbol
    | Node
    | Promise<Element>
    | AsyncIterable<Element>
    | Array<Child>
    | (() => Child);

export type Element<T = Child> = () => T;

export declare type Factory<P> = (props?: P, ...children: Child[]) => Node;
export declare type Fragment = ({ children }: { children: Child }) => Child;

type ComponentFunction<P = {}> = (props: P) => Child;
type ComponentNode = Node;
export type Component<P = {}> = ComponentFunction<P> | ComponentNode;

// h function with multiple overloads
export declare function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: Props,
    ...children: Child[]
): HTMLElementTagNameMap[K];
export declare function h(
    tag: string,
    props?: Props,
    ...children: Child[]
): HTMLElement;
export declare function h(
    tag: Fragment,
    props?: Props,
    ...children: Child[]
): DocumentFragment;
export declare function h<F extends Factory<P>, P>(
    tag: F,
    props?: P,
    ...children: Child[]
): ReturnType<F>;

// Lazy component loading
export declare function lazy<P = {}>(
    file: Promise<{ default: ComponentFunction<P> }>,
    fallback?: Child
): (props: P & { children: Child[] }) => Child;

// Control flow components
export declare function If<T = {}>({
    when,
    fallback,
    children
}: {
    when: T,
    fallback?: Child,
    children: Child[]
}): Child;

export declare function Show<T = {}>({
    when,
    fallback,
    children
}: {
    when: T,
    fallback?: Child,
    children: Child[]
}): Child;

export declare function For<T = {}>({
    each,
    fallback,
    children
}: {
    each: T[],
    fallback?: Child,
    children: Child[]
}): Child;

// Mapping function for efficient diffing
export declare function map<T = {}>(
    items: T[],
    fn: (item: T, index: number, items: T[]) => Child,
    fallback?: Child
): Child;

// Suspense component definition
export declare function Suspense({
    fallback,
    children
}: {
    fallback?: Child,
    children: Child
}): Child;

// Switch and Match components for conditional rendering
export declare function Switch({
    fallback,
    children
}: {
    fallback?: Child,
    children: Array<() => Child>
}): Child;

export declare function Match<T = {}>({
    when,
    children
}: {
    when: T,
    children: Child[]
}): Child;

// Utility functions
export declare function get<T>(v: T): T;
export declare function sub(
    target: any
): (
    next: (value: any) => void,
    error?: (err: any) => void,
    cleanup?: () => void
) => () => void;

export declare function is(arg: any): boolean;
export declare function r(
    x: any,
    callback: (value: any, reactive: boolean) => void,
    error?: (err: any) => void
): () => void;

// f function
export declare function f(tag: typeof h): {
    [K in string]: (...children: Child[]) => HTMLElement;
};


// API interface to define reactive behaviors
interface Api {
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
}

// Export the api object for reactive behavior
export declare let api: Api;
