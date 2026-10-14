import { h } from "uele";

// Automatic JSX runtimes pass children in props; key/debug metadata are not children.
const jsx = (tag, props) => {
    const { children, ...attrs } = props ?? {};
    return h(tag, attrs, ...(props && "children" in props ? [].concat(children) : []));
};

export {
    h as Fragment,
    h,
    h as createElement,
    jsx,
    jsx as jsxs,
    jsx as jsxDev,
    jsx as jsxDEV
};
