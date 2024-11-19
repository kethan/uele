import { api, get, is, sub } from 'usub';

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

        tag = (api.s = isSVG(tag)) ?
            document.createElementNS("http://www.w3.org/2000/svg", tag) :
            (api.s = isMATH(tag)) ?
                document.createElementNS("http://www.w3.org/1998/Math/MathML", tag) :
                document.createElement(tag);

        tag.append(...add(children));

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
                else if (name in tag && !api.s) r(value, v => tag[name] = v);
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

const lazy =
    (file, fallback = "") =>
        (props) =>
            file()
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

const For = ({ each, children, fallback, key = v => v }) => map(each, children[0], fallback, key);

const map = (items, callback, fallback = "", key = v => v) => {
    let oldNodes,
        values = get(items),
        oldMap = new Map()
    oldNodes = values?.length ? values.map((v, i, a) => (oldMap.set(key(v, i), (a = callback(v, i))), a)) : [fallback]
    let [live, setLive] = useLive(oldNodes.length ? oldNodes : fallback);
    r(items, (values) => setLive(!values.length ? fallback : values.map((v, i, a) => oldMap.get(key(v, i)) || (oldMap.set(key(v, i), (a = callback(v, i))), a))))
    return live;
};
// https://github.com/dy/swapdom
const diff = (parent, a, b, end = null) => {
    let i = 0, cur, next, bi, bidx = new Set(b),
        insert = (a, b, parent) => parent.insertBefore(a, b),
        remove = (a, parent) => parent.removeChild(a)

    while (bi = a[i++]) !bidx.has(bi) ? remove(bi, parent) : cur = cur || bi
    cur = cur || end, i = 0

    while (bi = b[i++]) {
        next = cur ? cur.nextSibling : end
        // skip
        if (cur === bi) cur = next
        else {
            // swap 1:1 (saves costly swaps)
            if (b[i] === next) cur = next
            // insert
            insert(bi, cur, parent)
        }
    }
    return b
};
// Portal = ({ mount = document.body, useShadow = false, isSVG = false, children }) => {

//     // if(!isSVG) return h('div', {}, )
//     let container = isSVG ? document.createElementNS("http://www.w3.org/2000/svg", "svg") :
//         document.createElement("div");
//     // let container = mount === document.head ? document.createDocumentFragment() :
//     //     isSVG ? document.createElementNS("http://www.w3.org/2000/svg", "svg") :
//     //         document.createElement("div");

//     console.log(useShadow, container);
//     if (useShadow && container.attachShadow) {
//         container = container.attachShadow({ mode: "open" });
//         console.log(container, mount);
//     }

//     mount.append(container);
//     container.append(...appendChildren("")(children));

//     // return document.createTextNode("");
// },

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