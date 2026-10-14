// Real libraries, not fake signals. These adapters are deliberately test/docs code,
// not additions to the shipped runtime or its dependency graph.
import * as ulive from 'ulive';
import * as preact from '@preact/signals-core';
import * as vue from '@vue/reactivity';
// Explicit client build: Solid's Node default is the non-reactive SSR build.
import * as solid from 'solid-js/dist/solid.js';
import * as alien from 'alien-signals';
import * as usignal from 'usignal/sync';
import swapdom from 'swapdom';
import domdiffModule from 'domdiff';
const domdiff = domdiffModule.default || domdiffModule;
import udomdiff from 'udomdiff';
import { getPatch } from 'fast-array-diff';
import listDiff from 'list-diff2';
import { diffArray } from '@thi.ng/diff/array';

const valueCell = make => value => {
  const source = make(value);
  return { source, read: () => source.value, write: value => { source.value = value; } };
};
export const signalLibraries = [
  { name: 'ulive', cell: valueCell(ulive.signal), is: v => !!v?.peek, get: v => v.value, effect: ulive.effect, batch: ulive.batch },
  { name: '@preact/signals-core', cell: valueCell(preact.signal), is: v => v instanceof preact.Signal, get: v => v.value, effect: preact.effect, batch: preact.batch },
  { name: '@vue/reactivity', cell: valueCell(vue.shallowRef), is: vue.isRef, get: v => v.value,
    effect: fn => { const runner = vue.effect(fn); return () => vue.stop(runner); } },
  { name: 'solid-js (client)', cell: value => {
      const [read, write] = solid.createSignal(value);
      return { source: read, read, write: value => write(() => value) };
    }, is: v => typeof v === 'function', get: v => v(),
    // Each DOM binding owns an independent root, not the currently rendering row.
    effect: fn => solid.createRoot(dispose => { solid.createComputed(fn); return dispose; }, null), batch: solid.batch },
  { name: 'alien-signals', cell: value => {
      const source = alien.signal(value);
      return { source, read: source, write: value => source(value) };
    }, is: v => typeof v === 'function', get: v => v(),
    effect: fn => {
      const previous = alien.setActiveSub(undefined);
      try { return alien.effect(fn); } finally { alien.setActiveSub(previous); }
    }, batch: fn => { alien.startBatch(); try { return fn(); } finally { alien.endBatch(); } } },
  { name: 'usignal/sync', cell: valueCell(usignal.signal), is: v => v instanceof usignal.Signal, get: v => v.value,
    // Root Effect prevents usignal's positional child-effect reuse from coupling rows.
    effect: fn => {
      let dependencies = [];
      const detach = () => { for (const source of dependencies) source.c.delete(root); };
      const root = new usignal.Effect(() => {
        detach();
        try { return fn(); } finally { dependencies = [...root.r]; }
      }, undefined, { async: false });
      // refresh avoids subscribing the outer computation to the effect's return value.
      root.refresh();
      return () => {
        // usignal 0.10 stop() clears r but leaves stopped effects in source.c.
        // This version-specific adapter detaches those reverse edges as well.
        detach(); dependencies = [];
        root.stop();
      };
    }, batch: usignal.batch },
];

// Measures actual subscription ownership. Teardown is deliberately separate from
// assertions, so a global afterEach cannot conceal missing runtime disposal.
export function installSignals(api, library) {
  const active = new Set();
  let started = 0, stopped = 0;
  const record = start => {
    let stop = start();
    started++;
    const dispose = () => {
      if (!stop) return;
      const current = stop;
      stop = undefined;
      active.delete(dispose);
      stopped++;
      current();
    };
    active.add(dispose);
    return dispose;
  };
  Object.assign(api, { is: library.is, get: library.get, effect: fn => record(() => library.effect(fn)) });
  const cell = value => {
    const result = library.cell(value);
    // Preact signals expose subscribe(), which usub chooses before api.effect.
    if (typeof result.source.subscribe === 'function') {
      const subscribe = result.source.subscribe.bind(result.source);
      result.source.subscribe = (...args) => record(() => subscribe(...args));
    }
    return result;
  };
  return { cell, active, get started() { return started; }, get stopped() { return stopped; }, clear: () => [...active].forEach(stop => stop()) };
}

const same = (a, b) => a === b;
const getNode = node => node;
// Sequence-diff adapters apply the library's edit plan, not a substitute diff.
const removeDeleted = (old, next) => {
  const keep = new Set(next);
  for (const node of old) if (!keep.has(node)) node.remove();
};
export const diffEngines = [
  { name: 'swapdom', diff: (parent, old, next, end) => swapdom(parent, old, next, end) },
  { name: 'domdiff', diff: (parent, old, next, end) => domdiff(parent, old, next, { before: end, compare: same }) },
  { name: 'udomdiff', diff: udomdiff, udom: getNode },
  { name: 'fast-array-diff', diff: (parent, old, next, end) => {
    const patches = getPatch(old, next, same);
    removeDeleted(old, next);
    for (let i = patches.length - 1; i >= 0; i--) {
      const patch = patches[i];
      if (patch.type === 'add') for (const node of patch.items) parent.insertBefore(node, next[patch.newPos + patch.items.length] || end);
    }
    return next;
  } },
  { name: 'list-diff2', diff: (parent, old, next, end) => {
    // IDs are local to this call, with no global node-retention cache.
    const ids = new Map([...new Set([...old, ...next])].map((node, index) => [node, `n${index}`]));
    const { moves } = listDiff(old, next, node => ids.get(node));
    const inserted = new Set(moves.filter(move => move.type === 1).map(move => move.item));
    removeDeleted(old, next);
    for (let i = next.length - 1; i >= 0; i--) if (inserted.has(next[i])) parent.insertBefore(next[i], next[i + 1] || end);
    return next;
  } },
  { name: '@thi.ng/diff', diff: (parent, old, next, end) => {
    const { linear } = diffArray(old, next, 'minimal', same);
    removeDeleted(old, next);
    for (let i = linear.length - 3; i >= 0; i -= 3) if (linear[i] === 1) parent.insertBefore(linear[i + 2], next[linear[i + 1] + 1] || end);
    return next;
  } },
];

export function installDiff(api, engine) {
  let calls = 0;
  api.udom = engine.udom;
  api.diff = (...args) => { calls++; return engine.diff(...args); };
  return { get calls() { return calls; } };
}
