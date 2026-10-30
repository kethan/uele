import { isFunction } from '../utils/index.js';

// Explicit composition also permits using these controls with another renderer.
export const createControlFlow = ({ get, map }) => {
// jsx hands one child over as-is; `If({ children: [fn] })` hands over an array
const first = (c) => (Array.isArray(c) ? c[0] : c);

const If =
    ({ when, children, fallback = "" }) =>
        () => !!get(when) ?
            isFunction(first(children)) ?
                first(children)(get(when)) :
                children :
            fallback

const Switch = ({ children, fallback = "" }) => () => {
    for (let child of children) {
        let result = isFunction(child) ? child() : child;
        if (result) return result;
    }
    return fallback;
}

const Dynamic = ({ component, children, ...props }) =>
    () =>
        isFunction(component) ?
            component({ ...props, children })
            : component

const For = ({ each, children, fallback, key = v => v }) => {
    const render = first(children); // `<For each={x}>{row}</For>` or `[row]`
    if (!isFunction(render)) throw new TypeError('For: children must be a render function');
    return map(each, render, fallback, key);
};


return { If, Show: If, Match: If, For, Switch, Dynamic };
};
