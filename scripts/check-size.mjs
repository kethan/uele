import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

// Check every shipped JS format, not just the CDN IIFEs. These tightened budgets
// protect the reductions documented in docs/BYTE_OPTIMIZATION.md.
const budgets = [
  ['dist/index.es.js', 5120, 2470],
  ['dist/index.cjs', 5200, 2470],
  ['dist/index.min.js', 5100, 2450],
  ['dist/index.umd.js', 5300, 2520],
  ['lite/dist/index.es.js', 3500, 1750],
  ['lite/dist/index.cjs', 3550, 1770],
  ['lite/dist/index.min.js', 3500, 1750],
  ['lite/dist/index.umd.js', 3700, 1830],
  ...['jsx-runtime', 'jsx-dev-runtime'].flatMap(folder => [
    [`${folder}/dist/index.es.js`, 240, 180],
    [`${folder}/dist/index.cjs`, 480, 245],
    [`${folder}/dist/index.min.js`, 450, 250],
    [`${folder}/dist/index.umd.js`, 650, 330],
  ]),
];
for (const [file, rawLimit, gzipLimit] of budgets) {
  const contents = readFileSync(new URL(`../${file}`, import.meta.url));
  const gzip = gzipSync(contents).length;
  console.log(`${file}: ${contents.length}/${rawLimit} bytes minified, ${gzip}/${gzipLimit} bytes gzip`);
  assert.ok(contents.length <= rawLimit, `${file} exceeded its minified size budget`);
  assert.ok(gzip <= gzipLimit, `${file} exceeded its gzip size budget`);
}
