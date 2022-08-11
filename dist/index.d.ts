import { effect, Observable, o } from "ulive";
export declare type Props = {
    [K in string]: any;
};
export declare type Factory<P> = (props?: P, ...children: (string | Node)[]) => Node;
declare let isR: (x: any) => any;
declare let unR: (x: any) => any;
declare let toR: <T = any>(x: any) => Observable<T>;
declare let Fragment: ({ children }: {
    children: any;
}) => any;
export declare function h<K extends keyof HTMLElementTagNameMap>(tagName: K, props?: Props, ...children: (string | Node)[]): HTMLElementTagNameMap[K];
export declare function h(tagName: string, props?: Props, ...children: (string | Node)[]): HTMLElement;
export declare function h(tagName: typeof Fragment, props?: Props, ...children: (string | Node)[]): DocumentFragment;
export declare function h<F extends Factory<P>, P>(tagName: F, props?: P, ...children: (string | Node)[]): ReturnType<F>;
declare let lazy: (file: Function, fallback?: any) => (props: Props & {
    children: (string | Node)[];
}) => Observable<any>;
export { Fragment, effect, lazy, isR, unR, toR, o };
