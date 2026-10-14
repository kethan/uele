// A rendering computation owns bindings it creates, but not prebuilt DOM it reuses.
let owner;
export const own = stop => {
    const parent = owner;
    const dispose = () => {
        if (!stop) return;
        const fn = stop;
        stop = undefined;
        parent?.delete(dispose);
        fn();
    };
    parent?.add(dispose);
    return dispose;
};
export const scope = fn => {
    const parent = owner, stops = new Set();
    const dispose = () => {
        const errors = [];
        for (const stop of stops) try { stop(); } catch (error) { errors.push(error); }
        stops.clear();
        if (errors.length) throw new AggregateError(errors, 'Cleanup failed');
    };
    owner = stops;
    try { return [fn(), dispose]; }
    catch (error) { dispose(); throw error; }
    finally { owner = parent; }
};
