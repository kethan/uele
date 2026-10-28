import { h, props } from 'uele';

// A private, inert marker uses the existing prop-disposer protocol. No effect
// runner, public lifecycle API, MutationObserver, or core-size change is needed.
const key = '__uele_cleanup';
const handler = (_node, dispose) => dispose;
export const onTeardown = (cleanup) => {
    props.set(key, handler);
    return h('template', { [key]: cleanup });
};
