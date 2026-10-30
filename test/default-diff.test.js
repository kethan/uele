/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';
import * as full from '../src/index.js';
import * as lite from '../lite/index.js';
import * as core from '../core/index.js';
import { builtinDiff } from '../diffs/builtin.js';
const defaultDiff = full.api.diff;
afterEach(() => { full.api.diff = defaultDiff; document.body.replaceChildren(); });

it('full enables swapdom without configuring core or lite', () => {
    expect(typeof defaultDiff).toBe('function');
    expect(core.api.diff).toBeUndefined();
    expect(lite.api.diff).toBeUndefined();
});
it('default reconciliation keeps stable nodes in place and preserves region siblings', () => {
    const a = full.h('input', { value: 'user value' }), b = full.h('b', null, 'b');
    const [nodes, update] = full.useLive([a, b]);
    const before = full.h('i', null, 'before'), after = full.h('i', null, 'after');
    const root = full.h('div', null, before, nodes, after); document.body.append(root);
    const remove = vi.spyOn(root, 'removeChild'), insert = vi.spyOn(root, 'insertBefore');
    a.focus(); a.setSelectionRange(1, 3);
    update([a, b]);
    expect(remove).not.toHaveBeenCalled(); expect(insert).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(a); expect(a.selectionStart).toBe(1);
    update([b, a]);
    expect(root.childNodes[0]).toBe(before); expect(root.lastChild).toBe(after);
    expect(root.querySelector('input')).toBe(a); expect(a.value).toBe('user value');
    expect([...root.children]).toEqual([before, b, a, after]);
    update([]); expect([...root.children]).toEqual([before, after]);
});
it('builtinDiff resets full to the basic fallback and custom engines can override it', () => {
    expect(builtinDiff(full.api)).toBe(full.api);
    expect(full.api.diff).toBeUndefined();
    const [nodes, update] = full.useLive('one'); document.body.append(...nodes);
    update('two'); expect(document.body.textContent).toBe('two');
    full.api.diff = vi.fn((parent, old, next, end) => {
        old.forEach(node => node.remove()); end.before(...next);
    });
    update('three'); expect(full.api.diff).toHaveBeenCalledTimes(1);
    expect(full.api.diff.mock.calls[0]).toHaveLength(4);
    expect(document.body.textContent).toBe('three'); update([]);
});

// Every ordered subset of four nodes: 65 states, 4,225 transitions.
it('default compact swapdom handles every bounded four-node permutation transition', () => {
    const states = [[]];
    const visit = prefix => {
        for (let i = 0; i < 4; i++) if (!prefix.includes(i)) {
            const next = [...prefix, i]; states.push(next); visit(next);
        }
    };
    visit([]); expect(states).toHaveLength(65);
    for (const from of states) for (const to of states) {
        const elements = Array.from({ length: 4 }, (_, i) => full.h('b', null, i));
        const [nodes, update] = full.useLive(from.map(i => elements[i]));
        const before = full.h('i'), after = full.h('i');
        const parent = full.h('div', null, before, nodes, after);
        update(to.map(i => elements[i]));
        expect([...parent.children]).toEqual([before, ...to.map(i => elements[i]), after]);
        update([]); expect([...parent.children]).toEqual([before, after]);
    }
});
