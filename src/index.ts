import { effect, Observable, r } from "ulive";
export type Props = { [K in string]: any };
export type Factory<P> = (props?: P, ...children: (string | Node)[]) => Node;
const isR = (x: any) => x?._r;
const unR = (x: any): any => (isR(x) ? x.value : x);
const toR = <T = any>(x: any): Observable<T> => (isR(x) ? x : r(x));
const Fragment = ({ children }) => children;
const isSVG = (el: string) => {
    const svgRe = /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/; //URL: https://regex101.com/r/Ck4kFp/1
    return svgRe.test(el);
};

let toNode = (x) => {
    if (x instanceof Node) return x;
    else if (typeof x === "function") return x();
    else if (typeof x === "boolean" || x === undefined || x === null)
        return document.createComment(x);
    else return document.createTextNode(x);
};

const appendChildren = <T extends Node>(element: T, ...children: (string | Node)[]) =>
    children.flat(Infinity).flatMap((child) => {
        if (!isR(child)) return [toNode(child)];
        let prev: Node[] = [];
        effect(() => {
            let arr = [null, unR(toR(child))].flat(Infinity);
            const newNodes = arr.map(c => {
                const node = toNode(c);
                element.insertBefore(node, prev[0] || null)
                return node
            })
            for (let i = 0; i < prev.length; i++) {
                element.removeChild(prev[i]);
            }
            prev = newNodes
        });
        return prev;
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
        const element = createElement(tagName, unR(props));
        element.append(...appendChildren(element, ...children));
        return element;
    } else {
        throw `Invalid ${tagName}`;
    }
}

const lazy = (file: Function, fallback = null) => {
    const content = r(fallback);
    return (props: Props & { children: (string | Node)[] }) => {
        file().then((f: any) => {
            content.value = f.default(props);
        });
        return content;
    };
};

function createElement(tagName: string, props?: Props) {
    const element = isSVG(tagName)
        ? document.createElementNS("http://www.w3.org/2000/svg", tagName)
        : document.createElement(tagName);
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
                }
                else if (prop === 'ref' && typeof props.ref === 'function') {
                    props.ref(element, props)
                }
                else if (prop === 'className') {
                    element.setAttribute('class', propsValue)
                }
                // else if (prop === 'htmlFor') {
                //     element.setAttribute('for', propsValue)
                // }
                // else if (prop === 'xlinkHref') {
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
    return element;
}

export { Fragment, effect, lazy, isR, unR, toR, r };