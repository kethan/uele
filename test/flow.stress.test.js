/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { h, api, map, props, useLive } from 'uele';
import { If, Show, Match, For, Switch, Dynamic, Await, Suspense, ErrorBoundary, Portal, Title } from 'uele/flow';
import { preactSignals } from 'uele/signals/preact';
import { signal } from '@preact/signals-core';

const defaults = { ...api }, engineDefaults = { ...api.engine }, handlers = [...props], stops = [];
const mount = value => {
    const [nodes, update] = useLive(value); const host = h('section', null, nodes);
    document.body.append(host); stops.push(() => update([])); return { host, update };
};
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => { preactSignals(); document.title = 'original'; });
afterEach(() => {
    stops.splice(0).reverse().forEach(stop => stop());
    Object.keys(api.engine).forEach(key => delete api.engine[key]); Object.assign(api.engine, engineDefaults);
    Object.keys(api).forEach(key => delete api[key]); Object.assign(api, defaults);
    props.clear(); handlers.forEach(([key, handler]) => props.set(key, handler));
    document.body.replaceChildren(); document.title = 'original';
});

for (const kind of ['map', 'For']) for (const mode of ['default swapdom', 'basic fallback']) {
    it(`${kind}: 750 seeded edits preserve ordering, identity, boundaries and exact disposer counts with ${mode}`, () => {
        if (mode === 'basic fallback') api.diff = undefined;
        let seed = 42, rows = [], notify, subscribed = true, off = 0, created = 0, disposed = 0;
        const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
        const source = { subscribe(next) { notify = next; next(rows); return () => { subscribed = false; off++; }; } };
        const alive = new Set();
        props.set('stressOwned', (_node, token) => { alive.add(token); created++; return () => { expect(alive.delete(token)).toBe(true); disposed++; }; });
        const render = value => h('li', { stressOwned: {}, 'data-id': value }, value);
        const list = kind === 'map' ? map(source, render, 'empty') : For({ each: source, children: render, fallback: 'empty' });
        const { host, update } = mount(h('ul', null, h('i', null, 'before'), list, h('i', null, 'after')));
        const root = host.querySelector('ul'), before = root.firstChild, after = root.lastChild;
        let previous = new Map();
        for (let step = 0; step < 750; step++) {
            const id = random(40), at = rows.indexOf(id);
            if (at >= 0) rows = rows.filter(value => value !== id); else rows = [...rows, id];
            if (rows.length > 1 && random(2)) { const index = random(rows.length); rows = [...rows.slice(index), ...rows.slice(0, index)]; }
            if (step % 89 === 0) rows = [];
            notify(rows);
            const nodes = [...root.querySelectorAll('li')];
            expect(nodes.map(node => Number(node.dataset.id))).toEqual(rows);
            nodes.forEach(node => { const old = previous.get(Number(node.dataset.id)); if (old) expect(node).toBe(old); });
            expect(root.firstChild).toBe(before); expect(root.lastChild).toBe(after);
            expect(alive.size).toBe(rows.length); expect(created - disposed).toBe(rows.length);
            previous = new Map(nodes.map(node => [Number(node.dataset.id), node]));
        }
        update([]); update([]);
        expect(subscribed).toBe(false); expect(off).toBe(1); expect(alive.size).toBe(0); expect(disposed).toBe(created);
    });
}

it('If/Show/Match/Switch/Dynamic survive 500 branch changes and dispose every branch once', () => {
    const state = signal(0); let created = 0, disposed = 0;
    props.set('branchOwned', () => { created++; return () => disposed++; });
    const row = label => h('b', { branchOwned: true }, label);
    const make = control => control({ when: () => state.value % 2, children: () => row('yes'), fallback: 'no' });
    const { host, update } = mount(h('main', null,
        h('div', { id: 'if' }, make(If)), h('div', { id: 'show' }, make(Show)), h('div', { id: 'match' }, make(Match)),
        h('div', { id: 'switch' }, Switch({ children: [() => state.value % 2 && row('odd'), () => row('even')] })),
        h('div', { id: 'dynamic' }, Dynamic({ component: () => row(state.value) }))));
    for (let i = 1; i <= 500; i++) {
        state.value = i;
        for (const id of ['if', 'show', 'match']) expect(host.querySelector('#' + id).textContent).toBe(i % 2 ? 'yes' : 'no');
        expect(host.querySelector('#switch').textContent).toBe(i % 2 ? 'odd' : 'even');
        expect(host.querySelector('#dynamic').textContent).toBe(String(i));
        expect(created - disposed).toBe(i % 2 ? 5 : 2);
    }
    update([]); expect(disposed).toBe(created); state.value++; expect(disposed).toBe(created);
});

for (const control of ['Await', 'Suspense']) {
    it(`${control}: 60 reverse-order resolutions/rejections never overwrite the newest view, including after teardown`, async () => {
        const tasks = Array.from({ length: 60 }, deferred), index = signal(0);
        const children = control === 'Await'
            ? Await({ for: () => tasks[index.value].promise, children: value => h('b', null, value), catch: () => 'failed' })
            : Suspense({ children: () => tasks[index.value].promise, catch: () => 'failed' });
        const { host, update } = mount(children);
        for (let i = 1; i < tasks.length; i++) index.value = i;
        tasks.at(-1).resolve('latest'); await tick(); expect(host.textContent).toBe('latest');
        for (let i = tasks.length - 2; i >= 0; i--) i % 2 ? tasks[i].resolve('stale') : tasks[i].reject(Error('stale'));
        await tick(); expect(host.textContent).toBe('latest');
        const late = deferred(); tasks.push(late); index.value = 60; update([]);
        late.resolve('after teardown'); await tick(); expect(host.textContent).toBe('');
    });
}

it('ErrorBoundary contains 100 independent synchronous/async failures and preserves adjacent content', async () => {
    const seen = [];
    const boundaries = Array.from({ length: 100 }, (_, i) => ErrorBoundary({
        children: () => { if (i % 2) throw Error(String(i)); return Promise.reject(Error(String(i))); },
        fallback: error => h('b', null, error.message), onError: error => seen.push(error.message)
    }));
    const { host, update } = mount(h('main', null, h('i', null, 'before'), boundaries, h('i', null, 'after')));
    await tick(); expect(seen).toHaveLength(100); expect(new Set(seen).size).toBe(100);
    expect([...host.querySelectorAll('b')].map(node => node.textContent)).toEqual(Array.from({ length: 100 }, (_, i) => String(i)));
    expect([...host.querySelectorAll('i')].map(node => node.textContent)).toEqual(['before', 'after']);
    update([]); expect(host.textContent).toBe('');
});

it('100 Portal/Title mount-update-unmount cycles restore targets/title and release owned subscriptions', () => {
    const target = h('aside'); document.body.append(target);
    for (let i = 0; i < 100; i++) {
        const value = signal('initial'); let stopped = 0;
        props.set('portalOwned', () => () => stopped++);
        const { host, update } = mount(h('main', null,
            Title({ children: () => value.value }), Portal({ mount: target, children: h('b', { portalOwned: true }, value) })));
        value.value = String(i); expect(target.textContent).toBe(String(i)); expect(document.title).toBe(String(i));
        update([]); update([]);
        expect(stopped).toBe(1); expect(target.childNodes).toHaveLength(0); expect(document.title).toBe('original');
        value.value = 'late'; expect(target.textContent).toBe(''); expect(document.title).toBe('original'); host.remove();
    }
});
