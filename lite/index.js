// Lite entry: the same core implementation with independent backend hooks.
import { h, r, api, add, props, useLive } from '../src/core.js?lite';
import { api as engine, is, get, sub } from 'usub/tiny';
import { install } from '../src/install.js';
install(api, engine, is, get, sub);
export { h, r, api, add, props, useLive };
