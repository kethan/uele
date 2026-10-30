// Opt-in full correctness check; never rewrites production files.
// UELE_RENDERER_VARIANT=recursive-add npx vitest run --config vitest.renderer-experiment.config.js
import base from './vitest.config.js';
import { transform } from './benchmarks/renderer-variants.mjs';
const variant = process.env.UELE_RENDERER_VARIANT;
if (!['recursive-add', 'attrs-for-of', 'startsWith'].includes(variant))
    throw Error('Set UELE_RENDERER_VARIANT to recursive-add, attrs-for-of, or startsWith');
export default {
    ...base,
    plugins: [...(base.plugins || []), {
        name: 'isolated-renderer-correctness-experiment',
        enforce: 'pre',
        transform(code, id) { return transform(code, id, variant); }
    }],
    test: { ...base.test, name: `renderer-${variant}` }
};
