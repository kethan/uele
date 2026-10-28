import { api, get, is, sub } from 'usub';

const r = (x, next, error, cleanup) => is(x) ? sub(x, v => next(v, true), error, cleanup) : next(get(x), false)
const isFunction = x => typeof x === "function"
const noop = () => { }
const isObject = x => !!x && typeof x === "object" && !Array.isArray(x) // null is not a style/class object
const isFalsey = x => typeof x === "boolean" || x == null
const isSVG = x => !x.includes("-") && /^(t(ext$|s)|s[vwy]|g|image)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x) // https://regex101.com/r/Ck4kFp/1
const isMATH = x => !x.includes("-") && /^(m(?!a|en|et))|nn|cs|nc|ma(l|t|c)/.test(x) // https://regex101.com/r/piylRl/1
const isNode = x => x instanceof Node || isFalsey(x) || !isObject(x) || is(x)
const toNode = x => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(String(x))

const Live = (sm = document.createTextNode(""), em = document.createTextNode(""), oldNodes = []) => ({
    sm, em,
    set: (o) => oldNodes = o,
    replace: (...newNodes) => {
        if (sm.parentNode && em.parentNode) {
            // dispose what is being discarded (moved/reused nodes keep theirs)
            oldNodes.forEach((n) => newNodes.includes(n) || kill(n));
            // no differ: wipe the span between the markers - a nested region can hold
            // nodes that oldNodes does not know about
            if (api.diff) api.diff(sm.parentNode, oldNodes, newNodes, api.udom || em, api.udom && em)
            else {
                for (let node = sm.nextSibling; node && node !== em; node = sm.nextSibling) node.remove();
                sm.after(...newNodes);
            }
            oldNodes = newNodes; // the next update (or a differ set later) gets the live set
        }
    }
});

// teardown registry: node -> disposers (`sub` returns) for its region/attrs,
// run when a region discards the node so removed content stops reacting
const gone = new WeakMap()
const kill = (n) => { const list = gone.get(n); gone.delete(n); list?.forEach((f) => f()); [...n.childNodes].forEach(kill) }
const track = (n, f) => { if (f?.call) (gone.get(n) || gone.set(n, []).get(n)).push(f) }

const add = (...children) =>
    children.flat(Infinity).flatMap((child) => {
        if (!is(child)) return toNode(child);
        let live = Live(), prev = "", done = false;
        // errors from promises/observables/async iterables are ignored - subscribe with r() to handle them
        track(live.sm, sub(child, (value) => {
            if (done && prev !== value) live.replace(...add(value));
            prev = value;
        }, noop));
        done = true;
        return [live.sm, ...live.set(add(prev)), live.em];
    })

const useLive = (val, live = Live(), prev = val) => [
    [live.sm, ...live.set(add(val)), live.em],
    v => live.replace(...add(prev = isFunction(v) ? v(prev) : v))
];

const props = new Map([]);


const f = (tag) => new Proxy(
    {},
    {
        get:
            (_, attrs) =>
                (...children) =>
                    tag(attrs, ...children),
    }
)

const h = (tag, attrs, ...children) => {
    if (tag === h) return children;
    if (typeof tag === "string") {
        if (attrs && isNode(attrs)) return h(tag, {}, [attrs, children])

        // a `children` key in attrs is content, not Element.children
        if (attrs && 'children' in attrs) (children = children.concat(attrs.children ?? [])), delete attrs.children;

        // namespace is local to this element - nested SVGs/MathML or children rendering them must not leak
        const ns =
            isSVG(tag) ? "http://www.w3.org/2000/svg" :
                isMATH(tag) ? "http://www.w3.org/1998/Math/MathML" : null;

        tag = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

        tag.append(...add(children));

        if (attrs) {
            Object.entries(attrs).map(([name, value]) => {
                if (name === "className") name = "class";
                // native handlers are properties (so `onclick: false` unregisters), custom events need a listener
                if (name.startsWith("on")) (name = name.toLowerCase()) in tag ? tag[name] = value : isFunction(value) && tag.addEventListener(name.slice(2), value)
                else if (name === 'style' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        track(tag, r(val, v =>
                            (prop in tag.style)
                                ? tag.style[prop] = v == null ? '' : v
                                : v == null
                                    ? tag.style.removeProperty(prop)
                                    : tag.style.setProperty(prop, v)
                        ))
                    )
                else if (name === 'class' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        track(tag, r(val, v => tag.classList.toggle(prop, !!v)))
                    );
                else if (name === 'ref' && isFunction(value)) value(tag, attrs)
                else if (props.has(name)) track(tag, props.get(name)(tag, value, name, attrs));
                else if (name in tag && !ns) track(tag, r(value, v => tag[name] = v == null ? '' : v));
                else track(tag, r(value, v =>
                    v == null || v === false
                        ? tag.removeAttribute(name)
                        : tag.setAttribute(name, v === true ? '' : v)
                ));

            })
        }
        return tag;
    }
    if (isFunction(tag)) return tag({ ...attrs, children });
};

const lazy =
    (file, fallback = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fallback)

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

const map = (items, callback, fallback = "", key = v => v) => {
    let oldMap = new Map();
    const build = (values) => {
        const prev = oldMap; oldMap = new Map();
        // non-iterables (a pending promise, a number) render the fallback instead
        const nodes = (values?.[Symbol.iterator] && [...values] || []).map((v, i) => {
            const k = key(v, i), node = prev.get(k) ?? callback(v, i);
            prev.delete(k), oldMap.set(k, node); // consume - duplicate keys must not reuse a node
            return node;
        });
        return nodes.length ? nodes : [fallback];
    };
    const [live, setLive] = useLive(build(get(items) || []));
    // source errors keep the previous content; the sub dies with the list region
    track(live[0], r(items, (values) => setLive(build(values || [])), noop));
    return live;
};

export {
    h,
    f,
    r,
    is,
    If,
    add,
    api,
    get,
    sub,
    For,
    map,
    lazy,
    props,
    If as Show,
    If as Match,
    Switch,
    useLive,
    Dynamic
}
