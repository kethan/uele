import { api, h, useLive } from 'uele';
import { api as storeApi, store } from 'ustor';

// Application example helper, not a new uele API. Call once after configuring
// the signal engine, before creating stores. Do not switch engines with live stores.
export const connectStore = (target = api) => {
    const { signal, get, set, is, computed, effect } = target;
    if (!signal || !get || !set || !is) throw new Error('Configure a uele signal integration before connecting ustor');
    Object.assign(storeApi, { signal, get, set, is, computed, getComputed: get, effect });
    return store;
};

// Keep the example's DOM subscriptions in a removable region. Removing an
// arbitrary DOM node alone is not equivalent to uele region teardown.
export const region = (content) => {
    const [nodes, replace] = useLive(content);
    return { view: h('div', nodes), dispose: () => replace(null) };
};
