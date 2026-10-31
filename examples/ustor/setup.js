import { api } from 'uele';
import { api as storeApi, store } from 'ustor';

// Application example helper, not a new uele API. Call once after configuring
// the signal engine, before creating stores. Do not switch engines with live stores.
export const connectStore = (target = api) => {
    const { signal, get, set, is, computed, effect } = target;
    if (!signal || !get || !set || !is) throw new Error('Configure a uele signal integration before connecting ustor');
    Object.assign(storeApi, { signal, get, set, is, computed, getComputed: get, effect });
    return store;
};
