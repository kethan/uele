export function h(nameOrComponent: any, props: any, ...children: any[]): any;
export function Fragment({ children }: {
    children: any;
}): any;
import { effect } from "ulive";
export function lazy(file: any, fallback?: any): (props: any) => import("ulive").Observable<any>;
export function isR(x: any): any;
export function unR(x: any): any;
export function toR(x: any): any;
import { r } from "ulive";
export { effect, r };
