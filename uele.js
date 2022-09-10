let isObs = (arg) =>
    arg && !!(arg[Symbol.asyncIterator] || arg.on || arg.then || arg.subscribe),
    sube = (target, next, stop) =>
        target &&
        (target.on?.(next) ||
            target.subscribe?.(next) ||
            target.then?.((v) => !stop && next(v)) ||
            ((async (v) => {
                for await (v of target) { if (stop) return; next(v); }
            })() &&
                (() => (stop = 1)))),
    Live = () => {
        return {
            startMarker: d.createTextNode(''),
            endMarker: d.createTextNode(''),
            remove() {
                let range = d.createRange();
                range.setStartBefore(this.startMarker);
                range.setEndAfter(this.endMarker);
                range.deleteContents();
            },

            replaceChildren(...xs) {
                let range = d.createRange();
                range.setStartAfter(this.startMarker);
                range.setEndBefore(this.endMarker);
                range.deleteContents();
                this.startMarker.after(...xs);
            },
            get childNodes() {
                let childNodes = [];

                for (
                    let currentNode = this.startMarker.nextSibling;
                    currentNode != this.endMarker && currentNode;
                    currentNode = currentNode.nextSibling
                )
                    childNodes.push(currentNode);

                return childNodes;
            },

            get children() {
                return this.childNodes.filter((node) => node instanceof HTMLElement);
            },
        };
    },
    Fragment = ({ children }) => children,
    d = document,
    isF = (x) => typeof x === 'function',
    isS = (x) => typeof x === 'string',
    isO = (x) => typeof x === 'object',
    isFalse = (x) => !x,
    isFalsey = (x) => typeof x === 'boolean' || x === undefined || x === null,
    isSVG = (el) =>
        /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(
            el
        ),
    toNode = (x) => {
        if (x instanceof Node) return x;
        else if (isF(x)) return x();
        else if (isFalsey(x)) return d.createComment(x);
        else return d.createTextNode(x);
    },
    r = (x, f) => (isObs(x) ? sube(x, (v) => f(v)) && f(x()) : f(x)),
    appendChildren = (...children) =>
        children.flat(Infinity).flatMap((child) => {
            // Non-reactive values are untouched
            if (!isObs(child)) return [toNode(child)];

            let liveFragment = Live();
            sube(child, (value) => {
                if (!Array.isArray(value)) value = [value];
                liveFragment.replaceChildren(...appendChildren(...value));
            });
            return [
                liveFragment.startMarker,
                ...appendChildren(
                    isF(child)
                        ? Array.isArray(child())
                            ? child()
                            : toNode(child())
                        : toNode('')
                ),
                liveFragment.endMarker,
            ];
        }),
    h = (tag, props, ...children) => {
        if (isF(tag)) {
            (props || (props = {})).children = children;
            return tag(props);
        } else if (isS(tag)) {
            let element = createElement(tag, props);
            element.append(...appendChildren(...children));
            return element;
        }
    },
    applyStyles = (element, styles) => {
        for (let property in styles)
            r(styles[property], (value) => {
                if (value !== undefined) element.style.setProperty(property, value);
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
        for (let name in attributes)
            r(attributes[name], (value) => {
                if (isFalse(value)) element.removeAttribute(name);
                else element.setAttribute(name, value === true ? '' : value);
            });
    },
    lazy =
        (file, fb = '') =>
            (props) =>
                file()
                    .then((f) => f.default(props))
                    .catch(() => fb),
    createElement = (tag, props) => {
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
                if (name === 'ref' && isF(props.ref)) {
                    props.ref(el, props);
                    delete props[name];
                }
                // Event listener functions
                if (name.startsWith('on') && name in window) {
                    el.addEventListener(name.substring(2), props[name]);
                    delete props[name];
                }
            }

            // The rest of the props are attributes
            applyAttributes(el, props);
        }
        return el;
    };

var uele = {
    __proto__: null,
    Fragment: Fragment,
    h: h,
    lazy: lazy
};

if (typeof module < 'u') module.exports = uele;
else self.uele = uele;
