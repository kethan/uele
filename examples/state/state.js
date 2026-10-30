// A deliberately small callback-based State, kept exactly as the supplied API.
export const State = (val, cb = []) => (c) =>
    c === void 0 ? val
        : c.call ? cb.splice.bind(cb, cb.push(c) - 1, 1, 0)
        : ((val = c), cb.map(f => f && f(val)));

// Full uele already understands .subscribe(). Give each subscriber an initial
// value, then let the renderer own the returned unsubscribe function.
export const state = value => {
    const cell = State(value);
    cell.subscribe = next => {
        const stop = cell(next);
        try { next(cell()); } catch (error) { stop(); throw error; }
        return stop;
    };
    return cell;
};
