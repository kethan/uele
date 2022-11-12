'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let api = {
    effect: (f) => f(),
    memo: (f) => f(),
    is: (v) => v?.$o,
    get: (v) => v?.()
};

let get = (v) => isF(v)
    ? v()
    : api.is(v)
        ? api.get(v)
        : v;

let If = ({ when, children, fallback }) =>
    api.memo(() => (!!get(when) ? children : fallback));

let For = ({ each, children, fallback }) => map((each), (v, i) => isF(children) && children(v, i), fallback);

let isObs = (arg) =>
    arg && !!(arg[Symbol.asyncIterator] || arg.then || arg.subscribe || api.is(arg));
//https://github.com/dy/sube
let sube = (target, next, stop) => {
    if (target) {
        if (api.is(target)) api.effect(() => next(get(target)));
        else if (target.subscribe?.(next));
        else if (
            target.then?.((v) => !stop && next(v)) ||
            ((async (v) => {
                try {
                    for await (v of target) {
                        if (stop) return;
                        next(v);
                    }
                } catch (e) { }
            })() &&
                (() => (stop = 1)))
        );
    }
};
// MIT License
// Copyright (c) 2021 Daniel Ethridge
let Live = (
    sm = d.createTextNode(""),
    em = d.createTextNode("")
) => ({
    sm,
    em,
    append(...xs) {
        em.before(...xs);
    },
    replace(...xs) {
        let range = d.createRange();
        range.setStartAfter(sm);
        range.setEndBefore(em);
        range.deleteContents();
        sm.after(...xs);
    }
});

let d = document;

let Fragment = ({ children }) => {
    let el = d.createDocumentFragment();
    el.append(...appendChildren(...children));
    return el;
};

let isF = (x) => typeof x === 'function';
let isS = (x) => typeof x === 'string';
let isO = (x) => typeof x === 'object';
let isFalsey = (x) => typeof x === 'boolean' || x === undefined || x === null;

let isSVG = (el) =>
    /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(
        el
    );

let toNode = (x) => {
    if (x instanceof Node) return x;
    else if (isFalsey(x)) return d.createComment(x);
    else return d.createTextNode(x);
};

let r = (x, f) => (isObs(x) ? sube(x, (v) => f(v)) && f(x()) : f(x));

let appendChildren = (...children) =>
    children.flat(Infinity).flatMap((child) => {

        if (isF(child) && !isObs(child)) {
            child = api.memo(child);
        }
        // Non-reactive values
        if (!isObs(child)) return [toNode(child)];
        else {
            let liveFragment = Live(), done = false, node = [toNode('')];
            sube(child, (value) => {
                if (!Array.isArray(value)) value = [value];
                if (done) liveFragment.replace(...appendChildren(...get(value)));
                else node = value;
            });
            done = true;
            return [
                liveFragment.sm,
                ...appendChildren(...node),
                liveFragment.em,
            ]
        }
    });

let h = (tag, props, ...children) => {
    if (isF(tag)) {
        (props || (props = {})).children =
            children && children.length == 1 ? children[0] : children;
        return tag(props);
    } else if (isS(tag)) {
        let element = createEl(tag, props);
        element.append(...appendChildren(...children));
        return element;
    }
};

let applyStyles = (element, styles) => {
    for (let property in styles)
        r(styles[property], (value) => {
            if (value !== undefined) element.style.setProperty(property, value);
            else element.style.removeProperty(property);
        });
};

let applyClasses = (element, classes) => {
    for (let name in classes)
        r(classes[name], (value) =>
            element.classList.toggle(name, value)
        );
};

let applyAttributes = (element, attributes) => {
    for (let name in attributes) {
        r(attributes[name], (value) => {
            if (!(value)) element.removeAttribute(name);
            else element.setAttribute(name, value === true ? '' : value);
        });
    }
};

let lazy =
    (file, fb = '') =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fb);

let createEl = (tag, props) => {
    let el = isSVG(tag)
        ? d.createElementNS('http://www.w3.org/2000/svg', tag)
        : d.createElement(tag);


    if (props != null) {
        // Apply overloaded props, if possible
        // Inline style object
        if (isO(props.style) && !isObs(props.style)) {
            applyStyles(el, props.style);
            delete props.style;
        }
        // Classes object
        if (isO(props.class) && !isObs(props.class)) {
            applyClasses(el, props.class);
            delete props.class;
        }

        for (let name in props) {
            // ref prop
            if (name === 'ref' && isF(props.ref)) {
                props.ref(el, props);
                delete props[name];
            }
            // Event listener functions
            if (name.startsWith('on') && name.toLowerCase() in window) {
                el.addEventListener(name.substring(2).toLowerCase(), props[name]);
                delete props[name];
            }
        }
        // The rest of the props are attributes
        applyAttributes(el, props);
    }
    return el;
};

// https://github.com/dy/swapdom

let diff = (parent, a, b, end = null) => {
    let i = 0, cur, next, bi, n = b.length, m = a.length, same = (a, b) => a == b
        , replace = (a, b, parent) => parent.replaceChild(b, a),
        insert = (a, b, parent) => a ? a.before(b) : parent.append(b),
        remove = (a) => a.parentNode.removeChild(a);

    // skip head/tail
    while (i < n && i < m && same(a[i], b[i])) i++;
    while (i < n && i < m && same(b[n - 1], a[m - 1])) end = b[--m, --n];

    // append/prepend/trim shortcuts
    if (i == m) while (i < n) insert(end, b[i++], parent);
    // FIXME: can't use shortcut for childNodes as input
    // if (i == n) while (i < m) parent.removeChild(a[i++])

    else {
        cur = a[i];

        while (i < n) {
            bi = b[i++], next = cur ? cur.nextSibling : end;

            // skip
            if (same(cur, bi)) cur = next;

            // swap / replace
            else if (i < n && same(b[i], next)) (replace(cur, bi, parent), cur = next);

            // insert
            else insert(cur, bi, parent);
        }

        // remove tail
        while (!same(cur, end)) (next = cur.nextSibling, remove(cur), cur = next);
    }

    return b
};



let ifEmpty = (nodes, fb) => nodes.length > 0 ? nodes : [fb];

let map = (items, f, fb) => {
    let oldNodes, oldValues, live = Live();
    let done = false;
    if (!oldNodes) {
        oldValues = get(items);
        oldNodes = ifEmpty(oldValues.map(f), fb);
    }

    api.effect(() => {
        let newValues = get(items);
        if (done) {
            let oldMap = new Map();
            for (let i = 0; i < oldValues.length; i++) {
                oldMap.set(oldValues[i], oldNodes[i]);
            }
            let newNodes = [];
            for (let i = 0; i < newValues.length; i++) {
                let newValue = newValues[i];
                let newNode = oldMap.has(newValue)
                    ? oldMap.get(newValue)
                    : f(newValue);
                newNodes.push(newNode);
            }
            newNodes = ifEmpty(newNodes, fb);
            diff(live, oldNodes, newNodes, live.em);
            oldValues = newValues;
            oldNodes = newNodes;
        }

    });
    done = true;
    return [
        live.sm,
        oldNodes,
        live.em
    ]
};

exports.For = For;
exports.Fragment = Fragment;
exports.If = If;
exports.Show = If;
exports.api = api;
exports.createElement = h;
exports.get = get;
exports.h = h;
exports.isObs = isObs;
exports.lazy = lazy;
exports.map = map;
exports.sube = sube;
