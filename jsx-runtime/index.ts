import { h } from "uele";

// automatic jsx runtime: children arrive inside props, `key` is the third argument
const jsx = (tag, props = {}) => {
    const { children, key, ...attrs } = props || {};
    return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};

export {
    jsx,
    jsx as jsxs,
    jsx as jsxDev,
    jsx as jsxDEV,
    h as Fragment,
    h as createElement,
    h
};
