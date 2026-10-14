import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = resolve(import.meta.dirname, '../..');
let temp, consumer, installed, manifest, packedFiles;
const run = (args, options = {}) => {
  try { return execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', ...options }); }
  catch (error) { throw new Error(`${error.message}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, { cause: error }); }
};

before(() => {
  temp = mkdtempSync(join(root, '.test-package-'));
  consumer = join(temp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'uele-consumer-test', private: true, type: 'module' }));
  const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', temp], { cwd: root, encoding: 'utf8' }));
  packedFiles = new Set(pack.files.map(file => file.path));
  const [dependency] = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], { cwd: join(root, 'node_modules/usub'), encoding: 'utf8' }));
  execFileSync('npm', ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', '--package-lock=false', join(temp, pack.filename), join(temp, dependency.filename)], { cwd: consumer, stdio: 'pipe' });
  installed = join(consumer, 'node_modules/uele');
  manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
});
after(() => { if (temp) rmSync(temp, { recursive: true, force: true }); });

test('every declared export and legacy entry points exist in the actual npm tarball', () => {
  const paths = [manifest.main, manifest.module, manifest.browser, manifest.types, manifest.unpkg, manifest['umd:main']];
  const collect = value => typeof value === 'string' ? paths.push(value) : Object.values(value).forEach(collect);
  collect(manifest.exports);
  for (const path of paths) assert.ok(packedFiles.has(path.replace(/^\.\//, '')), `Missing packaged entry: ${path}`);
  assert.ok(![...packedFiles].some(path => /^(test|coverage|node_modules)\//.test(path)), 'Do not publish test artifacts');
});

for (const entry of ['uele', 'uele/lite', 'uele/jsx-runtime', 'uele/jsx-dev-runtime']) {
  const isJsx = entry.includes('jsx');
  for (const mode of ['import', 'require']) {
    test(`${entry}: installed ${mode} consumer renders and updates`, () => {
      const code = `
        import assert from 'node:assert/strict';
        import { createRequire } from 'node:module';
        import { JSDOM } from 'jsdom';
        const require = createRequire(import.meta.url);
        const dom = new JSDOM('<!doctype html><body></body>');
        globalThis.Node = dom.window.Node; globalThis.document = dom.window.document;
        const runtime = ${mode === 'import' ? `await import('${entry}')` : `require('${entry}')`};
        assert.ok(require.resolve('${entry}').includes('.test-package-'));
        ${isJsx ? `
          assert.equal(runtime.jsx('div', { children: 'installed JSX' }).outerHTML, '<div>installed JSX</div>');
          const fragment = runtime.jsxs(runtime.Fragment, { children: ['a', runtime.jsx('b', { children: 'b' })] });
          assert.equal(runtime.jsx('main', { children: fragment }).innerHTML, 'a<b>b</b>');
        ` : `
          const [nodes, set] = runtime.useLive(0);
          const root = runtime.h('main', nodes);
          document.body.append(root); set(value => value + 1);
          assert.equal(root.textContent, '1');
          assert.equal(runtime.h('div', false).innerHTML, '<!--false-->');
        `}
        dom.window.close();
      `;
      run(['--input-type=module', '-e', code]);
    });
  }
}

for (const folder of ['dist', 'lite/dist', 'jsx-runtime/dist', 'jsx-dev-runtime/dist']) {
  for (const format of ['min', 'umd']) {
    test(`${folder}/index.${format}.js: browser script exposes usable globals`, () => {
      const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
      try {
        if (folder.includes('jsx')) dom.window.eval(readFileSync(join(installed, 'dist/index.min.js'), 'utf8'));
        dom.window.eval(readFileSync(join(installed, folder, `index.${format}.js`), 'utf8'));
        const runtime = folder.includes('jsx') ? dom.window.ueleJSX : dom.window.uele;
        assert.equal(typeof runtime.h, 'function');
        const element = folder.includes('jsx') ? runtime.jsx('p', { children: 'browser' }) : runtime.h('p', 'browser');
        assert.equal(element.outerHTML, '<p>browser</p>');
      } finally { dom.window.close(); }
    });
  }
}

test('package.json subpath is available to consumers', () => {
  assert.equal(JSON.parse(run(['--input-type=commonjs', '-e', "console.log(JSON.stringify(require('uele/package.json'))) "])).name, 'uele');
});

for (const jsx of ['react-jsx', 'react-jsxdev']) {
  test(`installed TypeScript consumer compiles with ${jsx} and rejects invalid API usage`, () => {
    writeFileSync(join(consumer, 'consumer.tsx'), readFileSync(join(root, 'test/types/consumer.tsx')));
    writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, skipLibCheck: false, target: 'ES2022',
        module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2022', 'DOM'],
        jsx, jsxImportSource: 'uele', types: [],
      },
      files: ['consumer.tsx'],
    }));
    run([join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json']);
  });
}
