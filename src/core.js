// Minimal renderer core. Configure api.is/get/sub explicitly for reactivity.
import { isFunction, noop, isObject, isNode, toNode, track, kill } from '../utils/index.js';
const api = {
    is: () => false,
    get: value => isFunction(value) ? value() : value
};
const r = (value, next, error, cleanup) => {
    if (api.is(value)) return api.sub(value, v => next(v, true), error, cleanup);
    next(api.get(value), false);
};
const add = (...children) =>
    children.flat(Infinity).flatMap((child) => {
        if (!api.is(child)) {
            const value = api.get(child);
            return value === child ? toNode(value) : add(value);
        }
        let update, prev = '';
        const stop = api.sub(child, value => {
            if (update && prev !== value) update(() => value);
            prev = value;
        }, noop);
        const [nodes, replace] = useLive(prev);
        update = replace;
        track(nodes[0], stop);
        return nodes;
    });
const useLive = (value, sm = document.createTextNode(''), em = document.createTextNode(''), old = add(value)) => [
    [sm, ...old, em],
    next => {
        const nodes = add(value = isFunction(next) ? next(value) : next);
        if (sm.parentNode && em.parentNode) {
            // Nested regions can change independently: snapshot the actual bounded DOM.
            old = [];
            for (let node = sm.nextSibling; node && node !== em; node = node.nextSibling) old.push(node);
            old.forEach(node => nodes.includes(node) || kill(node));
            if (api.diff) api.diff(sm.parentNode, old, nodes, em);
            else {
                old.forEach(node => node.remove());
                sm.after(...nodes);
            }
        }
    }
];

const props = new Map();

const h = (tag, attrs, ...children) => {
    if (tag === h) return children;
    if (typeof tag === "string") {
        if (attrs && (isNode(attrs) || api.is(attrs))) return h(tag, {}, [attrs, children])

        const ns = api.ns?.(tag);
        tag = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

        tag.append(...add(children))

        if (attrs) {
            Object.entries(attrs).forEach(([name, value]) => {
                if (name === "className") name = "class";
                // native handlers are properties (so `onclick: false` unregisters), custom events need a listener
                if (/^on/.test(name)) (name = name.toLowerCase()) in tag ? tag[name] = value : isFunction(value) && tag.addEventListener(name.slice(2), value)
                else if (name === 'style' && isObject(value) && !api.is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        track(tag, r(val, v =>
                            (prop in tag.style)
                                ? tag.style[prop] = v ?? ''
                                : tag.style.setProperty(prop, v ?? '')
                        ))
                    )
                else if (name === 'class' && isObject(value) && !api.is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        track(tag, r(val, v => tag.classList.toggle(prop, !!v)))
                    );
                else if (name === 'ref' && isFunction(value)) value(tag, attrs)
                else if (props.has(name)) track(tag, props.get(name)(tag, value, name, attrs));
                else if (name in tag && !ns) track(tag, r(value, v => tag[name] = v ?? ''));
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

export {
    h,
    r,
    api,
    add,
    props,
    useLive
};
