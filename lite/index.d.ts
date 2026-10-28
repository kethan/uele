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
    | Promise<Child>
    | AsyncIterable<Child>
    | Array<Child>
    | (() => Child);

export declare type Factory<P> = (props: P, ...children: Child[]) => Child;
export declare type Fragment = ({ children }: { children: Child }) => Child;

type ComponentNode = Node;
export type Component<P = {}> = Factory<P> | ComponentNode;

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
    diff?: (parent: Node, oldNodes: Node[], newNodes: Node[], getOrEnd?: any, before?: Node) => void;
    udom?: (node: Node, index: number, end: Node) => Node;
}

// Export the api object for reactive behavior
export declare let api: Api;
