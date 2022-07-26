let api = {
        effect: (f) => f(),
        memo: (f) => f(),
        is: (v) => false,
        get: (v) => v,
    },
    get = (v) => {
        let curr = v;
        if (isF(curr)) {
            return get(curr());
        } else if (api.is(v)) {
            curr = api.get(v);
            return get(curr);
        }
        return curr;
    },
    //https://github.com/dy/sube
    sube = (target, next, error, stop) =>
        target &&
        ((target.call &&
            !api.is(target) &&
            api.effect(() => next(get(target)))) ||
            (api.is(target) && api.effect(() => next(get(target)))) ||
            target.subscribe?.((v) => next(get(v)), error) ||
            ((target.then?.((v) => !stop && next(get(v)), error) ||
                (async v => {
                    try {
                        for await (v of target) {
                            if (stop) return;
                            next(get(v));
                        }
                    } catch (err) {
                        error?.(err);
                    }
                })()) &&
                ((_) => (stop = 1)))),
    r = (x, f, e) =>
        isObs(x) ? sube(x, (v) => f(get(v), true), e) : f(get(x), false);

let d = document,
    text = (v) => d.createTextNode(v),
    // MIT License
    // Copyright (c) 2021 Daniel Ethridge
    Live = (sm = text(""), em = text("")) => ({
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
        else return text(x);
    },
    applyStyles = (element, styles) => {
        for (let property in styles)
            r(styles[property], (value) => {
                if (value !== undefined)
                    element.style.setProperty(property, value);
                else element.style.removeProperty(property);
            });
    },
    applyClasses = (element, classes) => {
        for (let name in classes)
            r(classes[name], (value) => {
                element.classList.toggle(name, value);
            });
    },
    applyAttributes = (element, attributes) => {
        for (let name in attributes) {
            r(attributes[name], (value) => {
                if (!value) element.removeAttribute(name);
                else element.setAttribute(name, value === true ? "" : value);
            });
        }
    };

// Helpers
let isF = (x) => typeof x === "function",
    isS = (x) => typeof x === "string",
    isO = (x) => typeof x === "object",
    isFalsey = (x) => typeof x === "boolean" || x === undefined || x === null,
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
    ifEmpty = (nodes, fb) => (nodes.length > 0 ? nodes : [fb]);

let appendChildren = (...children) =>
        children.flat(Infinity).flatMap((child) => {
            if (!isObs(child)) return [toNode(child)];
            else {
                let liveFragment = Live(),
                    done = false,
                    node = [toNode("")];
                sube(child, (value) => {
                    if (done) liveFragment.replace(...appendChildren([value]));
                    else node = [value];
                });
                done = true;
                return [
                    liveFragment.sm,
                    ...appendChildren(...node),
                    liveFragment.em,
                ];
            }
        }),
    h = (tag, props, ...children) => {
        if (isF(tag)) {
            (props || (props = {})).children =
                children && children.length == 1 ? children[0] : children;
            return tag(props);
        } else if (isS(tag)) {
            let element = createEl(tag, props);
            element.append(...appendChildren(children));
            return element;
        }
    },
    createEl = (tag, props) => {
        let el = isSVG(tag)
            ? d.createElementNS("http://www.w3.org/2000/svg", tag)
            : d.createElement(tag);

        if (props != null) {
            for (let name in props) {
                if (name === "className") {
                    props.class = props[name];
                    delete props[name];
                }
                if (name.slice(0, 5) === "data-" || name.slice(0, 5) === "aria-") {
                    el.setAttribute(name, props[name]);
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

// Utilities and control flow components
let lazy =
    (file, fb = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fb),
    If =
        ({ when, children, fallback }) =>
            () =>
                !!get(when) ? children : fallback,
    For = ({ each, children, fallback }) =>
        map(each, (v, i) => isF(children) && children(v, i), fallback),
    map = (items, f, fb = text("")) => {
        let oldNodes,
            oldValues,
            live = Live();
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
        return [live.sm, oldNodes, live.em];
    },
    // https://github.com/dy/swapdom
    diff = (parent, a, b, end = null) => {
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

export { For, Fragment, If, If as Show, api, h as createElement, get, h, isObs, lazy, map, r };
