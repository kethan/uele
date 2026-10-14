import { before, after, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rollup } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { chromium as playwright } from 'playwright-core';
import chromium, { inflate } from '@sparticuz/chromium';

const root = resolve(import.meta.dirname, '../..');
let server, browser, page, origin, errors;
before(async () => {
  const fixture = await rollup({ input: resolve(root, 'test/interop/adapters.js'), plugins: [
    { name: 'production-fixture', transform(code) { return { code: code.replaceAll('process.env.NODE_ENV', '"production"'), map: null }; } },
    nodeResolve({ browser: true }), commonjs()
  ] });
  try { await fixture.write({ file: resolve(root, '.test-artifacts/interop.js'), format: 'es' }); }
  finally { await fixture.close(); }
  // A bounded, local fixture server; no third-party APIs or browser downloads.
  const assets = new Map([
    ['/interop.js', '.test-artifacts/interop.js'], ['/full.js', 'dist/index.es.js'], ['/lite.js', 'lite/dist/index.es.js'],
    ['/jsx.js', 'jsx-runtime/dist/index.es.js'], ['/signals.js', 'node_modules/ulive/dist/index.es.js'],
  ]);
  server = createServer(async (req, res) => {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><script type="importmap">{"imports":{"uele":"/full.js"}}</script><body></body>');
    } else if (assets.has(req.url)) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(await readFile(resolve(root, assets.get(req.url))));
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const libs = process.env.CHROMIUM_PATH ? undefined : await inflate(resolve(root, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  browser = await playwright.launch({
    executablePath: process.env.CHROMIUM_PATH || await chromium.executablePath(),
    args: chromium.args.filter(arg => !['--single-process', '--disable-web-security', '--allow-running-insecure-content'].includes(arg)), headless: true,
    env: { ...process.env, ...(libs ? { LD_LIBRARY_PATH: `${libs}/lib:${process.env.LD_LIBRARY_PATH || ''}` } : {}) },
  });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
beforeEach(async () => {
  page = await browser.newPage(); errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.evaluate(async () => {
    window.u = await import('/full.js');
    window.signals = await import('/signals.js');
    Object.assign(u.api, { is: value => !!value?.peek, get: value => value.value, effect: signals.effect });
  });
});
afterEach(async () => { await page?.close(); assert.deepEqual(errors, []); });

for (const entry of ['/full.js', '/lite.js']) {
  test(`${entry}: real typing, clicking and native focus/selection on list insertion`, async () => {
    await page.evaluate(async entry => {
      const { h, useLive } = await import(entry);
      const input = h('input', { id: 'entry', value: 'hello' });
      const [nodes, set] = useLive([input]);
      document.body.append(h('main', nodes), h('button', { onClick: () => set([input, h('b', 'added')]) }, 'Add'));
      window.appendSibling = () => set([input, h('b', 'added')]);
    }, entry);
    await page.locator('#entry').fill('user edit');
    await page.locator('#entry').evaluate(node => { node.focus(); node.setSelectionRange(2, 5); });
    await page.evaluate(() => appendSibling());
    assert.deepEqual(await page.locator('#entry').evaluate(node => [document.activeElement === node, node.value, node.selectionStart, node.selectionEnd]), [true, 'user edit', 2, 5]);
    await page.getByRole('button', { name: 'Add' }).click();
    assert.equal(await page.locator('b').textContent(), 'added');
  });
}

test('automatic JSX uses the SAME configured full runtime in a real browser', async () => {
  await page.evaluate(async () => {
    const { jsx, jsxs } = await import('/jsx.js');
    const count = signals.signal(0);
    document.body.append(jsxs('main', { children: [jsx('output', { children: count }), jsx('button', { onClick: () => count.value++, children: '+' })] }));
  });
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: '+', exact: true }).click();
  assert.equal(await page.locator('output').textContent(), '10');
});

test('nested fragment For rows preserve current content after 100 browser reorders', async () => {
  const result = await page.evaluate(() => {
    const { h, For } = u;
    const groups = [0, 1, 2].map(id => ({ id, children: signals.signal([0, 1]) }));
    const items = signals.signal(groups);
    document.body.append(...For({ each: items, children: [group => [h('b', String(group.id)), For({ each: group.children, children: [id => h('input', { value: `${group.id}.${id}` })] })]] }));
    for (let i = 0; i < 100; i++) {
      groups[i % 3].children.value = i % 2 ? [2, 1, 3] : [];
      items.value = [...items.peek()].reverse();
    }
    return {
      actual: [...document.querySelectorAll('input')].map(node => node.value),
      expected: items.peek().flatMap(group => group.children.peek().map(id => `${group.id}.${id}`)),
    };
  });
  assert.deepEqual(result.actual, result.expected);
});

test('5,000 row mount + reverse + removal stays correct and releases row subscriptions', async () => {
  const result = await page.evaluate(() => {
    const ids = Array.from({ length: 5000 }, (_, id) => id), items = signals.signal(ids), pulse = signals.signal(0);
    let reads = 0;
    const start = performance.now();
    const host = u.h('section', u.map(items, id => u.h('span', { 'data-id': id }, () => { reads++; return pulse.value; })));
    document.body.append(host);
    const first = host.querySelector('span');
    items.value = [...ids].reverse();
    const same = host.querySelectorAll('span')[4999] === first;
    items.value = [0];
    const before = reads;
    pulse.value++;
    const active = reads - before;
    u.dispose(host); pulse.value++;
    return { same, count: host.querySelectorAll('span').length, active, stopped: reads === before + 1, duration: performance.now() - start };
  });
  assert.equal(result.same, true);
  assert.equal(result.count, 1);
  assert.equal(result.active, 1);
  assert.equal(result.stopped, true);
  console.log(`5,000-row Chromium scenario: ${result.duration.toFixed(0)}ms (diagnostic, not a timing gate)`);
});

test('SVG attributes, CSS custom properties and native form validity', async () => {
  const result = await page.evaluate(() => {
    const color = signals.signal('red');
    const svg = u.h('svg', { viewBox: '0 0 10 10', className: 'icon' }, u.h('circle', { cx: 5, cy: 5, r: 3, fill: color }));
    const input = u.h('input', { required: true });
    const form = u.h('form', { style: { '--color': color } }, input);
    document.body.append(svg, form);
    const invalid = !form.checkValidity();
    input.value = 'valid'; color.value = 'blue';
    return [svg.namespaceURI, svg.getAttribute('class'), svg.querySelector('circle').getAttribute('fill'), getComputedStyle(form).getPropertyValue('--color'), invalid, form.checkValidity()];
  });
  assert.deepEqual(result, ['http://www.w3.org/2000/svg', 'icon', 'blue', 'blue', true, true]);
});

async function forceBrowserGC(session) {
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  await session.send('HeapProfiler.collectGarbage');
  await session.send('HeapProfiler.collectGarbage');
}

for (let library = 0; library < 6; library++) {
  test(`signal adapter ${library + 1}: disposed DOM is collectable in Chromium with its source alive`, async () => {
    await page.evaluate(async index => {
      const { signalLibraries } = await import('/interop.js');
      const lib = signalLibraries[index];
      Object.assign(u.api, { is: lib.is, get: lib.get, effect: lib.effect });
      const source = lib.cell('initial'), refs = [];
      for (let i = 0; i < 100; i++) {
        const node = u.h('b', { title: source.source }, () => source.read());
        document.body.append(node); refs.push(new WeakRef(node)); u.dispose(node); node.remove();
      }
      window.gcState = { source, refs, name: lib.name };
    }, library);
    const session = await page.context().newCDPSession(page);
    try {
      await forceBrowserGC(session);
      const result = await page.evaluate(() => {
        gcState.source.write('alive');
        return { remaining: gcState.refs.filter(ref => ref.deref()).length, value: gcState.source.read(), name: gcState.name };
      });
      assert.equal(result.remaining, 0, `${result.name} retained disposed DOM`);
      assert.equal(result.value, 'alive');
    } finally { await session.detach(); }
  });
}

test('36 signal/diff combinations: warmed-up DOM/listener counts and heap stay bounded', { timeout: 120000 }, async () => {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const samples = [];
  try {
    for (let library = 0; library < 6; library++) for (let engine = 0; engine < 6; engine++) {
      await page.evaluate(async ({ library, engine }) => {
        const { signalLibraries, diffEngines } = await import('/interop.js');
        const lib = signalLibraries[library], diff = diffEngines[engine];
        Object.assign(u.api, { is: lib.is, get: lib.get, effect: lib.effect, diff: diff.diff, udom: diff.udom });
        const items = lib.cell([]), label = lib.cell('x');
        window.soak = { name: `${lib.name}/${diff.name}`, items, label, run(cycles) {
          for (let cycle = 0; cycle < cycles; cycle++) {
            const root = u.h('main', u.map(items.source, id => u.h('b', { 'data-id': id, title: label.source }, () => label.read())));
            document.body.append(root);
            items.write(Array.from({ length: 200 }, (_, id) => id));
            items.write([...items.read()].reverse());
            label.write(String(cycle)); items.write([0]);
            u.dispose(root); root.remove(); items.write([]);
          }
        } };
        soak.run(3); // Warm caches and JIT before measuring retained growth.
      }, { library, engine });
      await forceBrowserGC(session);
      const beforeDOM = await session.send('Memory.getDOMCounters');
      const beforeHeap = (await session.send('Performance.getMetrics')).metrics.find(metric => metric.name === 'JSHeapUsedSize').value;
      await page.evaluate(() => soak.run(12));
      await forceBrowserGC(session);
      const afterDOM = await session.send('Memory.getDOMCounters');
      const afterHeap = (await session.send('Performance.getMetrics')).metrics.find(metric => metric.name === 'JSHeapUsedSize').value;
      const name = await page.evaluate(() => soak.name);
      assert.ok(afterDOM.nodes <= beforeDOM.nodes + 10, `${name}: DOM grew ${afterDOM.nodes - beforeDOM.nodes}`);
      assert.ok(afterDOM.jsEventListeners <= beforeDOM.jsEventListeners, `${name}: listeners grew`);
      // Heap size is noisy/JIT-sensitive; WeakRef and deterministic teardown checks
      // are the stricter gates. This guards unbounded growth, not single-byte drift.
      assert.ok(afterHeap - beforeHeap < 2 * 1024 * 1024, `${name}: retained heap grew by ${afterHeap - beforeHeap} bytes`);
      samples.push({ name, heapDelta: afterHeap - beforeHeap, nodeDelta: afterDOM.nodes - beforeDOM.nodes });
    }
    console.log(`36-combination browser soak: max retained heap delta ${Math.max(...samples.map(s => s.heapDelta))} B; max DOM delta ${Math.max(...samples.map(s => s.nodeDelta))}`);
  } finally { await session.detach(); }
});
