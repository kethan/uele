import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
const results = JSON.parse(readFileSync('examples/size-proof/results.json', 'utf8'));

for (const row of results.rows) {
    test(`${row.name}: complete ${row.gzip}-byte gzip app works without extra JavaScript`, async ({ page }) => {
        const errors = [], scripts = [];
        page.on('pageerror', error => errors.push(String(error)));
        page.on('request', request => { if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname); });
        const code = readFileSync(`examples/size-proof/dist/${row.name}.js`);
        expect(createHash('sha256').update(code).digest('hex')).toBe(row.sha256);
        const compressed = readFileSync(`examples/size-proof/dist/${row.name}.js.gz`);
        expect(gzipSync(code).length).toBe(row.gzipDefault);
        expect(compressed.length).toBe(row.gzip); expect(gunzipSync(compressed)).toEqual(code);
        expect(row.gzip).toBeLessThan(row.budget); expect(row.gzipDefault).toBeLessThan(row.budget);
        await page.goto(`/examples/size-proof/${row.name}.html`);
        if (row.name === 'hello') await expect(page.locator('h1')).toHaveText('Hello World');
        else if (row.name.includes('counter')) {
            await expect(page.locator('output')).toHaveText('0');
            for (let i = 0; i < 25; i++) await page.getByRole('button', { name: 'Increment', exact: true }).click();
            await expect(page.locator('output')).toHaveText('25');
            for (let i = 0; i < 30; i++) await page.getByRole('button', { name: 'Decrement', exact: true }).click();
            await expect(page.locator('output')).toHaveText('-5');
        } else {
            const input = page.getByRole('textbox', { name: 'New todo' });
            await input.fill('   '); await input.press('Enter'); await expect(page.locator('li')).toHaveCount(0);
            for (const text of ['Buy milk', 'Learn uele', '<img src=x onerror=alert(1)>']) { await input.fill(text); await input.press('Enter'); }
            await expect(page.locator('li')).toHaveCount(3); await expect(input).toHaveValue('');
            await expect(page.locator('img')).toHaveCount(0);
            // Keyed rows survive unrelated additions and deletions.
            const first = await page.locator('li').first().elementHandle();
            await page.getByRole('checkbox').first().check();
            await expect(page.locator('li span').first()).toHaveCSS('text-decoration-line', 'line-through');
            await input.fill('Fourth'); await input.press('Enter');
            expect(await first.evaluate(node => node === document.querySelector('li'))).toBe(true);
            await page.locator('li').nth(1).getByRole('button', { name: 'Delete' }).click();
            expect(await first.evaluate(node => node === document.querySelector('li'))).toBe(true);
            await expect(page.getByRole('checkbox').first()).toBeChecked();
            await page.getByRole('checkbox').first().uncheck();
            await expect(page.locator('li span').first()).toHaveCSS('text-decoration-line', 'none');
            while (await page.locator('li').count()) await page.locator('li').first().getByRole('button', { name: 'Delete' }).click();
            await expect(page.locator('li')).toHaveCount(0);
            await input.fill('After empty'); await input.press('Enter'); await expect(page.locator('li')).toContainText('After empty');
        }
        expect(scripts).toEqual([`/examples/size-proof/dist/${row.name}.js`]);
        expect(errors).toEqual([]);
    });
}
