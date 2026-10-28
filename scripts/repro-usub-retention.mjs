#!/usr/bin/env node
/**
 * Run with --expose-gc and an absolute path to a usub ESM build.
 * Keeps sources alive without retaining subscriptions or callbacks in fixtures.
 * No DOM, framework, coverage instrumentation, or timing of effect queues.
 */
import { pathToFileURL } from 'node:url';
if (!globalThis.gc || !process.argv[2]) {
  console.error('Usage: node --expose-gc scripts/repro-usub-retention.mjs /absolute/path/to/usub/dist/index.es.js');
  process.exit(1);
}
const loaded = await import(pathToFileURL(process.argv[2]));
const { sub } = loaded.default || loaded;
const freed = new Set();
const registry = new FinalizationRegistry(id => freed.add(id));
const sources = [];
const payloads = [];
let seq = 0;
function build(dispose, holdSource = true) {
  const source = { subscribe(next) { next('a'); return { unsubscribe() {} }; } };
  if (holdSource) sources.push(source);
  const ids = [];
  for (let i = 0; i < 20; i++) {
    const payload = { bytes: new Array(64).fill(1) };
    const id = ++seq;
    registry.register(payload, id);
    ids.push(id);
    const off = sub(source, () => payload);
    if (dispose) off();
  }
  payloads.push([dispose ? 'disposed, live source' : holdSource ? 'dropped handle, live source' : 'dropped source', ids]);
}
build(true); build(false); build(false, false);
for(let i=0;i<30;i++) { global.gc(); await new Promise(r=>setTimeout(r,5)); }
for (const [label, ids] of payloads) console.log(label + ': ' + ids.filter(id=>!freed.has(id)).length + '/20 payloads retained');
console.log('live sources:', sources.length);
