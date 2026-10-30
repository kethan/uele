import { test, expect } from '@playwright/test';

test('all flow components survive repeated keyed updates, async races and owned teardown in Chromium', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('/test/browser/harness.html');
    await expect(page.locator('#app')).toHaveAttribute('data-ready', 'true');
    const result = await page.evaluate(async () => {
        const { h, map, useLive } = await import('uele');
        const { If, Show, Match, For, Switch, Dynamic, Await, Suspense, ErrorBoundary, Portal, Title } = await import('uele/flow');
        const { signal } = await import('@preact/signals-core');
        const check = (value, message) => { if (!value) throw Error(message); };
        const tick = () => new Promise(resolve => setTimeout(resolve, 0));
        const title = document.title, turn = signal(0), items = signal([1, 2, 3]);
        const target = h('aside'); document.body.append(target);
        const task = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
        const tasks = Array.from({ length: 30 }, task), index = signal(0);
        const [nodes, update] = useLive(h('section', null,
            h('ul', { id: 'stress-map' }, map(items, id => h('li', { 'data-id': id }, id))),
            h('ul', { id: 'stress-for' }, For({ each: items, children: id => h('li', { 'data-id': id }, id) })),
            ...[If, Show, Match].map((control, i) => h('div', { 'data-control': i }, control({ when: () => turn.value % 2, children: 'yes', fallback: 'no' }))),
            h('div', { id: 'stress-switch' }, Switch({ children: [() => turn.value % 2 && 'odd', () => 'even'] })),
            h('div', { id: 'stress-dynamic' }, Dynamic({ component: () => 'D' + turn.value })),
            h('div', { id: 'stress-await' }, Await({ for: () => tasks[index.value].promise, children: value => value })),
            h('div', { id: 'stress-suspense' }, Suspense({ children: () => tasks[index.value].promise })),
            h('div', { id: 'stress-error' }, ErrorBoundary({ children: () => Promise.reject(Error('contained')), fallback: error => error.message })),
            Portal({ mount: target, children: () => 'P' + turn.value }), Title({ children: () => 'T' + turn.value })));
        const host = h('section', null, nodes); document.body.append(host);
        const previous = [new Map(), new Map()];
        for (let i = 1; i <= 200; i++) {
            turn.value = i;
            items.value = i % 13 === 0 ? [] : [i % 7, (i + 1) % 7, (i + 3) % 7];
            for (const [slot, name] of ['map', 'for'].entries()) {
                const rows = [...host.querySelectorAll('#stress-' + name + ' li')];
                check(rows.map(node => Number(node.dataset.id)).join() === items.value.join(), 'list ordering');
                rows.forEach(node => { const old = previous[slot].get(node.dataset.id); if (old) check(old === node, 'key identity'); });
                previous[slot] = new Map(rows.map(node => [node.dataset.id, node]));
            }
            host.querySelectorAll('[data-control]').forEach(node => check(node.textContent === (i % 2 ? 'yes' : 'no'), 'If/Show/Match'));
            check(host.querySelector('#stress-switch').textContent === (i % 2 ? 'odd' : 'even'), 'Switch');
            check(host.querySelector('#stress-dynamic').textContent === 'D' + i, 'Dynamic');
            check(document.title === 'T' + i && target.textContent === 'P' + i, 'Title/Portal');
        }
        for (let i = 1; i < tasks.length; i++) index.value = i;
        tasks.at(-1).resolve('latest'); await tick();
        for (let i = tasks.length - 2; i >= 0; i--) tasks[i].resolve('stale');
        await tick();
        check(host.querySelector('#stress-await').textContent === 'latest', 'Await race');
        check(host.querySelector('#stress-suspense').textContent === 'latest', 'Suspense race');
        check(host.querySelector('#stress-error').textContent === 'contained', 'ErrorBoundary');
        update([]); turn.value++; items.value = [99]; await tick();
        check(host.textContent === '' && target.childNodes.length === 0 && document.title === title, 'owned teardown');
        host.remove(); target.remove(); return { updates: 200, races: 30, clean: true };
    });
    expect(result).toEqual({ updates: 200, races: 30, clean: true });
    expect(errors).toEqual([]);
});
