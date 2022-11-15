'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let api = {
        effect: (f) => f(),
        memo: (f) => f(),
        is: (v) => false,
        get: (v) => v
    },
    get = (v) => (isF(v) ? v() : api.is(v) ? api.get(v) : v),
    unpack = (value) => {
        let current = value;
        if (isF(current)) {
            return unpack(current());
        } else if (api.is(value)) {
            current = api.get(value);
            return unpack(current);
        }
        return current;
    },
    //https://github.com/dy/sube
    sube = (target, next, error, stop) => target &&
        ((target.call &&
            !api.is(target) &&
            api.effect(() => next(unpack(target)))) ||
            (api.is(target) &&
                api.effect(() => next(unpack(target)))) ||
            target.subscribe?.((v) => unpack(v), error) ||
            ((target.then?.((v) => !stop && next(unpack(v)), error) ||
                (async (v) => {
                    try {
                        for await (v of target) {
                            if (stop) return;
                            next(unpack(v));
                        }
                    } catch (err) {
                        error?.(err);
                    }
                })()) &&
                ((_) => (stop = 1))));

let d = document,
    // MIT License
    // Copyright (c) 2021 Daniel Ethridge
    Live = (sm = d.createTextNode(""), em = d.createTextNode("")) => ({
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
        },
    }),
    Fragment = ({ children }) => {
        let el = d.createDocumentFragment();
        el.append(...appendChildren(children));
        return el;
    },
    toNode = (x) => {
        if (x instanceof Node) return x;
        else if (isFalsey(x)) return d.createComment(x);
        else return d.createTextNode(x);
    };

// Helpers
let isF = (x) => typeof x === "function",
    isS = (x) => typeof x === "string",
    isO = (x) => typeof x === "object",
    isFalsey = (x) => typeof x === "boolean"
        || x === undefined
        || x === null,
    isSVG = (el) =>
        /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(
            el
        ),
    isObs = (arg) =>
        arg &&
        !!(
            arg[Symbol.asyncIterator] ||
            arg?.call ||
            arg.then ||
            arg.subscribe ||
            api.is(arg)
        ),
    ifEmpty = (nodes, fb) =>
        nodes.length > 0 ? nodes : [fb],
    react = (x, f, e) =>
        isObs(x) ? sube(x, (v) => f(v, true), e) : f(x, false);

let appendChildren = (...children) =>
    children.flat(Infinity).flatMap((child) => {
        if (!isObs(child)) return [toNode(child)];
        else {
            let liveFragment = Live(),
                done = false,
                node = [toNode("")];
            sube(child, (value) => {
                if (done)
                    liveFragment.replace(...appendChildren([value]));
                else node = [value];
            });
            done = true;
            return [
                liveFragment.sm,
                ...appendChildren(...node),
                liveFragment.em,
            ];
        }
    });

let h = (tag, props, ...children) => {
    if (isF(tag)) {
        (props || (props = {})).children =
            children && children.length == 1 ? children[0] : children;
        return tag(props);
    } else if (isS(tag)) {
        let element = createEl(tag, props);
        element.append(...appendChildren(children));
        return element;
    }
};

let applyStyles = (element, styles) => {
    for (let property in styles)
        react(styles[property], (value) => {
            if (value !== undefined) element.style.setProperty(property, value);
            else element.style.removeProperty(property);
        });
};

let applyClasses = (element, classes) => {
    for (let name in classes)
        react(classes[name], (value) => {
            element.classList.toggle(name, value);
        });
};

let applyAttributes = (element, attributes) => {
    for (let name in attributes) {
        react(attributes[name], (value) => {
            if (!value) element.removeAttribute(name);
            else element.setAttribute(name, value === true ? "" : value);
        });
    }
};

// Utilities and control flow components
let lazy =
    (file, fb = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fb),
    If = ({ when, children, fallback }) => (() => (!!unpack(when) ? children : fallback)),
    For = ({ each, children, fallback }) =>
        map(each, (v, i) => isF(children) && children(v, i), fallback),
    map = (items, f, fb = d.createTextNode("")) => {
        let oldNodes,
            oldValues,
            live = Live();
        let done = false;
        if (!oldNodes) {
            oldValues = unpack(items);
            oldNodes = ifEmpty(oldValues.map(f), fb);
        }

        api.effect(() => {
            let newValues = unpack(items);
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
        return [live.sm, oldNodes, live.em];
    };

let createEl = (tag, props) => {
    let el = isSVG(tag)
        ? d.createElementNS("http://www.w3.org/2000/svg", tag)
        : d.createElement(tag);

    if (props != null) {

        for (let name in props) {
            if (name === 'className') {
                props.class = props[name];
                delete props[name];
            }
            if (
                name.slice(0, 5) === 'data-' ||
                name.slice(0, 5) === 'aria-'
            ) {
                el.setAttribute(name, value);
            }

            if (name === "ref" && isF(props.ref)) {
                props.ref(el, props);
                delete props[name];
            }
            // Event listener functions
            if (name.startsWith("on") && name.toLowerCase() in window) {
                el.addEventListener(
                    name.substring(2).toLowerCase(),
                    props[name]
                );
                delete props[name];
            }
        }

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
        // The rest of the props are attributes
        applyAttributes(el, props);
    }
    return el;
};

// https://github.com/dy/swapdom

let diff = (parent, a, b, end = null) => {
    let i = 0,
        cur,
        next,
        bi,
        n = b.length,
        m = a.length,
        same = (a, b) => a == b,
        replace = (a, b) => a.replaceWith(b),
        insert = (a, b, parent) => (a ? a.before(b) : parent.append(b)),
        remove = (a) => a.parentNode.removeChild(a);

    // skip head/tail
    while (i < n && i < m && same(a[i], b[i])) i++;
    while (i < n && i < m && same(b[n - 1], a[m - 1])) end = b[(--m, --n)];

    // append/prepend/trim shortcuts
    if (i == m) while (i < n) insert(end, b[i++], parent);
    // FIXME: can't use shortcut for childNodes as input
    // if (i == n) while (i < m) parent.removeChild(a[i++])
    else {
        cur = a[i];

        while (i < n) {
            (bi = b[i++]), (next = cur ? cur.nextSibling : end);

            // skip
            if (same(cur, bi)) cur = next;
            // swap / replace
            else if (i < n && same(b[i], next))
                replace(cur, bi), (cur = next);
            // insert
            else insert(cur, bi, parent);
        }

        // remove tail
        while (!same(cur, end))
            (next = cur.nextSibling), remove(cur), (cur = next);
    }

    return b;
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
