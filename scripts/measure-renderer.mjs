// Non-invasive experiments: transforms exist only in isolated Rollup bundles.
// Run: UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs
import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve as path, dirname } from 'node:path';
import { transform } from '../benchmarks/renderer-variants.mjs';
import { chromium as playwright } from '@playwright/test';
import chromium from '@sparticuz/chromium';

const variants = ['baseline', 'passes-1', 'passes-5', 'startsWith', 'attrs-for-of', 'recursive-add', 'api-r'];
const entries = { core: 'core/index.js', full: 'src/index.js', lite: 'lite/index.js' };
const rows = [], bundles = new Map();
const outputPrefix = process.argv[2] || 'benchmarks/renderer-results';
for (const variant of variants) for (const [tier, input] of Object.entries(entries)) {
    const bundle = await rollup({ input, plugins: [{
        name: 'isolated-experiment',
        resolveId(id, importer) {
            if (/core\.js\?(full|lite)$/.test(id)) return path(dirname(importer.split('?')[0]), id);
        },
        load(id) {
            if (/core\.js\?(full|lite)$/.test(id)) return readFileSync(id.split('?')[0], 'utf8');
        },
        transform(code, id) { return transform(code, id, variant); }
    }, resolve()] });
    try {
        const { output } = await bundle.generate({ format: 'es' });
        const { code } = await minify(output[0].code, { module: true, mangle: true,
            compress: { passes: variant === 'passes-1' ? 1 : variant === 'passes-5' ? 5 : 3, unsafe: false } });
        const row = { variant, tier, minified: Buffer.byteLength(code),
            gzip: gzipSync(code, { level: 9 }).length,
            brotli: brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length };
        rows.push(row); bundles.set(`${variant}/${tier}`, code);
    } finally { await bundle.close(); }
}
console.table(rows);
const browser = await playwright.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || await chromium.executablePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    env: { ...process.env, ...(process.env.UELE_CHROMIUM_LIBS ? { LD_LIBRARY_PATH: process.env.UELE_CHROMIUM_LIBS } : {}) } });
try {
    const page = await browser.newPage();
    for (const row of rows) {
        row.browser = await page.evaluate(async ({ code, tier, variant }) => {
            const { h, api, props, useLive, r } = await import(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
            const check = (ok, message) => { if (!ok) throw Error(message); };
            const host = document.createElement('div'); document.body.append(host);
            let calls = 0;
            host.append(h('section', { title: () => 'title', class: { active: () => true },
                style: { color: () => 'red' }, onclick: () => calls++ }, ['a', [h('b', null, 'b')]], false));
            check(host.textContent === 'ab', 'nested children');
            const section = host.firstChild; section.click();
            check(calls === 1 && section.title === 'title' && section.classList.contains('active') && section.style.color === 'red', 'properties/events');
            if (tier !== 'core') check(h('svg').namespaceURI === 'http://www.w3.org/2000/svg', 'namespace');
            // A deterministic synchronous signal integration, including disposers, shared by every tier.
            const source = { value: 'one' }, listeners = new Set();
            api.is = value => value === source;
            api.get = value => value === source ? value.value : typeof value === 'function' ? value() : value;
            api.sub = (value, next) => { listeners.add(next); next(value.value); return () => listeners.delete(next); };
            // api-r is deliberately a configurable dispatch hook: install it for bare core too.
            if (variant === 'api-r' && tier === 'core') api.r = (value, next, error, cleanup) => {
                if (api.is(value)) return api.sub(value, v => next(v, true), error, cleanup);
                next(api.get(value), false);
            };
            const node = h('p', { title: source }, source);
            const [nodes, replace] = useLive(node); host.replaceChildren(...nodes);
            source.value = 'two'; [...listeners].forEach(next => next(source.value));
            check(node.textContent === 'two' && node.title === 'two', 'reactive properties/children');
            let flag;
            r(42, (value, live) => { check(value === 42, 'r value'); flag = live; });
            check(flag === false, 'r static flag');
            replace([]); check(listeners.size === 0, 'subscription teardown');
            let disposed = 0, sibling;
            props.set('disposeProbe', () => () => { disposed++; sibling?.remove(); });
            const parent = h('div', null, h('i', { disposeProbe: true }), sibling = h('i', { disposeProbe: true }));
            replace(parent); replace([]);
            check(disposed === 2, 'cleanup mutating sibling collection');
            props.delete('disposeProbe'); host.remove();
            // Connected DOM, warm-up + seven rounds. Includes DOM creation/insertion/removal.
            const benchHost = document.createElement('div'); document.body.append(benchHost);
            const create = () => {
                benchHost.replaceChildren(h('section', { title: 'title', class: { active: true }, style: { color: 'red' } },
                    ['a', [h('b', null, 'b'), ['c', [1, 2, 3]]]]));
            };
            const [liveNodes, update] = useLive([]); const liveHost = document.createElement('div');
            document.body.append(liveHost); liveHost.append(...liveNodes);
            const replaceTree = () => {
                update(h('section', null, Array.from({ length: 12 }, (_, i) => h('span', null, i))));
            };
            const measure = fn => {
                for (let i = 0; i < 300; i++) fn();
                const times = [];
                for (let round = 0; round < 7; round++) {
                    const start = performance.now();
                    for (let i = 0; i < 1200; i++) fn();
                    times.push((performance.now() - start) * 1000 / 1200);
                }
                times.sort((a, b) => a - b);
                return { medianUs: times[3], minUs: times[0], maxUs: times[6] };
            };
            const performanceResults = { create: measure(create), replace: measure(replaceTree) };
            update([]); liveHost.remove(); benchHost.remove();
            return { correctness: 'passed', ...performanceResults, userAgent: navigator.userAgent };
        }, { code: bundles.get(`${row.variant}/${row.tier}`), tier: row.tier, variant: row.variant });
        console.log(row.variant, row.tier, row.browser);
    }
} finally { await browser.close(); }
writeFileSync(`${outputPrefix}.json`, JSON.stringify({ node: process.version, date: new Date().toISOString(), rows }, null, 2) + '\n');
const report = ['# Renderer experiment results', '',
    'Run `UELE_CHROMIUM_LIBS=/path/to/libs node scripts/measure-renderer.mjs` (omit the environment variable when system libraries are installed).', '',
    'All exports, bundled ESM for every tier. Terser module/mangle, safe compression, three passes unless specified. Gzip level 9, Brotli quality 11. These uniform ESM measurements are not the production IIFE size-gate measurements.', '',
    'Each isolated, minified bundle passed Chromium checks for nested children, properties, events, classes/styles, namespaces (configured tiers), synchronous source updates, static r flags, subscription teardown, and sibling-mutating cleanup. This focused check is not a replacement for the full conformance suite.', '',
    'Runtime: connected Chromium DOM, 300 warm-up operations, seven rounds of 1,200 operations; median microseconds/operation. Create replaces a nested element tree with attributes; replace uses renderer-owned live replacement of a twelve-child tree. No forced layout, so these measure scripting/DOM work, not painting. Sequential microbenchmarks are noisy; do not interpret small differences as wins. Ranges are in the JSON results.', '',
    '| Variant | Tier | Minified B | Gzip B | Brotli B | Create µs | Replace µs |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(r => `| ${r.variant} | ${r.tier} | ${r.minified} | ${r.gzip} | ${r.brotli} | ${r.browser.create.medianUs.toFixed(2)} | ${r.browser.replace.medianUs.toFixed(2)} |`), '',
    'The api-r variant retains function evaluation and static false flags, keeps the exported forwarding r, and installs reactive dispatch in full/lite. Bare core now needs an additional hook for reactive properties; adopting this would change the configuration contract. Recursive add preserves scalar toNode results (not iterable spreading). Unsafe live-childNodes teardown and weakened marker checks are intentionally excluded.', '',
    'Production source is unchanged by this harness. Variant transforms fail loudly if their expected source patterns change.', ''];
writeFileSync(`${outputPrefix}.md`, report.join('\n'));
