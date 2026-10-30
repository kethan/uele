// Supported entry configuration, not renderer-method replacement.
import { namespace } from '../utils/namespaces.js';
export const install = (api, engine, is, get, sub) => {
    Object.assign(api, { is, get, sub, engine, ns: namespace });
};
