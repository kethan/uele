import { effect, Observable, o } from "ulive";
export type Props = { [K in string]: any };
export type Factory<P> = (props?: P, ...children: (string | Node)[]) => Node;

let isO = (x: any) => x?._o;

let unO = (x: any): any => (isO(x) ? x() : x);

let toO = <T = any>(x: any): Observable<T> => (isO(x) ? x : o(x));

let Fragment = ({ children }) => children;

let isSVG = (el: string) => {
    let svgRe = /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/; //URL: https://regex101.com/r/Ck4kFp/1
    return svgRe.test(el);
};

let toNode = (x) => {
    if (x instanceof Node) return x;
    else if (typeof x === "boolean" || x === undefined || x === null)
        return document.createComment(x);
    else return document.createTextNode(x);
};

let react = (x, f) => {
    x?._o ? effect(() => f(x())) : f(x);
};

let appendChildren = <T extends Node>(element: T, ...children: (string | Node)[]) =>
    children.flat(Infinity).flatMap((child) => {
        // @ts-ignore
        if (typeof child === "function") child = effect(child);
        if (isO(child)) {
            let prev: Node[] = [];
            effect(() => {
                let arr = [unO(toO(child))].flat(Infinity);
                let newNodes = arr.map(c => {
                    let node = toNode(c);
                    element.insertBefore(node, prev[0] || null)
                    return node
                })
                for (let i = 0; i < prev.length; i++) {
                    element.removeChild(prev[i]);
                }
                prev = newNodes
            });
            return prev;
        }
        else return [toNode(child)];

    });

export function h<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    props?: Props,
    ...children: (string | Node)[]
): HTMLElementTagNameMap[K];
export function h(
    tagName: string,
    props?: Props,
    ...children: (string | Node)[]
): HTMLElement;
export function h(
    tagName: typeof Fragment,
    props?: Props,
    ...children: (string | Node)[]
): DocumentFragment;
export function h<F extends Factory<P>, P>(
    tagName: F,
    props?: P,
    ...children: (string | Node)[]
): ReturnType<F>;
export function h<F extends Factory<P>, P>(
    tagName: string | F,
    props?: Props | P,
    ...children: (string | Node)[]
): Node {
    if (typeof tagName === "function") {
        (props || (props = {})).children = children;
        return tagName(props as P | P & { children: (string | Node)[] });
    } else if (typeof tagName === "string") {
        let element = createElement(tagName, unO(props));
        element.append(...appendChildren(element, ...children));
        return element;
    }
}

let lazy = (file: Function, fallback = null) => {
    let content = o(fallback);
    return (props: Props & { children: (string | Node)[] }) => {
        file().then((f: any) => {
            content(f.default(props));
        });
        return content;
    };
};

let applyStyles = (element, styles) => {
    for (const property in styles)
        react(styles[property], value => {
            if (value !== undefined)
                element.style.setProperty(property, value)
            else
                element.style.removeProperty(property)
        })
}

// Class list from an object mapping from
// class names to potentially reactive booleans
let applyClasses = (element, classes) => {
    for (const name in classes)
        react(classes[name], value => {
            element.classList.toggle(name, value)
        })
}


// Attributes from an object with
// potentially reactive and/or undefined values
let applyAttributes = (element, attributes) => {
    for (const name in attributes)
        react(attributes[name], value => {
            if (value !== undefined)
                element.setAttribute(name, value)
            else
                element.removeAttribute(name)
        })
}

let createElement = (tagName: string, props?: Props) => {
    let element = isSVG(tagName)
        ? document.createElementNS("http://www.w3.org/2000/svg", tagName)
        : document.createElement(tagName);

    if (props != null) {
        // Apply overloaded props, if possible
        // Inline style object
        if (typeof props.style === "object" && !isO(props.style)) {
            applyStyles(element, props.style)
            delete props.style
        }
        // Classes object
        if (typeof props.class === "object" && !isO(props.class)) {
            applyClasses(element, props.class)
            delete props.class
        }

        for (const name in props) {
            if (name === 'ref' && typeof props.ref === 'function')
                props.ref(element, props)
            // Event listener functions
            if (name.startsWith("on") && name.toLowerCase() in window) {
                element.addEventListener(name.toLowerCase().substring(2), props[name]);
            }
        }

        // The rest of the props are attributes
        applyAttributes(element, props)

    }
    return element;
}

export { Fragment, effect, lazy, isO as isR, unO as unR, toO as toR, o };