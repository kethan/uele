import { createControlFlow } from '../flow/control.js';
/** @vitest-environment jsdom */
import { it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as core from '../core/index.js';
import * as full from '../src/index.js';
import { rmSync } from 'node:fs';
import { rollup } from 'rollup';
import configs from '../rollup.config.js';
const outputDir = resolve('test/full-composition/dist');
beforeAll(async () => {
    const config = configs.find(config => config.input === 'src/index.js');
    const bundle = await rollup({ input: config.input, external: config.external,
        plugins: config.plugins.filter(plugin => plugin && plugin.name !== 'copy-file') });
    try {
        for (const format of ['es', 'cjs']) await bundle.write({ file: `${outputDir}/index.${format === 'es' ? 'mjs' : 'cjs'}`, format });
    } finally { await bundle.close(); }
});
afterAll(() => rmSync(resolve('test/full-composition'), { recursive: true, force: true }));

const defaults = { ...core.api };
afterEach(() => {
    Object.keys(core.api).forEach(key => delete core.api[key]);
    Object.assign(core.api, defaults);
    core.props.clear();
    document.body.replaceChildren();
});

it('full configures an independent core instance without configuring tiny', () => {
    expect(full.api).not.toBe(core.api); expect(full.h).not.toBe(core.h);
    expect(core.api.engine).toBeUndefined(); expect(core.api.diff).toBeUndefined();
    expect(full.api.engine).toBeDefined(); expect(typeof full.api.diff).toBe('function');
    expect(full.__track).toBeUndefined(); expect(full.track).toBeUndefined();
});

const checkOwnership = (entry, base) => {
    const defaults = { ...base.api };
    let unmount = () => {};
    try {
        const items = { value: [{ id: 1 }, { id: 2 }], listeners: new Set() };
        Object.assign(base.api, {
            is: value => value === items,
            get: value => value === items ? items.value : typeof value === 'function' ? value() : value,
            sub: (value, next) => {
                value.listeners.add(next); next(value.value);
                return () => value.listeners.delete(next);
            }
        });
        const list = createControlFlow({ get: value => base.api.get(value), map: entry.map }).For({ each: items, key: value => value.id,
            children: value => base.h('b', null, value.id) });
        const [nodes, replace] = base.useLive(list);
        document.body.append(...nodes);
        unmount = () => replace([]);
        const original = document.querySelectorAll('b');
        expect(items.listeners.size).toBe(1);
        items.value = [{ id: 2 }, { id: 3 }];
        [...items.listeners].forEach(next => next(items.value));
        expect(document.body.textContent).toBe('23');
        expect(document.querySelector('b')).toBe(original[1]);
        unmount();
        expect(items.listeners.size).toBe(0);
        expect(document.querySelector('b')).toBeNull();
    } finally {
        unmount();
        Object.keys(base.api).forEach(key => delete base.api[key]);
        Object.assign(base.api, defaults);
        document.body.replaceChildren();
    }
};

it('source full helpers use core rendering and renderer-owned cleanup', async () => {
    checkOwnership(full, full);
});

it('full helpers follow later core API configuration', async () => {
    const previous = full.api.get;
    const view = createControlFlow({ get: value => full.api.get(value), map: full.map }).If({ when: {}, children: value => String(value) });
    try {
        full.api.get = () => 1; expect(view()).toBe('1');
        full.api.get = () => 2; expect(view()).toBe('2');
    } finally { full.api.get = previous; }
});

for (const format of ['es', 'cjs']) it(`built ${format} full map uses its renderer's cleanup registry`, async () => {
    const file = `${outputDir}/index.${format === 'es' ? 'mjs' : 'cjs'}`;
    const require = createRequire(import.meta.url);
    const entry = format === 'cjs' ? require(file) : await import(/* @vite-ignore */ pathToFileURL(file).href);
    expect(Object.keys(entry).sort()).toEqual(['add', 'api', 'f', 'h', 'lazy', 'map', 'props', 'r', 'useLive']);
    checkOwnership(entry, entry);
});
