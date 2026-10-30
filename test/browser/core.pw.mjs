import { test, expect } from '@playwright/test';

test('built full owns map cleanup while core stays independent', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('/test/browser/harness.html');
    await expect(page.locator('#app')).toHaveAttribute('data-ready', 'true');
    const result = await page.evaluate(async () => {
        const core = await import('/core/dist/es/index.js');
        const full = await import('/dist/index.es.js');
        const untouched = core.api.sub === undefined && core.api.is({}) === false;
        const source = { value: [{ id: 1 }, { id: 2 }], listeners: new Set() };
        Object.assign(full.api, {
            is: value => value === source,
            get: value => value === source ? source.value : typeof value === 'function' ? value() : value,
            sub: (value, next) => {
                value.listeners.add(next); next(value.value);
                return () => value.listeners.delete(next);
            }
        });
        const host = document.createElement('section'); document.body.append(host);
        const list = full.map(source, value => full.h('b', null, value.id), '', value => value.id);

        const [nodes, replace] = full.useLive(list); host.append(...nodes);
        const retained = host.querySelectorAll('b')[1];
        source.value = [{ id: 2 }, { id: 3 }];
        [...source.listeners].forEach(next => next(source.value));
        const text = host.textContent, reused = host.querySelector('b') === retained;
        replace([]);
        return { untouched, isolated: core.h !== full.h && core.api !== full.api,
            text, reused, listeners: source.listeners.size, remaining: host.querySelectorAll('b').length };
    });
    expect(result).toEqual({ untouched: true, isolated: true, text: '23', reused: true, listeners: 0, remaining: 0 });
    expect(errors).toEqual([]);
});

test('full defaults to bounded swapdom and does not disturb stable focused nodes', async ({ page }) => {
    await page.goto('/test/browser/harness.html');
    const result = await page.evaluate(async () => {
        const full = await import('/dist/index.es.js');
        const lite = await import('/lite/dist/index.es.js');
        const core = await import('/core/dist/es/index.js');
        const input = full.h('input', { value: 'typed' }), b = full.h('b', null, 'b');
        const [nodes, update] = full.useLive([input, b]);
        const before = full.h('i'), after = full.h('i');
        const host = full.h('section', null, before, nodes, after); document.body.append(host);
        input.focus(); input.setSelectionRange(1, 3);
        update([input, b]);
        const stable = document.activeElement === input && input.selectionStart === 1;
        update([b, input]);
        const order = [...host.children].every((node, index) => node === [before, b, input, after][index]);
        update([]); host.remove();
        return { stable, order, full: typeof full.api.diff, lite: lite.api.diff === undefined, core: core.api.diff === undefined };
    });
    expect(result).toEqual({ stable: true, order: true, full: 'function', lite: true, core: true });
});
