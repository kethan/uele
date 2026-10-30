import type { Api as AuthoringApi } from './types.js';
export { h, r, add, props, useLive } from './types.js';
export type { Props, Child, CellLike, Component, Factory, Fragment } from './types.js';

/** Renderer hooks, not the configuration object of a subscription library. */
export interface Api extends Omit<AuthoringApi, 'is' | 'get'> {
    engine?: AuthoringApi;
    is: (value: any) => any;
    get: (value: any) => any;
    sub?: (source: any, next: (value: any) => void,
        error?: (error: any) => void, cleanup?: () => void) => void | (() => void);
    ns?: (tag: string) => string | null | undefined;
}
export declare const api: Api;
