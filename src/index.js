
const
    // FinalizationRegistry to clean up subscriptions when objects are garbage collected
    registry = new FinalizationRegistry(unsub => unsub?.call()),
    // API object providing basic functions for handling effects and values
    api = {
        // Handle any reactive subscription
        // any: undefined,
        // If any cleanup is requested
        // cleanup: undefined,
        // Executes the provided function
        effect: f => f(),
        // Returns false for any value (placeholder implementation)
        is: v => v.call,
        // Retrieves the value (returns it as is)
        get: v => v?.call(),
    },
    // Utility function to handle and unwrap values of signals, observable, etc especially functions
    // get = (v) => api.is(v) ? get(api.get(v)) : v.call ? get(v()) : v,
    get = v => api.is(v) ? get(api.get(v)) : (v.call ? get(v()) : v),

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
        unsub = ((!api.any && (api.is(target) || target.call)) && api.effect(() => ((next(get(target))), api.cleanup?.(cleanup), cleanup))) ||
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
    isFalsey = (x) => typeof x === "boolean" || x == null,
    // https://github.com/vobyjs/voby
    isSVG = (x) => /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x),
    toNode = (x) => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(x),
    r = (x, callback, error, clean) => is(x) ? sub(x)(v => callback(get(v), true), error, clean) : callback(get(x), false),
    Live = (sm = document.createTextNode(""), em = document.createTextNode("")) => ({
        sm,
        em,
        replace: (...xs) => {
            if (!sm.parentNode || !em.parentNode) return;
            let range = document.createRange();
            range.setStartAfter(sm);
            range.setEndBefore(em);
            range.deleteContents();
            sm.after(...xs);
        },
    }),

    useLive = (val, live = Live(), prev = val) => [
        [live.sm, ...add()(val), live.em],
        (v) => live.replace(...add()(prev = isFunction(v) ? v(prev) : v))
    ],

    add = (fallback = "") => (...children) =>
        children.flat(Infinity).flatMap((child) => {
            if (!is(child)) return toNode(child);
            let live = Live(), prev, done = false;
            sub(child)((value) => {
                if (done && prev !== value) {
                    live.replace(...add(fallback)(value))
                }
                prev = value
            });
            done = true;
            return [live.sm, ...add(fallback)(prev), live.em];
        }),

    props = new Map([

        ['style', (el, value, name) => isObject(value) ?
            Object.entries(value).map(([prop, val]) => r(val, (v) =>
                v !== undefined
                    ? el.style.setProperty(prop, v)
                    : el.style.removeProperty(prop))
            ) :
            r(value, v => el.setAttribute(name, v))
        ],

        ['class', (el, value, name) => isObject(value) ?
            Object.entries(value).map(([prop, val]) =>
                r(val, v => el.classList.toggle(prop, v))
            ) :
            r(value, v => el.setAttribute(name, v))
        ],

        ['ref', (el, value, props) => isFunction(value) && value(el, props)],

    ]),

    f = (tag) =>
        new Proxy(
            {},
            {
                get:
                    (_, prop) =>
                        (...kids) =>
                            tag(prop, ...kids),
            }
        ),

    h = (tag, attrs, ...children) => {

        if (tag === h) return children;

        if (isFunction(tag)) return tag({ children, ...attrs });

        if (isString(tag)) {
            tag = isSVG(tag)
                ? document.createElementNS("http://www.w3.org/2000/svg", tag)
                : document.createElement(tag);
            let unsubs = [], unsub;

            if (attrs) {
                Object.entries(attrs).map(([name, value]) => {
                    if (name === "className") name = "class";
                    // name = name === "className" ? "class" : name;

                    if (name.startsWith("on") && isFunction(value)) {
                        tag.addEventListener(name.slice(2).toLowerCase(), value);
                        unsubs.push(() => tag?.removeEventListener(name.substring(2).toLowerCase(), value));
                    }
                    else if (props.has(name)) {
                        unsub = props.get(name)(tag, value, name, attrs);
                        unsub && unsubs.push(...(Array.isArray(unsub) ? unsub : [unsub]));
                    }
                    else {
                        unsubs.push(r(value, (v) =>
                            (v == null || v === false) ?
                                tag.removeAttribute(name) :
                                tag.setAttribute(name, v === true ? "" : v)
                        ));
                    }
                })
            }

            registry.register(tag, () => {
                unsubs.forEach((unsub) => unsub?.());
                unsubs = [];
            });

            tag.append(...add()(children));
            return tag;
        }

        // else if(Array.isArray(tag)) {
        //     return h(document.createDocumentFragment(), {}, ...tag)
        // }
    }

let lazy =
    (file, fallback = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fallback),

    If =
        ({ when, children, fallback = "" }) =>
            () => !!get(when) ?
                isFunction(children[0]) ?
                    children[0](!!get(when)) :
                    children :
                fallback,

    Switch = ({ fallback = "", children }) => () => {
        for (let child of children) {
            let result = isFunction(child) ? child() : child;
            if (result) return result;
        }
        return fallback;
    },

    Match = ({ when, children }) => If({ when, children, fallback: "" }),

    Suspense = ({ fallback = "", children }) => add(fallback)(children),

    Dynamic = ({ component, children, ...props }) =>
        () =>
            isFunction(component) ?
                component(props, children)
                : add("")(component),

    For = ({ each, children, fallback }) =>
        map(each, isFunction(children[0]) && children[0], fallback),

    map = (items, callback, fallback = "") => {
        let oldNodes, oldValues, done = false,
            ifEmpty = (nodes, fallback) => (nodes.length > 0 ? nodes : add("")(fallback));

        oldValues = get(items);
        oldNodes = ifEmpty(oldValues.map(callback), fallback);
        sub(items)((newValues) => {
            if (done) {
                // Create a new map of old values to nodes
                let oldMap = new WeakMap(oldValues.map((v, i) => [v, oldNodes[i]]));
                let newNodes = ifEmpty(newValues.map(newValue => oldMap.get(newValue) || callback(newValue)), fallback);
                let parent = oldNodes[0].parentNode;
                // Use the diff function to update the DOM with the new node order
                api.diff = api.diff || diff;
                // console.log('parent', parent, oldNodes, newNodes);
                api.diff(parent, oldNodes, newNodes, _ => _);
                // Update old values and nodes for the next run
                oldValues = newValues;
                oldNodes = newNodes;
            }
        });
        done = true;
        return oldNodes;
    },
    // https://github.com/dy/swapdom
    diff = (parent, a, b, end = null) => {
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
    props,
    add,
    api,
    r,
    get,
    sub,
    is,
    useLive,
    lazy,
    If,
    If as Show,
    For,
    map,
    Switch,
    Match,
    Suspense,
    Dynamic
}