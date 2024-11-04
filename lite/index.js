const
    api = {
        // Executes the provided function
        effect: void 0,
        // Returns false for any value (placeholder implementation)
        is: _ => false,
        // Retrieves the value (returns it as is)
        get: _ => _
    },
    // Utility function to handle and unwrap values of signals, observable, etc especially functions
    get = v => api.is(v) ? get(api.get(v)) : v?.call ? get(v()) : v,
    is = x => api.is(x) || isFunction(x),
    r = (x, callback) => is(x) ? api.effect(() => callback(get(x), true)) : callback(get(x), false),
    // Helpers
    isFunction = x => typeof x === "function",
    isString = x => typeof x === "string",
    isObject = x => typeof x === "object" && x !== null && !Array.isArray(x),
    isFalsey = x => typeof x === "boolean" || x == null,
    isSVG = x => /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(x),
    isNode = x => x instanceof Node || isFalsey(x) || !isObject(x) || is(x),
    toNode = x => x instanceof Node ? x : isFalsey(x) ? document.createComment(x) : document.createTextNode(x),
    Live = (sm = document.createTextNode(""), em = document.createTextNode(""), range = document.createRange()) => ({
        sm, em,
        replace: (...xs) => {
            if (!sm.parentNode || !em.parentNode) return;
            range.setStartAfter(sm);
            range.setEndBefore(em);
            range.deleteContents();
            sm.after(...xs);
        }
    }),

    process = (...children) =>
        children.flat(Infinity).flatMap((child) => {
            if (!is(child)) return toNode(child);
            let live = Live(), prev = "", done = false;
            r(child, (value) => {
                if (done && prev !== value) live.replace(...process(value));
                prev = value;
            });
            done = true;
            return [live.sm, ...process(prev), live.em];
        }),

    useLive = (val, live = Live(), prev = val) => [
        [live.sm, ...process(val), live.em],
        v => live.replace(...process(prev = isFunction(v) ? v(prev) : v))
    ],

    add = (tag) => (...children) => (tag.append(...process(children)), tag),

    props = new Map([
        ['style', (el, value, name) => isObject(value) && !is(value) ?
            Object.entries(value).map(([prop, val]) =>
                r(val, (v) => v !== undefined ?
                    el.style.setProperty(prop, v) :
                    el.style.removeProperty(prop))) :
            r(value, v => el.setAttribute(name, v))
        ],

        ['class', (el, value, name) => isObject(value) && !is(value) ?
            Object.entries(value).map(([prop, val]) =>
                r(val, v => el.classList.toggle(prop, v))) :
            r(value, v => el.setAttribute(name, v))
        ],

        ['ref', (el, value, props) => isFunction(value) && value(el, props)],
    ]),

    h = (tag, attrs, ...children) => {
        if (isString(tag)) {
            tag = isSVG(tag) ?
                document.createElementNS("http://www.w3.org/2000/svg", tag) :
                document.createElement(tag);

            if (attrs) {
                Object.entries(attrs).map(([name, value]) => {
                    if (name === "className") name = "class";
                    if (name.startsWith("on") && isFunction(value)) {
                        tag.addEventListener(name.slice(2).toLowerCase(), value);
                    }
                    else if (props.has(name)) {
                        props.get(name)(tag, value, name, attrs);
                    }
                    else {
                        r(value, (v) =>
                            (v == null || v === false) ?
                                tag.removeAttribute(name) :
                                tag.setAttribute(name, v === true ? "" : v)
                        )
                    }
                })
            }
            tag.append(...process(children))
            return tag
        }
        else if (isFunction(tag)) return tag({ children, ...attrs });
        else if (tag === h) return children;
        else if (Array.isArray(tag)) return tag;
        else if (isNode(attrs) && attrs) return h(tag, {}, [attrs, children]);
        return tag;
    };

export {
    h,
    r,
    is,
    get,
    api,
    props,
    add,
    useLive
};