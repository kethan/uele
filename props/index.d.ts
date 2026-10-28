export type ReactiveProp<T> = T | (() => T) | { value: T } | { get(): T };
export type Action = (node: HTMLElement) => void | (() => void);
export interface AppProps {
    show?: ReactiveProp<boolean>;
    text?: ReactiveProp<string | number | null | undefined>;
    data?: Record<string, ReactiveProp<string | number | boolean | null | undefined>>;
    aria?: Record<string, ReactiveProp<string | number | boolean | null | undefined>>;
    bindValue?: [ReactiveProp<string | number | null | undefined>, (value: string, event: Event) => void];
    indeterminate?: ReactiveProp<boolean>;
    bindSelect?: [ReactiveProp<string | number | null | undefined>, (value: string, event: Event) => void]
        | [ReactiveProp<Array<string | number>>, (value: string[], event: Event) => void];
    bindChecked?: [ReactiveProp<boolean>, (value: boolean, event: Event) => void];
    listen?: Record<string, EventListenerOrEventListenerObject | [EventListenerOrEventListenerObject, boolean | AddEventListenerOptions]>;
    use?: Action | Action[];
}
export interface PropTarget {
    props: Map<string, (...args: any[]) => any>;
    r: (...args: any[]) => any;
}
export declare function useProps<T extends PropTarget>(target: T): T;
export declare function useProps(): PropTarget;

export interface AutoScrollOptions {
    /** Distance from bottom (pixels) that counts as following. Default 48. */
    threshold?: number;
}
/** DOM action for use={autoScroll()}; follows mutations only while near bottom. */
export declare function autoScroll(options?: AutoScrollOptions): Action;
