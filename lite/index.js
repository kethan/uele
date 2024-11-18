import { api, get, is, sub } from 'usub/tiny';

const r = (x, next, error, cleanup) => is(x) ? sub(x, v => next(v, true), error, cleanup) : next(get(x), false)
const isFunction = x => typeof x === "function"
const isObject = x => typeof x === "object" && !Array.isArray(x)
const isFalsey = x => typeof x === "boolean" || x == null
const isSVG = x => /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x) // https://regex101.com/r/Ck4kFp/1
const isMATH = x => /^(m(?!a|en|et))|nn|cs|nc|ma(t|c)/.test(x) // https://regex101.com/r/piylRl/1
const isNode = x => x instanceof Node || isFalsey(x) || !isObject(x) || is(x)
const toNode = x => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(x)

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
        sub(child, (value) => {
            if (done && prev !== value) live.replace(...add(value));
            prev = value;
        });
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

        tag = (api.s = isSVG(tag)) ?
            document.createElementNS("http://www.w3.org/2000/svg", tag) :
            (api.s = isMATH(tag)) ?
                document.createElementNS("http://www.w3.org/1998/Math/MathML", tag) :
                document.createElement(tag);

        tag.append(...add(children))
        if (attrs) {
            Object.entries(attrs).map(([name, value]) => {
                if (name === "className") name = "class";
                if (name.startsWith("on")) tag[name.toLowerCase()] = value
                else if (name === 'style' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        r(val, v =>
                            (prop in tag.style)
                                ? tag.style[prop] = v == null ? '' : v
                                : v !== undefined
                                    ? tag.style.setProperty(prop, v)
                                    : tag.style.removeProperty(prop)
                        )
                    )
                else if (name === 'class' && isObject(value) && !is(value))
                    Object.entries(value).forEach(([prop, val]) =>
                        r(val, v => tag.classList.toggle(prop, !!v))
                    );
                else if (name === 'ref' && isFunction(value)) value(tag, attrs)
                else if (props.has(name)) props.get(name)(tag, value, name, attrs);
                else if (name in tag) r(value, v => tag[name] = v);
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

// const For = ({ each, children, fallback }) => map(each, children[0], fallback)

// const map = (items, callback, fallback = "") => {
//     let oldNodes,
//         values = get(items),
//         oldMap = new Map()
//     oldNodes = values?.length ? values.map((v, i, a) => (oldMap.set(v, (a = callback(v, i))), a)) : [fallback]
//     let [live, setLive] = useLive(oldNodes.length ? oldNodes : fallback);
//     r(items, (values) => setLive(!values.length ? fallback : values.map((v, i, a) => oldMap.get(v) || (oldMap.set(v, (a = callback(v, i))), a))))
//     return live;
// }

export {
    h,
    r,
    is,
    sub,
    get,
    api,
    add,
    // map,
    // For,
    props,
    useLive
};