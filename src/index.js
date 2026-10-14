import { api, get, is } from 'usub';
import { subscriber } from './subscribe.js';
import { observe, iterate } from './protocols.js';

import { own, scope } from './scope.js';

const sub = subscriber(api, get, observe, iterate);

const r = (x, next, error, cleanup) => is(x) ? sub(x, v => next(v, true), error, cleanup) : next(get(x), false)
const isFunction = x => typeof x === "function"
const isObject = x => x !== null && typeof x === "object" && !Array.isArray(x)
const isFalsey = x => typeof x === "boolean" || x == null
const isSVG = x => /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x) // https://regex101.com/r/Ck4kFp/1
const isMATH = x => /^(m(?!a|en|et))|nn|cs|nc|ma(t|c)/.test(x) // https://regex101.com/r/piylRl/1
const isNode = x => x instanceof Node || isFalsey(x) || !isObject(x) || is(x)
const toNode = x => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(x)

// Subscriptions are owned by DOM nodes, not by the lifetime of their sources.
const cleanups = new WeakMap();
const track = (node, stop) => {
    if (isFunction(stop)) {
        const list = cleanups.get(node) || [];
        list.push(own(stop));
        cleanups.set(node, list);
    }
};
const dispose = (...nodes) => {
    const pending = nodes.flat(Infinity), errors = [];
    for (let i = 0; i < pending.length; i++) {
        const node = pending[i], list = cleanups.get(node);
        pending.push(...node.childNodes);
        cleanups.delete(node);
        for (const stop of list || []) try { stop(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Cleanup failed');
};

// Read the current range, including dynamically inserted nested content.
const span = (start, end) => {
    const nodes = [];
    for (let node = start; node; node = node.nextSibling) {
        nodes.push(node);
        if (node === end) return nodes;
    }
    return [];
};
const Live = (sm = document.createTextNode(""), em = document.createTextNode("")) => ({
    sm, em,
    replace: (...newNodes) => {
        const parent = sm.parentNode;
        if (!parent || em.parentNode !== parent) return;
        const current = span(sm, em);
        if (!current.length) return;
        const oldNodes = current.slice(1, -1), keep = new Set(newNodes);
        if (api.diff) api.diff(parent, oldNodes, newNodes, api.udom || em, api.udom && em);
        else {
            let cursor = sm.nextSibling;
            for (const node of newNodes) {
                if (node === cursor) cursor = cursor.nextSibling;
                else parent.insertBefore(node, cursor);
            }
        }
        for (const node of oldNodes) if (!keep.has(node)) {
            node.remove();
        }
    }
});

const add = (...children) =>
    children.flat(Infinity).flatMap((child) => {
        if (!is(child)) return toNode(child);
        let live = Live(), prev = "", done = false;
        track(live.sm, sub(child, (value) => {
            if (done && prev !== value) live.replace(...add(value));
            prev = value;
        }));
        done = true;
        return [live.sm, ...add(prev), live.em];
    })

const useLive = (val, live = Live(), prev = val) => [
    [live.sm, ...add(val), live.em],
    v => live.replace(...add(prev = isFunction(v) ? v(prev) : v))
];

const props = new Map();


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
        if (attrs != null && isNode(attrs)) return h(tag, {}, [attrs, children])

        const namespace = isSVG(tag) ? "2000/svg" : isMATH(tag) ? "1998/Math/MathML" : "";
        tag = namespace
            ? document.createElementNS("http://www.w3.org/" + namespace, tag)
            : document.createElement(tag);

        tag.append(...add(children));

        if (attrs) {
            const bind = (value, next) => track(tag, r(value, next));
            Object.entries(attrs).map(([name, value]) => {
                if (name === "className") name = "class";
                if (name.startsWith("on")) tag[name.toLowerCase()] = value
                else if ((name === 'style' || name === 'class') && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        bind(val, v => name === 'class'
                            ? tag.classList.toggle(prop, !!v)
                            : (prop in tag.style)
                                ? tag.style[prop] = v == null ? '' : v
                                : v !== undefined
                                    ? tag.style.setProperty(prop, v)
                                    : tag.style.removeProperty(prop)
                        )
                    );
                else if (name === 'ref' && isFunction(value)) value(tag, attrs)
                else if (props.has(name)) track(tag, props.get(name)(tag, value, name, attrs));
                else if (name in tag && !namespace) bind(value, v => tag[name] = v);
                else bind(value, v =>
                    v == null || v === false
                        ? tag.removeAttribute(name)
                        : tag.setAttribute(name, v === true ? '' : v)
                );

            })
        }
        return tag;
    }
    if (isFunction(tag)) return tag({ ...attrs, children });
};

const lazy =
    (file, fallback = "") =>
        (props) =>
            Promise.resolve().then(file)
                .then((f) => f.default(props))
                .catch(() => fallback)

const If =
    ({ when, children, fallback = "" }) =>
        () => !!get(when) ?
            isFunction(children[0]) ?
                children[0](!!get(when)) :
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
            component(props, children)
            : component

const For = ({ each, children, fallback, key }) => map(each, children[0], fallback, key);

const map = (items, callback, fallback = "", key = v => v) => {
    let cache = new Map(), empty;
    const snapshot = nodes => nodes[0].parentNode ? span(nodes[0], nodes.at(-1)) : nodes;
    const row = render => {
        const [nodes, stop] = scope(() => useLive(render())[0]);
        cleanups.set(nodes[0], [stop]);
        return nodes;
    };
    const clear = () => {
        for (const nodes of cache.values()) dispose(snapshot(nodes));
        cache.clear();
        if (empty) { dispose(snapshot(empty)); empty = undefined; }
    };
    const render = values => {
        values ??= [];
        const keys = values.map((value, index) => key(value, index));
        if (new Set(keys).size !== keys.length) throw new Error("Duplicate key in For/map");
        const next = new Map();
        let nodes;
        try {
            nodes = values.flatMap((value, index) => {
                const id = keys[index], nodes = cache.get(id) || row(() => callback(value, index));
                next.set(id, nodes);
                return snapshot(nodes);
            });
        } catch (error) {
            for (const [id, nodes] of next) if (!cache.has(id)) dispose(snapshot(nodes));
            throw error;
        }
        for (const [id, row] of cache) if (!next.has(id)) dispose(snapshot(row));
        cache = next;
        if (nodes.length) {
            if (empty) dispose(snapshot(empty));
            empty = undefined;
            return nodes;
        }
        return snapshot(empty ||= row(() => fallback));
    };
    const [live, setLive] = useLive(render(get(items)));
    track(live[0], r(items, values => setLive(render(values)), undefined, clear));
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
    dispose,
    Dynamic
}