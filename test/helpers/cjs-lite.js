// The lite surface for CJS bundle runs - the same single-instance rule as
// cjs-ele.js, but exposing only what lite/dist/index.cjs exports.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lite = require('../../lite/dist/index.cjs');

export const { add, api, get, h, is, props, r, sub, useLive } = lite;
