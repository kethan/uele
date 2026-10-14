import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import * as full from '../../src/index.js';
import * as lite from '../../lite/index.js';
import { signalLibraries, installSignals } from './adapters.js';

for (const library of signalLibraries) for (const [name, runtime] of [['full', full], ['lite', lite]]) {
  describe(`${name}/${library.name} ownership and cleanup`, () => {
    let saved, ledger;
    beforeEach(() => {
      saved = { ...runtime.api }; Object.keys(runtime.api).forEach(key => delete runtime.api[key]);
      ledger = installSignals(runtime.api, library); runtime.props.clear();
    });
    afterEach(() => {
      runtime.dispose(document.body);
      try { expect(ledger.active.size).toBe(0); }
      finally { ledger.clear(); document.body.replaceChildren(); runtime.props.clear(); Object.keys(runtime.api).forEach(key => delete runtime.api[key]); Object.assign(runtime.api, saved); }
    });
    const mount = value => { const root = runtime.h('main', null, value); document.body.append(root); return root; };

    test('fresh reactive subtrees release previous render-owned effects, even after 500 replacements', () => {
      const version = ledger.cell(0), label = ledger.cell('x'); let reads = 0;
      const root = mount(() => {
        const id = version.read();
        return runtime.h('b', { title: label.source }, () => { reads++; return `${id}:${label.read()}`; });
      });
      const initial = ledger.active.size;
      for (let i = 1; i <= 500; i++) version.write(i);
      expect(ledger.active.size).toBe(initial);
      const before = reads; label.write('y');
      expect(root.textContent).toBe('500:y'); expect(reads - before).toBe(1);
      runtime.dispose(root); expect(ledger.active.size).toBe(0);
    });

    test('prebuilt reactive DOM is not owned or killed by a conditional renderer', () => {
      const visible = ledger.cell(true), label = ledger.cell('a');
      const child = runtime.h('b', { title: label.source }, label.source);
      const root = mount(() => visible.read() ? child : 'hidden');
      for (let i = 0; i < 20; i++) {
        visible.write(false); label.write(String(i)); visible.write(true);
        expect(root.querySelector('b')).toBe(child); expect(child.title).toBe(String(i)); expect(child.textContent).toBe(String(i));
      }
    });

    test('parent custom cleanup may remove children without skipping child subscriptions', () => {
      const value = ledger.cell('before');
      runtime.props.set('clearChildren', node => () => node.replaceChildren());
      const child = runtime.h('b', { title: value.source }, value.source);
      const root = mount(runtime.h('section', { clearChildren: true }, child));
      runtime.dispose(root); value.write('after');
      expect(child.title).toBe('before'); expect(ledger.active.size).toBe(0);
    });

    test('a throwing cleanup cannot prevent sibling/descendant disposal', () => {
      const value = ledger.cell('before'); let cleaned = 0;
      runtime.props.set('broken', () => () => { throw new Error('intentional cleanup error'); });
      runtime.props.set('healthy', () => () => { cleaned++; });
      const child = runtime.h('b', { title: value.source, healthy: true }, value.source);
      const root = mount(runtime.h('section', { broken: true, healthy: true }, child));
      expect(() => runtime.dispose(root)).toThrow(AggregateError);
      expect(cleaned).toBe(2); expect(ledger.active.size).toBe(0);
      value.write('after'); expect(child.title).toBe('before');
      expect(() => runtime.dispose(root)).not.toThrow();
    });

    test('nested custom listener cleanup is exactly once on rerender and on final disposal', () => {
      const version = ledger.cell(0); let created = 0, cleaned = 0;
      runtime.props.set('listener', node => {
        created++; const fn = () => {};
        node.addEventListener('click', fn);
        return () => { node.removeEventListener('click', fn); cleaned++; };
      });
      const root = mount(() => { version.read(); return runtime.h('b', { listener: true }, 'owned'); });
      for (let i = 1; i <= 20; i++) version.write(i);
      expect(created).toBe(21); expect(cleaned).toBe(20);
      runtime.dispose(root); expect(cleaned).toBe(21);
    });

    test('render exceptions clean up partial subscriptions and permit a later successful render', () => {
      const fail = ledger.cell(false), text = ledger.cell('value');
      const root = mount(() => {
        const child = runtime.h('b', { title: text.source }, text.source);
        if (fail.read()) throw new Error('render failed');
        return child;
      });
      expect(() => fail.write(true)).toThrow('render failed');
      expect(ledger.active.size).toBe(1); // Just the outer, retryable computation.
      fail.write(false); expect(root.textContent).toBe('value');
    });
  });
}

describe('failed keyed render ownership', () => {
  const library = signalLibraries[1]; let ledger;
  beforeEach(() => { ledger = installSignals(full.api, library); });
  afterEach(() => { full.dispose(document.body); document.body.replaceChildren(); ledger.clear(); });
  test('a later failing row rolls back subscriptions created by earlier new rows', () => {
    const items = ledger.cell([0]), label = ledger.cell('value');
    const root = full.h('main', full.map(items.source, id => {
      const row = full.h('b', { title: label.source }, label.source);
      if (id === 2) throw new Error('row failed');
      return row;
    }));
    document.body.append(root);
    const initial = ledger.active.size;
    expect(() => items.write([0, 1, 2])).toThrow('row failed');
    expect(ledger.active.size).toBe(initial); expect(root.textContent).toBe('value');
    items.write([0, 3]); expect(root.textContent).toBe('valuevalue');
    full.dispose(root); expect(ledger.active.size).toBe(0);
  });
});
