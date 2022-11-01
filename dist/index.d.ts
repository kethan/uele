export declare type Props = {
    [K in string]: any;
};
export type Element<T = Child> = () => T;
export type Child = null | undefined | boolean | bigint | number | string | symbol | Node | Promise<Element> | AsyncIterable<Element> | Array<Child> | (() => Child);

export declare type Factory<P> = (props?: P, ...children: Child[]) => Node;
export declare type Fragment = ({ children }: { children: Child }) => Child;

type ComponentFunction<P = {}> = (props: P) => Child;
type ComponentNode = Node;
declare type ComponentCallable<P = {}> = ComponentFunction<P>;
export type Component<P = {}> = ComponentFunction<P> | ComponentNode;

export declare function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props, ...children: Child[]): HTMLElementTagNameMap[K];
export declare function h(tag: string, props?: Props, ...children: Child[]): HTMLElement;
export declare function h(tag: Fragment, props?: Props, ...children: Child[]): DocumentFragment;
export declare function h<F extends Factory<P>, P>(tag: F, props?: P, ...children: Child[]): ReturnType<F>;

export declare function lazy<P = {}>(file: Promise<{
    default: ComponentCallable<P>;
}>, fallback?: Child): (props: P & {
    children: Child[];
}) => Child;

export declare function If<T = {}>({ when, fallback, children }: { when: T, fallback?: Child, children: Child[] }): Child;
export declare function Show<T = {}>({ when, fallback, children }: { when: T, fallback?: Child, children: Child[] }): Child;
export declare function For<T = {}>({ each, fallback, children }: { each: T[], fallback?: Child, children: Child[] }): Child;
interface Api {
    effect?: () => void;
    memo?: <T>() => T;
    is?: (v: any) => Boolean;
    get?: <T>(v: T) => T;
}

export declare let api: Api;