// Shared internal helpers.
const isFunction = x => typeof x === "function";
const noop = () => {};
const isObject = x => !!x && typeof x === "object" && !Array.isArray(x);
const isFalsey = x => typeof x === "boolean" || x == null;
const isNode = x => x instanceof Node || !isObject(x);
const toNode = x => x instanceof Node ? x : isFalsey(x)
    ? document.createComment(x) : document.createTextNode(String(x));

// Shared renderer-owned teardown.
const gone = new WeakMap();
const kill = n => {
    const list = gone.get(n);
    gone.delete(n);
    list?.forEach(f => f());
    [...n.childNodes].forEach(kill);
};
const track = (n, f) => {
    if (f?.call) gone.get(n)?.push(f) || gone.set(n, [f]);
};

export { isFunction, noop, isObject, isFalsey, isNode, toNode, kill, track };
