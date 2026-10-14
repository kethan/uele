import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as full from '../../src/index.js';
import * as lite from '../../lite/index.js';
import { signalLibraries, diffEngines } from '../interop/adapters.js';

assert.equal(typeof globalThis.gc, 'function', 'Run this suite with node --expose-gc');
let dom;
before(() => {
  dom = new JSDOM('<!doctype html><body></body>');
  globalThis.Node = dom.window.Node; globalThis.document = dom.window.document;
});
after(() => { dom.window.close(); delete globalThis.Node; delete globalThis.document; });
const turn = () => new Promise(resolve => setImmediate(resolve));
async function collected(refs) {
  let remaining;
  for (let i = 0; i < 20; i++) {
    // A new task clears WeakRef KeepDuringJob roots and pending promise reactions.
    await turn(); globalThis.gc(); await turn();
    remaining = refs.reduce((count, ref) => count + Number(ref.deref() !== undefined), 0);
    if (!remaining) return 0;
  }
  return remaining;
}
function configure(runtime, library, engine) {
  Object.keys(runtime.api).forEach(key => delete runtime.api[key]);
  Object.assign(runtime.api, { is: library.is, get: library.get, effect: library.effect, diff: engine?.diff, udom: engine?.udom });
}

// No effect ledger or cleanup-spy closures here: production adapters and real stops.
function disposedRoots(runtime, library) {
  const source = library.cell('initial'), refs = [];
  for (let i = 0; i < 60; i++) {
    const element = runtime.h('section', { title: source.source, style: { color: 'red' } }, runtime.h('i', null, () => source.read()));
    document.body.append(element);
    refs.push(new WeakRef(element), new WeakRef(element.firstChild));
    runtime.dispose(element); element.remove();
  }
  return { source, refs };
}
for (const library of signalLibraries) for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  test(`${name}/${library.name}: disposed DOM collects while source stays alive`, async () => {
    configure(runtime, library);
    const { source, refs } = disposedRoots(runtime, library);
    assert.equal(await collected(refs), 0, 'disposed DOM is retained by a live source/disposer');
    source.write('still alive'); assert.equal(source.read(), 'still alive');
  });
}

function evictedRows(library) {
  const items = library.cell([0]), label = library.cell('value'), refs = [];
  const root = full.h('main', null, full.map(items.source, () => {
    const row = full.h('b', { title: label.source }, () => label.read());
    refs.push(new WeakRef(row));
    return row;
  }));
  document.body.append(root);
  for (let i = 1; i <= 120; i++) items.write([i]);
  items.write([]);
  return { items, label, root, refs };
}
for (const library of signalLibraries) for (const engine of diffEngines) {
  test(`${library.name}/${engine.name}: evicted rows collect with list and sources alive`, async () => {
    configure(full, library, engine);
    const state = evictedRows(library);
    try {
      assert.equal(await collected(state.refs), 0, 'a row/cache/diff engine retains removed DOM');
      state.items.write([999]); state.label.write('alive');
      assert.equal(state.root.textContent, 'alive');
    } finally { full.dispose(state.root); state.root.remove(); }
  });
}

test('negative control: omission of dispose retains rows, explicit dispose releases them', async () => {
  const library = signalLibraries[1]; configure(full, library);
  function create() {
    const source = library.cell('retained'), refs = [];
    for (let i = 0; i < 10; i++) {
      const element = full.h('b', null, () => source.read());
      document.body.append(element); element.remove(); refs.push(new WeakRef(element));
    }
    return { source, refs };
  }
  const state = create();
  assert.equal(await collected(state.refs), 10, 'negative control must demonstrate a detectable leak');
  function release() { state.refs.forEach(ref => full.dispose(ref.deref())); }
  release();
  assert.equal(await collected(state.refs), 0);
  assert.equal(state.source.read(), 'retained');
});

for (const library of signalLibraries) {
  test(`${library.name}: replaced render-owned DOM collects before unmount`, async () => {
    configure(full, library);
    function create() {
      const version = library.cell(0), label = library.cell('alive'), refs = [];
      const root = full.h('main', null, () => {
        version.read();
        const node = full.h('b', { title: label.source }, () => label.read());
        refs.push(new WeakRef(node)); return node;
      });
      document.body.append(root);
      for (let i = 1; i <= 150; i++) version.write(i);
      refs.pop(); // The current row intentionally remains mounted.
      return { root, version, label, refs };
    }
    const state = create();
    try { assert.equal(await collected(state.refs), 0); state.label.write('updated'); assert.equal(state.root.textContent, 'updated'); }
    finally { full.dispose(state.root); state.root.remove(); }
  });

  test(`${library.name}: sources and DOM collect even if callers retain cancelled handles`, async () => {
    configure(full, library);
    function create() {
      const source = library.cell('initial');
      const node = full.h('b');
      const stop = full.r(source.source, value => { node.textContent = value; });
      stop();
      return { stop, refs: [new WeakRef(node), new WeakRef(source.source)] };
    }
    const state = create();
    assert.equal(await collected(state.refs), 0);
    state.stop(); // A retained handle is safe, idempotent and no longer owns a source.
  });
}

// An iterator can be independent of its source wrapper. Keep a pending next()
// alive externally: cancellation must release the wrapper without waiting for it.
function cancelledAsyncSource(iterator, next) {
  const source = { [Symbol.asyncIterator]: () => iterator };
  const stop = full.sub(source, next);
  stop();
  return { stop, ref: new WeakRef(source) };
}
test('cancelled async source collects while an independent iterator is still pending', async () => {
  configure(full, signalLibraries[0]);
  let settle, emissions = 0, returned = 0;
  const pending = new Promise(resolve => { settle = resolve; });
  const iterator = {
    next: () => pending,
    return: () => { returned++; return { done: true }; },
  };
  const state = cancelledAsyncSource(iterator, () => { emissions++; });
  try {
    assert.equal(await collected([state.ref]), 0, 'pending protocol helper retains cancelled source');
  } finally {
    settle({ value: 'late', done: false });
    await turn();
    state.stop();
  }
  assert.equal(emissions, 0);
  assert.equal(returned, 1);
});
