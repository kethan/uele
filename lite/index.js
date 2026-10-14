import { api, get, is, sub } from 'usub/tiny';

const r = (x, next, error, cleanup) => is(x) ? sub(x, v => next(v, true), error, cleanup) : next(get(x), false)
const isFunction = x => typeof x === "function"
const noop = () => { }
const isObject = x => typeof x === "object" && !Array.isArray(x)
const isFalsey = x => typeof x === "boolean" || x == null
const isSVG = x => !x.includes("-") && /^(t(ext$|s)|s[vwy]|g|image)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x) // https://regex101.com/r/Ck4kFp/1
const isMATH = x => !x.includes("-") && /^(m(?!a|en|et))|nn|cs|nc|ma(l|t|c)/.test(x) // https://regex101.com/r/piylRl/1
const isNode = x => x instanceof Node || isFalsey(x) || !isObject(x) || is(x)
const toNode = x => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(String(x))

const Live = (sm = document.createTextNode(""), em = document.createTextNode(""), range = document.createRange(), oldNodes = []) => ({
    sm, em, oldNodes,
    set: (o) => oldNodes = o,
    replace: (...newNodes) => {
        if (sm.parentNode && em.parentNode) {
            if (api.diff) {
                api.diff(sm.parentNode, oldNodes, newNodes, api.udom || em, api.udom && em)
                oldNodes = newNodes;
            } else {
                range.setStartAfter(sm);
                range.setEndBefore(em);
                range.deleteContents();
                sm.after(...newNodes);
            }
        }
    }
});

const add = (...children) =>
    children.flat(Infinity).flatMap((child) => {
        if (!is(child)) return toNode(child);
        let live = Live(), prev = "", done = false;
        // errors from promises/observables/async iterables are ignored - subscribe with r() to handle them
        sub(child, (value) => {
            if (done && prev !== value) live.replace(...add(value));
            prev = value;
        }, noop);
        done = true;
        return [live.sm, ...live.set(add(prev)), live.em];
    })

const useLive = (val, live = Live(), prev = val) => [
    [live.sm, ...live.set(add(val)), live.em],
    v => live.replace(...add(prev = isFunction(v) ? v(prev) : v))
];

const props = new Map([]);

const h = (tag, attrs, ...children) => {
    if (tag === h) return children;
    if (typeof tag === "string") {
        if (attrs && isNode(attrs)) return h(tag, {}, [attrs, children])

        // namespace is local to this element - nested SVGs/MathML or children rendering them must not leak
        const ns =
            isSVG(tag) ? "http://www.w3.org/2000/svg" :
                isMATH(tag) ? "http://www.w3.org/1998/Math/MathML" : null;

        tag = ns ? document.createElementNS(ns, tag) : document.createElement(tag);

        tag.append(...add(children))

        if (attrs) {
            Object.entries(attrs).map(([name, value]) => {
                if (name === "className") name = "class";
                // native handlers are properties (so `onclick: false` unregisters), custom events need a listener
                if (name.startsWith("on")) (name = name.toLowerCase()) in tag ? tag[name] = value : isFunction(value) && tag.addEventListener(name.slice(2), value)
                else if (name === 'style' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        r(val, v =>
                            (prop in tag.style)
                                ? tag.style[prop] = v == null ? '' : v
                                : v == null
                                    ? tag.style.removeProperty(prop)
                                    : tag.style.setProperty(prop, v)
                        )
                    )
                else if (name === 'class' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        r(val, v => tag.classList.toggle(prop, !!v))
                    );
                else if (name === 'ref' && isFunction(value)) value(tag, attrs)
                else if (props.has(name)) props.get(name)(tag, value, name, attrs);
                else if (name in tag && !ns) r(value, v => tag[name] = v == null ? '' : v);
                else r(value, v =>
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

export {
    h,
    r,
    is,
    sub,
    get,
    api,
    add,
    props,
    useLive
};