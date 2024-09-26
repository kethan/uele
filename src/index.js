const
    // FinalizationRegistry to clean up subscriptions when objects are garbage collected
    registry = new FinalizationRegistry(unsub => unsub?.call()),

    // API object providing basic functions for handling effects and values
    api = {
        // Handle any reactive subscription
        // any: undefined,
        // // If any cleanup is requested
        // cleanup: undefined,
        // Executes the provided function
        effect: f => f(),
        // Returns false for any value (placeholder implementation)
        is: v => v?.call,
        // Retrieves the value (returns it as is)
        get: v => v?.call(),
    },

    // Utility function to handle and unwrap values of signals, observable, etc especially functions
    get = (v) => api.is(v) ? get(api.get(v)) : v?.call ? get(v()) : v,

    // Checks if the argument is considered an observable
    is = (arg) => arg && !!(
        arg[Symbol.asyncIterator] ||     // Async iterator
        arg.then ||                      // Promise
        api.is(arg) ||                   // Custom observable check
        arg.call                         // Function
    ),

    // https://github.com/dy/sube
    // Subscribe to an observable or value, and provide a callback for each value
    sub = (target, stop, unsub) => (next, error, cleanup) => target && (
        unsub = ((!api.any && (api.is(target) || target.call)) && api.effect(() => (next(get(target)), api.cleanup?.(cleanup), cleanup))) ||
        (
            target.then?.(v => (!stop && next(get(v)), cleanup?.()), error) ||
            target[Symbol.asyncIterator] && (async v => {
                try {
                    for await (v of target) { if (stop) return; next(get(v)) }
                    cleanup?.()
                } catch (err) { error?.(err) }
            })()
        ) && (_ => stop = 1) ||
        (api.any?.(target)?.(next, error, cleanup)),
        // register autocleanup
        registry.register(target, unsub),
        unsub
    ),

    // Helpers
    isFunction = (x) => typeof x === "function",
    isString = (x) => typeof x === "string",
    isObject = (x) => typeof x === "object" && x !== null && !Array.isArray(x),
    isFalsey = (x) => x === false || x === undefined || x === null,
    // https://github.com/vobyjs/voby
    isSVG = (x) => /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x),
    toNode = (x) => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(x),
    r = (x, callback, error) => is(x) ? sub(x)(v => callback(get(v), true), error) : callback(get(x), false),
    ifEmpty = (nodes, fallback) => (nodes.length > 0 ? nodes : [fallback]),
    Live = (sm = document.createTextNode(""), em = document.createTextNode("")) => ({
        sm,
        em,
        replace: (...xs) => {
            let range = document.createRange();
            range.setStartAfter(sm);
            range.setEndBefore(em);
            range.deleteContents();
            sm.after(...xs);
        },
    }),
    appendChildren = (fallback = "") => (...children) =>
        children.flat(Infinity).flatMap((child) => {
            if (!is(child)) return [toNode(child)];
            let live = Live(),
                done = false,
                node = [fallback];
            sub(child)((value) => {
                if (done) live.replace(...appendChildren(fallback)([value]));
                else node = [value];
            }, _ => live.replace(...appendChildren("")([fallback])))
            done = true;
            return [live.sm, ...appendChildren(fallback)(...node), live.em]
        }),
    Fragment = ({ children }) => {
        let el = document.createDocumentFragment();
        el.append(...appendChildren("")(children));
        return el;
    },
    h = (tag, props, ...children) => {
        if (isFunction(tag)) {
            (props || (props = {})).children = children && children.length == 1 ? children[0] : children;
            return tag(props);
        } else if (isString(tag)) {
            let element = isSVG(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag),
                usub = [];
            if (props) {
                for (const name in props) {
                    const value = props[name];
                    if (name === "ref" && isFunction(value)) {
                        value(element, props);
                    } else if (name === "className") {
                        element.setAttribute("class", value);
                    } else if (name.startsWith("on") && name.toLowerCase()) {
                        element.addEventListener(name.substring(2).toLowerCase(), value);
                        // Optionally, add cleanup code to remove event listeners
                        usub.push(() => element.removeEventListener(name.substring(2).toLowerCase(), value));
                    } else if (name === "style") {
                        if (isObject(value) && !is(value)) {
                            for (const prop in value) {
                                usub.push(
                                    r(value[prop], (v) =>
                                        v !== undefined
                                            ? element.style.setProperty(prop, v)
                                            : element.style.removeProperty(prop)
                                    )
                                );
                            }
                        } else {
                            usub.push(r(value, (v) => element.setAttribute("style", v)));
                        }
                    } else if (name === "class") {
                        if (isObject(value) && !is(value)) {
                            for (const className in value) {
                                usub.push(
                                    r(value[className], (v) => element.classList.toggle(className, v))
                                );
                            }
                        } else {
                            usub.push(r(value, (v) => element.setAttribute("class", v)));
                        }
                    } else {
                        // Handle all other attributes (including data-, aria-, and others)
                        usub.push(
                            r(value, (v) => {
                                if (v == null || v === false) {
                                    element.removeAttribute(name);
                                } else {
                                    element.setAttribute(name, v === true ? "" : v);
                                }
                            })
                        );
                    }
                }
            }
            registry.register(element, () => {
                usub.forEach(unsub => unsub?.());
                usub = [];
            });
            element.append(...appendChildren("")(children));
            return element;
        }
    };

// Utilities and control flow components
let lazy =
    (file, fallback = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fallback),

    If =
        ({ when, children, fallback }) =>
            () =>
                !!get(when) ? children : fallback,

    For = ({ each, children, fallback }) =>
        map(each, (v, i) => isFunction(children) && children(v, i), fallback),

    map = (items, callback, fallback = "") => {
        let oldNodes, oldValues;
        oldValues = get(items);
        oldNodes = ifEmpty(oldValues.map(callback), fallback);
        sub(items)((newValues) => {
            // Create a new map of old values to nodes
            let oldMap = new Map(oldValues.map((v, i) => [v, oldNodes[i]]));
            let newNodes = ifEmpty(newValues.map(newValue => oldMap.get(newValue) || callback(newValue)), fallback);
            let parent = oldNodes[0].parentNode;
            // // Use the diff function to update the DOM with the new node order
            api.diff ||= swap;
            api.diff(parent, oldNodes, newNodes, _ => _);
            // // Update old values and nodes for the next run
            oldValues = newValues;
            oldNodes = newNodes;
        });
        return oldNodes;
    },
    // https://github.com/dy/swapdom
    swap = (parent, a, b, end = null) => {
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
    },

    Switch = ({ fallback, children }) => () => {
        for (let child of children) {
            let result = child();
            if (result) return result;
        }
        return fallback || null;
    },

    Match = ({ when, children }) => () => (get(when) ? (isFunction(children) ? children(when) : children) : null),

    Suspense = ({ fallback = "", children }) => appendChildren(fallback)(children);

export {
    Fragment,
    h,
    h as createElement,
    api,
    r,
    get,
    sub,
    is,
    lazy,
    If,
    If as Show,
    For,
    map,
    Switch,
    Match,
    Suspense
};