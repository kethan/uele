/** Compile-time opaque handle for a native cell; no runtime wrapper is created. */
declare const cellType: unique symbol;
export interface Cell<T> { readonly [cellType]: T }
/** Common native cell interfaces accepted by the installed integration. */
export type Readable<T> = Cell<T> | (() => T) | { readonly value: T } | { get(): T } | { readonly state: T };
export declare function signal<T>(value: T): Cell<T>;
export declare function computed<T>(fn: () => T): Cell<T>;
export declare function effect(fn: () => void): () => void;
export declare function batch<T>(fn: () => T): T;
export declare function untracked<T>(fn: () => T): T;
export declare function read<T>(cell: Readable<T>): T;
/** Native library cells remain accepted; their representation is library-dependent. */
export declare function read(cell: unknown): any;
export declare function write(cell: any, value: any): void;
export declare function isCell(value: unknown): boolean;
export declare function canEffect(): boolean;
export declare function canCompute(): boolean;
export declare function active(): Record<string, unknown>;
