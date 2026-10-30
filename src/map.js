import { noop, track } from '../utils/index.js';

// Bind the optional list primitive to this entry's actual core instance.
export const createMap = (api, r, useLive) => {
const map = (items, callback, fallback = "", key = v => v) => {
    let oldMap = new Map();
    const build = (values) => {
        const prev = oldMap; oldMap = new Map();
        // non-iterables (a pending promise, a number) render the fallback instead
        const nodes = (values?.[Symbol.iterator] && [...values] || []).map((v, i) => {
            const k = key(v, i), node = prev.get(k) ?? callback(v, i);
            prev.delete(k), oldMap.set(k, node); // consume - duplicate keys must not reuse a node
            return node;
        });
        return nodes.length ? nodes : [fallback];
    };
    const [live, setLive] = useLive(build(api.get(items) || []));
    // source errors keep the previous content; the sub dies with the list region
    track(live[0], r(items, (values) => setLive(build(values || [])), noop));
    return live;
};

return map;
};
