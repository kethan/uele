// Full entry: one configured core plus source and namespace integrations.
import { h, r, api, add, props, useLive } from './core.js?full';
import { api as engine, is, get, sub } from 'usub';
import { install } from './install.js';
import { createMap } from './map.js';
// Compact upstream swapdom: live regions always pass arrays, not live NodeLists.
import swapdom from 'swapdom/deflate';
install(api, engine, is, get, sub);
api.diff = swapdom;
props.set('children', (node, value) => node.append(...add(value ?? [])));
const map = createMap(api, r, useLive);
export { h, r, api, add, props, useLive, map };
export { f, lazy } from './full-helpers.js';
