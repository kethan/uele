import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as full from '../../src/index.js';
import * as lite from '../../lite/index.js';
import { signalLibraries, diffEngines, installSignals, installDiff } from './adapters.js';

for (const library of signalLibraries) for (const engine of diffEngines) {
  for (const [name, runtime] of [['full', full], ['lite', lite]]) {
    describe(`${name} / ${library.name} / ${engine.name}`, () => {
      const { h, r, add, useLive, dispose, api, props } = runtime;
      let saved, savedProps, ledger, differ;
      const mount = nodes => {
        const root = h('main', null, nodes);
        document.body.append(root);
        return root;
      };
      beforeEach(() => {
        saved = { ...api }; savedProps = new Map(props);
        Object.keys(api).forEach(key => delete api[key]); props.clear();
        ledger = installSignals(api, library); differ = installDiff(api, engine);
      });
      afterEach(() => {
        dispose(document.body);
        try { expect(ledger.active.size, 'all mounted effects must be disposed').toBe(0); }
        finally {
          ledger.clear(); document.body.replaceChildren();
          Object.keys(api).forEach(key => delete api[key]); Object.assign(api, saved);
          props.clear(); savedProps.forEach((value, key) => props.set(key, value));
        }
      });

      test('text, attributes, style, class and property bindings update and stop together', () => {
        const value = ledger.cell('red'), checked = ledger.cell(false);
        const input = h('input', { value: value.source, checked: checked.source });
        const element = h('div', { title: value.source, 'data-color': value.source, style: { color: value.source, '--color': value.source }, class: { active: checked.source } }, value.source, input);
        const root = mount(element);
        value.write('blue'); checked.write(true);
        expect(element.textContent).toBe('blue'); expect(element.title).toBe('blue');
        expect(element.dataset.color).toBe('blue'); expect(element.style.color).toBe('blue');
        expect(element.style.getPropertyValue('--color')).toBe('blue'); expect(element.className).toBe('active');
        expect(input.value).toBe('blue'); expect(input.checked).toBe(true);
        expect(differ.calls).toBeGreaterThan(0);
        dispose(root); expect(ledger.active.size).toBe(0);
        value.write('red'); checked.write(false);
        expect(element.textContent).toBe('blue'); expect(element.className).toBe('active');
        dispose(root); expect(ledger.stopped).toBe(ledger.started);
      });

      test('derived functions track multiple dependencies and dynamic branch switches', () => {
        const choose = ledger.cell(true), a = ledger.cell(1), b = ledger.cell(10);
        const root = mount(() => `${choose.read() ? a.read() : b.read()}/${a.read() + b.read()}`);
        expect(root.textContent).toBe('1/11'); a.write(2); expect(root.textContent).toBe('2/12');
        choose.write(false); b.write(20); expect(root.textContent).toBe('20/22');
        a.write(3); expect(root.textContent).toBe('20/23');
        const active = ledger.active.size;
        for (let i = 0; i < 100; i++) { choose.write(i % 2 === 0); a.write(i); b.write(i + 10); }
        expect(root.textContent).toBe('109/208'); expect(ledger.active.size).toBe(active);
      });

      test('r supports independent subscribers and idempotent manual unsubscribe', () => {
        const value = ledger.cell(1), first = [], second = [];
        const stop1 = r(value.source, v => first.push(v)), stop2 = r(value.source, v => second.push(v));
        value.write(2); stop1(); stop1(); value.write(3); stop2();
        expect(first).toEqual([1, 2]); expect(second).toEqual([1, 2, 3]);
        expect(ledger.active.size).toBe(0);
      });

      test('300 child replacements preserve boundaries and neighboring live regions', () => {
        const left = ledger.cell('left'), right = ledger.cell('right');
        const [nodes, set] = useLive([]);
        const root = mount([left.source, '|', nodes, '|', right.source]);
        for (let i = 0; i < 300; i++) {
          set(i % 3 ? [h('b', String(i)), null, 0] : []);
          expect(root.textContent).toBe(i % 3 ? `left|${i}0|right` : 'left||right');
        }
        left.write('L'); right.write('R'); expect(root.textContent).toBe('L|2990|R');
        expect(differ.calls).toBeGreaterThanOrEqual(302);
      });

      test('Promise settlement and disposal cannot overwrite a newer region', async () => {
        let resolve;
        const promise = new Promise(yes => { resolve = yes; });
        const root = mount(add(promise));
        dispose(root); resolve('late'); await promise;
        expect(root.textContent).toBe('');
      });

      if (runtime === full) {
        test('keyed For preserves edited nodes and handles inserts/reorders/removals/fallback', () => {
          const items = ledger.cell([1, 2, 3]); let renders = 0;
          const root = mount(full.For({ each: items.source, fallback: 'empty', children: [id => { renders++; return h('input', { value: String(id), 'data-id': id }); }] }));
          const nodes = [...root.querySelectorAll('input')]; nodes[0].value = 'edited';
          items.write([3, 1, 4]);
          expect([...root.querySelectorAll('input')].map(node => node.dataset.id)).toEqual(['3', '1', '4']);
          expect(root.querySelectorAll('input')[0]).toBe(nodes[2]); expect(root.querySelectorAll('input')[1]).toBe(nodes[0]);
          expect(nodes[0].value).toBe('edited'); expect(renders).toBe(4);
          items.write([]); expect(root.textContent).toBe('empty');
          items.write([1]); expect(root.querySelector('input')).not.toBe(nodes[0]); expect(renders).toBe(5);
        });

        test('surviving reactive rows continue after parent list effects rerun', () => {
          const items = ledger.cell([1, 2]), label = ledger.cell('before');
          const root = mount(full.map(items.source, id => h('b', { title: label.source }, () => `${id}:${label.read()}`)));
          const active = ledger.active.size;
          for (let i = 0; i < 30; i++) { items.write(i % 2 ? [1, 2] : [2, 1]); label.write(String(i)); }
          expect(root.textContent).toBe('1:292:29'); expect(ledger.active.size).toBe(active);
          items.write([2]); const after = ledger.active.size;
          label.write('after'); expect(root.textContent).toBe('2:after');
          expect(after).toBeLessThan(active);
        });

        test('three nested fragment-list levels survive inner churn and ancestor reorders', () => {
          const groups = [0, 1, 2].map(id => ({ id, rows: ledger.cell([0, 1].map(row => ({ id: `${id}.${row}`, cells: ledger.cell([0, 1]) }))) }));
          const outer = ledger.cell(groups);
          const root = mount(full.map(outer.source, group => [h('b', String(group.id)), full.map(group.rows.source, row => [h('em', row.id), full.map(row.cells.source, cell => h('i', `${row.id}.${cell}`))])]));
          for (let i = 0; i < 25; i++) {
            for (const group of groups) {
              for (const row of group.rows.read()) row.cells.write(i % 3 ? [2, 0, 3] : []);
              group.rows.write([...group.rows.read()].reverse());
            }
            outer.write([...outer.read()].reverse());
            const expected = outer.read().flatMap(group => [String(group.id), ...group.rows.read().flatMap(row => [row.id, ...row.cells.read().map(cell => `${row.id}.${cell}`)])]).join('');
            expect(root.textContent).toBe(expected);
          }
          outer.write([]); expect(root.textContent).toBe('');
          expect(ledger.active.size).toBe(1); // Only the outer list subscription.
        });

        test('repeated row eviction stops reactive text, attributes and custom prop listeners', () => {
          const items = ledger.cell([0]), pulse = ledger.cell(0); let reads = 0, clicks = 0, cleaned = 0;
          props.set('listener', node => {
            const click = () => clicks++;
            node.addEventListener('click', click);
            return () => { node.removeEventListener('click', click); cleaned++; };
          });
          const root = mount(full.map(items.source, () => h('button', { title: pulse.source, listener: true }, () => { reads++; return pulse.read(); })));
          const detached = [];
          for (let i = 1; i <= 100; i++) { detached.push(root.querySelector('button')); items.write([i]); }
          expect(cleaned).toBe(100); expect(ledger.active.size).toBe(3);
          const before = reads; pulse.write(1); expect(reads - before).toBe(1);
          detached.forEach(node => node.click()); expect(clicks).toBe(0);
          root.querySelector('button').click(); expect(clicks).toBe(1);
          dispose(root); expect(cleaned).toBe(101); expect(ledger.active.size).toBe(0);
        });
      }
    });
  }
}
