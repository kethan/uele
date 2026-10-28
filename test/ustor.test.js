import { URL as FileURL } from 'node:url';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { api, h, r } from 'uele';
import { computed, read, signal, canCompute } from 'uele/reactive';
import { preactSignals } from 'uele/signals/preact';
import { vue } from 'uele/signals/vue';
import { shallowRef } from '@vue/reactivity';
import { store, api as storeApi } from 'ustor';
import { HOOKS } from '../signals/internal.js';
import { connectStore } from '../examples/ustor/setup.js';
import { createCounter } from '../examples/ustor/counter.js';
import { createCart } from '../examples/ustor/cart.js';

const originalApi = { ...api };
const originalStoreApi = { ...storeApi };
const restore = (target, snapshot) => {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, snapshot);
};
const resources = [];
const own = value => (resources.push(value), value);
afterEach(() => {
    resources.splice(0).forEach(resource => resource.dispose());
    document.body.replaceChildren();
    restore(api, originalApi);
    restore(storeApi, originalStoreApi);
});

it('requires configured signal hooks and supports an explicit target', () => {
    expect(() => connectStore({})).toThrow('Configure a uele signal integration');
    const target = preactSignals({});
    expect(connectStore(target)).toBe(store);
    const state = store({ count: 1, get double() { return this.count * 2; } });
    state.count++;
    expect(state.double).toBe(4);
});

describe.each([['Preact', preactSignals, null], ['Vue', vue, shallowRef]])('published ustor with %s', (_name, setup, storeSignal) => {
    beforeEach(() => {
        setup();
        connectStore(storeSignal ? { ...api, signal: storeSignal } : api);
    });

    it('uses computed consistently in both the integration and authoring APIs', () => {
        expect(typeof api.computed).toBe('function');
        expect('derived' in HOOKS).toBe(false);
        expect(canCompute()).toBe(true);
        const value = signal(2);
        expect(read(computed(() => read(value) * 2))).toBe(4);
        expect(storeApi.computed).toBe(api.computed);
        expect(storeApi.getComputed).toBe(api.get);
        expect(storeApi).not.toHaveProperty('memo');
        expect(storeApi).not.toHaveProperty('getMemo');
    });

    it('runs the counter example with button events, computed getters and UI disposal', () => {
        const app = own(createCounter(1));
        document.body.append(app.view);
        const count = app.view.querySelector('[data-count]');
        const double = app.view.querySelector('[data-double]');
        expect(count.textContent).toBe('1');
        expect(double.textContent).toBe('2');
        app.view.querySelector('button').click();
        expect(app.state.count).toBe(2);
        expect(count.textContent).toBe('2');
        expect(double.textContent).toBe('4');
        app.dispose(); app.dispose();
        app.state.count = 9;
        expect(app.view.querySelector('section')).toBeNull();
        expect(count.textContent).toBe('2');
        expect(double.textContent).toBe('4');
    });

    it('runs the cart example: deep edits, push, reverse, keyed identity and splice', () => {
        const app = own(createCart([{ id: 'book', name: 'Book', price: 12, quantity: 1 }]));
        document.body.append(app.view);
        const total = app.view.querySelector('[data-total]');
        const book = app.view.querySelector('[data-id="book"]');
        expect(total.textContent).toBe('12.00');
        book.querySelector('button').click();
        expect(book.textContent).toContain('Book: 2');
        expect(total.textContent).toBe('24.00');
        app.state.items.push({ id: 'pen', name: 'Pen', price: 2, quantity: 3 });
        expect(app.view.querySelectorAll('li')).toHaveLength(2);
        expect(total.textContent).toBe('30.00');
        app.state.items.reverse();
        expect(app.view.querySelector('[data-id="book"]')).toBe(book);
        expect(app.view.querySelector('li').dataset.id).toBe('pen');
        app.state.items.splice(0, 1);
        expect(total.textContent).toBe('24.00');
        app.dispose();
        app.state.items[0].quantity = 7;
        expect(total.textContent).toBe('24.00');
    });

    it('handles empty lists, whole-array replacement, and sealed nested-object replacement', () => {
        const app = own(createCart()); document.body.append(app.view);
        expect(app.view.textContent).toContain('Cart is empty');
        app.state.items = [{ id: 'new', name: 'New', price: 3, quantity: 2 }];
        expect(app.view.querySelector('[data-total]').textContent).toBe('6.00');
        app.state.items.length = 0;
        expect(app.view.textContent).toContain('Cart is empty');
        const state = store({ profile: { name: 'Ada' } });
        const seen = [];
        const stop = r(() => state.profile.name, value => seen.push(value));
        state.profile.name = 'Grace';
        state.profile = { name: 'Linus', active: true };
        expect(seen).toEqual(['Ada', 'Grace', 'Linus']);
        expect(Object.isSealed(state.profile)).toBe(true);
        stop();
    });

    it('distinguishes snapshots, tracked thunks and native $cell subscriptions', () => {
        const state = store({ count: 1 });
        const snapshot = h('span', null, state.count);
        const values = [], aliases = [];
        const stop = r(() => state.count, value => values.push(value));
        const off = r(state.$count, value => aliases.push(value));
        state.count = 2;
        expect(snapshot.textContent).toBe('1');
        expect(values).toEqual([1, 2]);
        expect(aliases).toEqual([1, 2]);
        stop(); off(); state.count = 3;
        expect(values).toEqual([1, 2]); expect(aliases).toEqual([1, 2]);
    });

    it('keeps separately created application state independent', () => {
        const first = own(createCounter());
        const second = own(createCounter());
        first.state.count = 4;
        expect(second.state.count).toBe(0);
        expect(first.state).not.toBe(second.state);
    });
});

it('executes the README ustor example against the published package', async () => {
    const { readFileSync } = await import('node:fs');
    const readme = readFileSync(new FileURL('../README.md', import.meta.url), 'utf8');
    const snippet = readme.match(/<!-- ustor-example:start -->\s*```js\n([\s\S]*?)```/)[1];
    const code = snippet.replace(/^import .*;\n/gm, '');
    const run = new Function('api', 'h', 'preactSignals', 'store', 'storeApi', code + '\nreturn { app, state };');
    const { app, state } = run(api, h, preactSignals, store, storeApi);
    expect(app.querySelector('[data-count]').textContent).toBe('0');
    app.querySelector('button').click();
    expect(state.count).toBe(1);
    expect(app.querySelector('[data-double]').textContent).toBe('2');
});
