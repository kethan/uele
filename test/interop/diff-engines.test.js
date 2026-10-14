import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as full from '../../src/index.js';
import * as lite from '../../lite/index.js';
import { diffEngines, installDiff } from './adapters.js';

function orders(values) {
  return [[], ...values.flatMap((value, index) => orders(values.filter((_, i) => i !== index)).map(tail => [value, ...tail]))];
}
const cases = orders([0, 1, 2, 3]); // All 65 ordered subsets, no duplicates.
for (const engine of diffEngines) for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  describe(`${name}/${engine.name} edit-plan stress`, () => {
    let saved;
    beforeEach(() => { saved = { ...runtime.api }; installDiff(runtime.api, engine); });
    afterEach(() => { runtime.dispose(document.body); document.body.replaceChildren(); Object.keys(runtime.api).forEach(key => delete runtime.api[key]); Object.assign(runtime.api, saved); });

    test('all 4,225 transitions between ordered subsets preserve exact node identities and sentinels', () => {
      const nodes = [document.createElement('input'), document.createTextNode('text'), document.createComment('comment'), document.createElementNS('http://www.w3.org/2000/svg', 'circle')];
      const [region, set] = runtime.useLive([]);
      const before = document.createTextNode('BEFORE'), after = document.createTextNode('AFTER');
      const parent = document.createElement('main'); parent.append(before, ...region, after); document.body.append(parent);
      for (const from of cases) for (const to of cases) {
        set(from.map(index => nodes[index]));
        set(to.map(index => nodes[index]));
        expect([...parent.childNodes]).toEqual([before, region[0], ...to.map(index => nodes[index]), region.at(-1), after]);
      }
    });

    test('mutating engines cannot corrupt the caller-owned next-node array', () => {
      const a = runtime.h('b', 'a'), b = runtime.h('b', 'b'), next = Object.freeze([b, a]);
      const [nodes, set] = runtime.useLive([a, b]);
      const parent = runtime.h('div', nodes); document.body.append(parent);
      set(next); expect(parent.textContent).toBe('ba'); expect(next).toEqual([b, a]);
      set([]); set(next); expect(parent.textContent).toBe('ba');
    });

    test('native select options retain selected node identity across insertion and reorder', () => {
      const a = runtime.h('option', { value: 'a' }, 'a'), b = runtime.h('option', { value: 'b' }, 'b');
      const [nodes, set] = runtime.useLive([a, b]);
      const select = runtime.h('select', nodes); document.body.append(select); select.value = 'b';
      set([a, b, runtime.h('option', { value: 'c' }, 'c')]);
      expect(select.selectedOptions[0]).toBe(b);
      set([b, a]); expect([...select.options]).toEqual([b, a]);
      expect(select.options[0]).toBe(b);
    });
  });
}
