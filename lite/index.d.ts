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

// Utility functions
export declare function get<T>(v: T): T;

export declare function is(arg: any): boolean;

export declare function r(
    x: any,
    callback: (value: any, reactive: boolean) => void,
    error?: (err: any) => void
): () => void;

// API interface to define reactive behaviors
interface Api {
    effect?: (f: () => void) => void;
    is?: (v: any) => boolean;
    get?: <T>(v: T) => T;
}

// Export the api object for reactive behavior
export declare let api: Api;
