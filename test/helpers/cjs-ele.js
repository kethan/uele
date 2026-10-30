// Bundle-conformance shim (CJS runs): route every consumer through one native
// require of the built file, so the test module, the jsx runtime's own
// `require('uele')` and the 'usub' alias all share the same instance the way
// real Node does (one require.cache entry per resolved path).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const uele = require('../../dist/index.cjs');

export const {
	add, api, f, h, lazy, map, props, r, useLive
} = uele;
