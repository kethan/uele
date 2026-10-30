/** @vitest-environment jsdom */
import { it, expect, vi } from 'vitest';
import { api, h } from '../core/index.js';
import { isFunction, isObject, isFalsey, isNode, toNode, noop, track, kill } from '../utils/index.js';

it('shares pure predicates and conversion without requiring signals', () => {
    expect(isFunction(noop)).toBe(true);
    expect(noop()).toBeUndefined();
    expect(isObject({})).toBe(true);
    for (const value of [null, undefined, [], false, 'text']) expect(isObject(value)).toBe(false);
    for (const value of [false, true, null, undefined]) expect(isFalsey(value)).toBe(true);
    expect(isFalsey(0)).toBe(false);
    const node = document.createElement('b');
    expect(toNode(node)).toBe(node);
    expect(toNode(false).nodeType).toBe(Node.COMMENT_NODE);
    expect(toNode(42).textContent).toBe('42');
});

it('classifies node-like shorthand without capturing a renderer or signal library', () => {
    for (const plain of [null, false, 'text', [], document.createElement('i')])
        expect(isNode(plain)).toBe(true);
    expect(isNode({})).toBe(false);
    // Reactive-source recognition is deliberately performed by the caller.
    expect(isNode({ subscribe() {} })).toBe(false);
});

it('uses one registry, clears before disposal, and recursively cleans up once', () => {
    const parent = document.createElement('div'), child = document.createElement('i');
    parent.append(child);
    const next = vi.fn(), second = vi.fn(), nested = vi.fn();
    const first = vi.fn(() => track(parent, next));
    track(parent, first); track(parent, second); track(child, nested);
    kill(parent);
    for (const stop of [first, second, nested]) expect(stop).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    kill(parent);
    expect(next).toHaveBeenCalledTimes(1);
    kill(parent);
    for (const stop of [first, second, nested, next]) expect(stop).toHaveBeenCalledTimes(1);
});

it('renderer recognition reads its current API without losing the receiver', () => {
    const before = { ...api }, first = { value: 'first' }, second = { value: 'second' };
    try {
        Object.assign(api, {
            token: first,
            is(value) { return value === this.token; },
            get(value) { return value === this.token ? value.value : value; },
            sub(value, next) { next(this.get(value)); }
        });
        expect(h('div', first).textContent).toBe('first');
        api.token = second;
        expect(h('div', first).textContent).toBe('');
        expect(h('div', second).textContent).toBe('second');
    } finally {
        Object.keys(api).forEach(key => delete api[key]);
        Object.assign(api, before);
    }
});
