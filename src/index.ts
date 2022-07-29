import { effect, Observable, r } from "ulive";
export type Props = { [K in string]: any };
export type Factory<P> = (props?: P, ...children: (string | Node)[]) => Node;
const isR = <T = any>(x: Observable<T>) => x?._r;
const unR = (x: any): any => (isR(x) ? x.value : x);
const toR = <T = any>(x: Observable<T>) => (isR(x) ? x : r(x));
const Fragment = "Fragment";
const isSVG = (el: string) => {
    const svgRe = /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/; //URL: https://regex101.com/r/Ck4kFp/1
    return svgRe.test(el);
};
function appendChildren<T extends Node>(parent: T, ...children: (string | Node)[]) {
    effect(() => {
        let renderChildren = [...children];
        while (parent.firstChild) parent.removeChild(parent.firstChild);
        for (let i = 0; i < renderChildren.length; i++) {
            let child = unR(renderChildren[i]);
            if (child != null) {
                if (typeof child !== "object") {
                    child = document.createTextNode(child);
                } else if (Array.isArray(child)) {
                    renderChildren.splice(i, 1, ...child);
                    i--;
                    continue;
                }
                parent.appendChild(child);
            }
        }
    });
}

export function h<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    jsxProps?: Props,
    ...children: (string | Node)[]
): HTMLElementTagNameMap[K];
export function h(
    tagName: string,
    jsxProps?: Props,
    ...children: (string | Node)[]
): HTMLElement;
export function h(
    tagName: typeof Fragment,
    jsxProps?: Props,
    ...children: (string | Node)[]
): DocumentFragment;
export function h<F extends Factory<P>, P>(
    tagName: F,
    jsxProps?: P,
    ...children: (string | Node)[]
): ReturnType<F>;
export function h<F extends Factory<P>, P>(
    tagName: string | F,
    jsxProps?: Props | P,
    ...children: (string | Node)[]
): Node {
    if (typeof tagName === "function") {
        (jsxProps || (jsxProps = {})).children = children;
        return tagName(jsxProps as P & { children: (string | Node)[] });
    } else if (typeof tagName === "string") {
        const htmlElement = createElement(tagName, unR(jsxProps));
        appendChildren(htmlElement, ...children);
        return htmlElement;
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
    if (tagName === Fragment) {
        return document.createDocumentFragment();
    } else {
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
}
export { Fragment, effect, lazy, isR, unR, toR, r };