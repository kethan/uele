import { effect, r } from "ulive";

const isR = (x) => x?._r;
const unR = (x) => (isR(x) ? x.value : x);
const toR = (x) => (isR(x) ? x : r(x));

const isSVG = (element) => {
    const svgRe = /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/; //URL: https://regex101.com/r/Ck4kFp/1
    return svgRe.test(element);
};

let isChild = (x) =>
    isR(x) ||
    x instanceof Node ||
    Array.isArray(x) ||
    x == null ||
    !(typeof x === "function" || typeof x === "object");

let toNode = (x) => {
    if (x instanceof Node) return x;
    else if (typeof x === "boolean" || x === undefined || x === null)
        return document.createComment(x);
    else return document.createTextNode(x);
};


let childrenToNodes = (...children) => {
    return children.flat(Infinity).flatMap((child) => {
        if (!isR(child)) return [toNode(child)];

        let node = toNode(unR(child));
        effect(() => {
            let oldNode = node;
            node = toNode(unR(child));
            oldNode.replaceWith(node);
        });
        return [node];
    });
}

let e = (name) => (...variadic) => {
    if (isChild(variadic[0])) {
        const element = document.createElement(name);
        element.append(...childrenToNodes(...variadic));
        return element;
    }
    let [props, ...children] = variadic;

    const element = isSVG(name)
        ? document.createElementNS("http://www.w3.org/2000/svg", name)
        : document.createElement(name);

    effect(() => {
        if (props != null) {
            Object.keys(props || {}).forEach(prop => {
                let propsValue = unR(props[prop]);
                if (prop === 'style') {
                    if (typeof propsValue === "string") {
                        element.style.cssText = propsValue;
                    } else if (typeof propsValue === "object") {
                        for (const k of Object.keys(propsValue)) {
                            const property = unR(propsValue[k]);
                            element.style.setProperty(k, property);
                        }
                    }
                } else if (prop === 'ref' && typeof props.ref === 'function') {
                    props.ref(element, props)
                } else if (prop === 'className') {
                    element.setAttribute('class', propsValue)
                }
                // else if (prop === 'htmlFor') {
                //     element.setAttribute('for', propsValue)
                // } else if (prop === 'xlinkHref') {
                //     element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', propsValue)
                // } 
                else if (prop.startsWith("on") && prop.toLowerCase() in window) {
                    element.addEventListener(prop.toLowerCase().substring(2), propsValue);
                } else {
                    element.setAttribute(prop, propsValue)
                }
            })
        }
    });
    element.append(...childrenToNodes(...children));
    return element;
};

const lazy = (file, fallback = null) => {
    const content = r(fallback);
    return (props) => {
        file().then((f) => {
            content.value = f.default(props);
        });
        return content;
    };
};

export const h = (nameOrComponent, props, ...children) => {
    if (typeof nameOrComponent === "string") {
        let makeElement = e(nameOrComponent);
        return props ? makeElement(props, ...children) : makeElement(...children);
    }
    (props || (props = {})).children = children;
    return nameOrComponent(props);
};
const Fragment = ({ children }) => children;

export { Fragment, effect, lazy, isR, unR, toR, r };