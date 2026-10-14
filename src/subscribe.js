import { own, scope } from './scope.js';

// Explicit ownership, without a FinalizationRegistry holding effect closures alive.
// Clear callback/source references even when a library retains its disposed effect.
const release = stop => typeof stop === 'function' ? stop() : stop?.unsubscribe?.();
export const subscriber = (api, get, observe, iterate) => (target, next, error, cleanup) => {
    let stopped = false, stop, children;
    const finish = () => { const done = cleanup; cleanup = undefined; done?.(); };
    const end = () => {
        if (stopped) return;
        stopped = true;
        const disposer = stop;
        stop = target = next = error = undefined;
        try { release(disposer); } finally { finish(); }
    };
    const cancel = () => {
        const nested = children;
        children = undefined;
        try { nested?.(); } finally { end(); }
    };
    const emit = value => { if (!stopped) next(value); };
    const read = value => {
        if (!stopped) {
            children?.();
            const dispose = scope(() => emit(get(value)))[1];
            if (stopped) dispose(); else children = dispose;
        }
    };
    const fail = reason => {
        if (!stopped) {
            const callback = error;
            try { callback?.(reason); } finally { cancel(); }
        }
    };
    try {
        const subscribe = observe?.(target);
        if (subscribe) stop = subscribe(read, emit, fail, end);
        else if (api.is(target) || target?.call)
            stop = api.any?.(target)?.(emit, fail, end) || api.effect?.(() => {
                read(target);
                api.cleanup?.(finish);
            });
        else if (target?.then) target.then(value => { read(value); end(); }, fail);
        else iterate?.(() => target, read, fail, end, () => stopped);
        // Synchronous completion can happen before subscribe returns its disposer.
        if (stopped) { release(stop); stop = undefined; }
    } catch (reason) { cancel(); throw reason; }
    return own(cancel);
};
