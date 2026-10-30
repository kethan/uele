// Complete runnable JS payloads from the actual published-entry build artifacts.
import { rollup, VERSION as rollupVersion } from 'rollup';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import resolve from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve as path } from 'node:path';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const rows = [];
mkdirSync('examples/size-proof/dist', { recursive: true });
for (const [name, budget] of [['hello', 1000], ['counter', 1400], ['signal-counter', 1400], ['todo', 1800]]) {
    const entry = 'uele/tiny';
    const subpath = entry.replace(pkg.name, '.');
    const bundle = await rollup({ input: `examples/size-proof/${name}.js`, plugins: [{
        name: 'public-entry-builds',
        resolveId(id) {
            if (id === entry) return path(pkg.exports[subpath].import);
        }
    }, resolve()] });
    try {
        const { output } = await bundle.generate({ format: 'es' });
        if (output.length !== 1 || output[0].imports.length || output[0].dynamicImports.length)
            throw Error('Proof must include all JavaScript in one self-contained bundle');
        const { code } = await minify(output[0].code, {
            module: true, mangle: true, compress: { passes: 3, unsafe: false }
        });
        writeFileSync(`examples/size-proof/dist/${name}.js`, code);
        const gzip = gzipSync(code, { level: 9 }), normalGzip = gzipSync(code);
        writeFileSync(`examples/size-proof/dist/${name}.js.gz`, gzip);
        const row = { name, entry, minified: Buffer.byteLength(code), gzip: gzip.length,
            gzipDefault: normalGzip.length,
            brotli: brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
            sha256: createHash('sha256').update(code).digest('hex'),
            budget, passed: gzip.length < budget && normalGzip.length < budget };
        rows.push(row);
        if (!row.passed) process.exitCode = 1;
    } finally { await bundle.close(); }
}
console.table(rows.map(({ sha256, ...sizes }) => sizes));
writeFileSync('examples/size-proof/results.json', JSON.stringify({
    node: process.version, rollup: rollupVersion, terser: require('terser/package.json').version,
    ulive: require('ulive/package.json').version,
    build: 'current working-tree build of public entries; not a claim about an already-published npm release',
    unit: 'bytes; decimal kB = 1000 B', format: 'complete bundled ESM application JavaScript',
    compression: 'gzip level 9 and Node default level; Brotli quality 11', rows
}, null, 2) + '\n');
