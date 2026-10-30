// All exports, uniform bundled ESM measurement; core/tiny entry.
import { rollup } from 'rollup';
import { minify } from 'terser';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
for (const [entry, rawBudget, gzipBudget] of [
    ['index', 1875, 982]
]) {
    const bundle = await rollup({ input: fileURLToPath(new URL(`../core/${entry}.js`, import.meta.url)) });
    try {
        const { output } = await bundle.generate({ format: 'es' });
        const { code } = await minify(output[0].code, {
            module: true, compress: { passes: 3 }, mangle: true
        });
        const raw = Buffer.byteLength(code), gzip = gzipSync(code).length;
        console.log(`core/${entry}: ${raw}/${rawBudget} minified, ${gzip}/${gzipBudget} gzip`);
        if (raw > rawBudget || gzip > gzipBudget) process.exitCode = 1;
    } finally { await bundle.close(); }
}
