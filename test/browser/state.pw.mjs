import { test, expect } from '@playwright/test';

test('simple State todos work with the built full renderer, keyed rows and owned teardown', async ({ page }) => {
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    await expect(page.locator('#state-todos')).toBeVisible();
    expect(await page.evaluate(async () => (await import('uele')).api.engine.signal)).toBeUndefined();
    expect(requests.some(url => url.includes('/signals/') || url.includes('/node_modules/'))).toBe(false);
    expect((await page.request.get('/.git/config')).status()).toBe(404);
    await page.evaluate(async () => {
        const { useLive } = await import('uele');
        const app = document.getElementById('state-todos');
        const [nodes, replace] = useLive(app); document.body.append(...nodes);
        window.removeStateTodos = () => replace([]);
    });
    const app = page.locator('#state-todos');
    await app.getByRole('textbox').fill('First'); await app.getByRole('button', { name: 'Add', exact: true }).click();
    await page.evaluate(() => { window.stateFirstRow = document.querySelector('#state-todos li'); });
    await app.getByRole('textbox').fill('<img src=x>'); await app.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(app.locator('li')).toHaveCount(2); await expect(app.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('#state-todos li') === window.stateFirstRow)).toBe(true);
    await app.getByRole('checkbox').first().check();
    await expect(app.locator('li span').first()).toHaveCSS('text-decoration-line', 'line-through');
    await app.getByRole('checkbox').first().uncheck();
    await expect(app.locator('li span').first()).toHaveCSS('text-decoration-line', 'none');
    await app.getByRole('button', { name: 'Delete' }).nth(1).click(); await expect(app.locator('li')).toHaveCount(1);
    await app.getByRole('button', { name: 'Delete' }).click(); await expect(app.locator('li')).toHaveCount(0);
    await page.evaluate(() => window.removeStateTodos()); await expect(app).toHaveCount(0);
    expect(errors).toEqual([]);
});
