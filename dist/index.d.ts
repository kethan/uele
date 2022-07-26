import { effect, Observable, r } from "ulive";
export declare type Props = {
    [K in string]: any;
};
export declare type Factory<P> = (props?: P, ...children: (string | Node)[]) => Node;
declare const isR: <T = any>(x: Observable<T>) => boolean;
declare const unR: (x: any) => any;
declare const toR: <T = any>(x: Observable<T>) => Observable<T> | Observable<Observable<T>>;
declare const Fragment = "Fragment";
export declare function h<K extends keyof HTMLElementTagNameMap>(tagName: K, jsxProps?: Props, ...children: (string | Node)[]): HTMLElementTagNameMap[K];
export declare function h(tagName: string, jsxProps?: Props, ...children: (string | Node)[]): HTMLElement;
export declare function h(tagName: typeof Fragment, jsxProps?: Props, ...children: (string | Node)[]): DocumentFragment;
export declare function h<F extends Factory<P>, P>(tagName: F, jsxProps?: P, ...children: (string | Node)[]): ReturnType<F>;
export { Fragment, effect, isR, unR, toR, r };
