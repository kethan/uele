import type { PropTarget } from 'uele/props';

export interface RendererTarget extends PropTarget {
    api: object;
}
export interface Configuration<T extends RendererTarget = typeof import('uele')> {
    /** Signal installer, e.g. preactSignals. Pass the function, not its result. */
    signals?: (api: T['api']) => unknown;
    /** Diff installer, e.g. stage0. */
    diff?: (api: T['api']) => unknown;
    /** Ordered prop packs; later registrations replace earlier names. */
    props?: readonly ((target: T) => unknown)[];
}
/** Startup configuration, not an isolated app or a live-adapter switch. */
export declare function configure<T extends RendererTarget = typeof import('uele')>(
    options?: Configuration<T>, target?: T
): T;
