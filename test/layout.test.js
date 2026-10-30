/** @vitest-environment jsdom */
import { it, expect } from 'vitest';
import pkg from '../package.json';
import * as full from '../src/index.js';
import * as lite from '../lite/index.js';
import * as tiny from '../tiny/index.js';
import * as core from '../core/index.js';
import * as flow from '../flow/index.js';

it('keeps lazy and map in full and moves control-flow exports to flow', () => {
    expect(Object.keys(full).sort()).toEqual(['add', 'api', 'f', 'h', 'lazy', 'map', 'props', 'r', 'useLive']);
    for (const name of ['If', 'Show', 'Match', 'For', 'Switch', 'Dynamic']) {
        expect(typeof flow[name]).toBe('function');
        expect(full[name]).toBeUndefined();
    }
    expect(flow.lazy).toBeUndefined();
    expect(lite.lazy).toBeUndefined();
});

it('tiny is the minimal core and full/lite have independent configuration', () => {
    expect(Object.keys(pkg.exports).filter(name => /^\.\/(core|tiny|lite)(\/|$)/.test(name)).sort()).toEqual(['./core', './lite', './tiny']);
    expect(pkg.exports['./diffs/util']).toBeNull();
    expect(pkg.exports['./tiny'].import).toBe(pkg.exports['./core'].import);
    expect(tiny.h).toBe(core.h);
    expect(tiny.api).toBe(core.api);
    expect(tiny.api.engine).toBeUndefined();
    expect(tiny.api.sub).toBeUndefined();
    expect(tiny.api.ns).toBeUndefined();
    expect(full.api).not.toBe(lite.api);
    expect(full.api).not.toBe(tiny.api);
    expect(full.api.engine).not.toBe(lite.api.engine);
    expect(full.props).not.toBe(lite.props);
    const before = full.api.ns, previous = lite.api.ns;
    try {
        lite.api.ns = () => 'http://www.w3.org/2000/svg';
        expect(full.api.ns).toBe(before);
        expect(tiny.api.ns).toBeUndefined();
    } finally { lite.api.ns = previous; }
});

it('flow can explicitly compose with a different core without changing it', () => {
    const before = { ...core.api };
    const map = (...args) => args;
    const controls = flow.createControlFlow({ get: value => core.api.get(value), map });
    expect(controls.If({ when: true, children: 'yes' })()).toBe('yes');
    const each = [1, 2], row = value => String(value);
    expect(controls.For({ each, children: row })).toEqual([each, row, undefined, expect.any(Function)]);
    expect(core.api).toEqual(before);
});
