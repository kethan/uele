import type { Child, Props } from 'uele';
export { h, h as Fragment, h as createElement } from 'uele';

/** Compiler metadata (key, source, self) is accepted but never rendered. */
export function jsx(tag: string | ((props: any) => Child), props?: Props | null, ...metadata: any[]): Child;
export { jsx as jsxs, jsx as jsxDev, jsx as jsxDEV };

export namespace JSX {
    type Element = Child;
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicElements { [tag: string]: Props; }
}
