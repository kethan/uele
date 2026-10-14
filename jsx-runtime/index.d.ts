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

export declare function h(tag: any, props?: any, ...children: Child[]): any;
export declare function createElement(tag: any, props?: any, ...children: Child[]): any;
export declare function jsx(tag: any, props?: { children?: Child; [key: string]: any }, key?: any): Child;
export declare const jsxs: typeof jsx;
export declare const jsxDev: typeof jsx;
export declare const jsxDEV: typeof jsx;
export declare const Fragment: typeof h;

// enable `jsxImportSource: "uele"` type checking
export declare namespace JSX {
    type Element = Child;
    interface ElementChildrenAttribute {
        children: {};
    }
    interface IntrinsicElements {
        [tag: string]: any;
    }
}
