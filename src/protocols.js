// Full-runtime protocols are separate so lite does not ship inactive handlers.
export const observe = target => {
    const observable = target?.[Symbol.observable]?.() || target;
    if (observable?.subscribe)
        return (read, emit, fail, end) => observable.subscribe(read, fail, end);
    if (target?.set && target.call)
        return (read, emit) => target(undefined, emit);
};

// Access the source through the clearable subscription slot, not a retained copy.
export const iterate = (source, read, fail, end, stopped) => {
    // Preserve synchronous protocol-discovery errors before starting async work.
    if (!source()?.[Symbol.asyncIterator]) return;
    (async () => {
        try {
            for await (const value of source()) {
                if (stopped()) break;
                read(value);
            }
            end();
        } catch (reason) { fail(reason); }
    })();
};
