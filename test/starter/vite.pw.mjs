import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// No React/plugin shim: both projects must use uele's automatic JSX runtime.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Little list', exact: true })).toBeVisible();
});
const rows = page => page.getByRole('list', { name: 'Tasks', exact: true }).locator('.todo-row');
const add = async (page, text) => {
  await page.getByRole('textbox', { name: 'New task' }).fill(text);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
};

test('boots without errors, uses uele JSX, and safely adds tasks', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.reload();
  await expect(rows(page)).toHaveCount(3);
  expect(await page.evaluate(() => typeof window.React)).toBe('undefined');
  await add(page, '   '); await expect(rows(page)).toHaveCount(3);
  await add(page, '  Learn uele  ');
  await expect(rows(page)).toHaveCount(4);
  await expect(rows(page).last()).toContainText('Learn uele');
  await expect(page.getByRole('textbox', { name: 'New task' })).toHaveValue('');
  await expect(page.locator('.count-badge')).toHaveText('3 left');
  await add(page, '<img src=x onerror=alert(1)>');
  await expect(rows(page).last()).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('img')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('toggles live bindings, filters, clears and recovers from an empty list', async ({ page }) => {
  const clear = page.getByRole('button', { name: 'Clear completed', exact: true });
  await clear.click(); await expect(rows(page)).toHaveCount(2);
  await expect(clear).toBeDisabled();
  await rows(page).first().getByRole('checkbox').check();
  await expect(rows(page).first()).toHaveClass(/is-complete/);
  await expect(page.locator('.count-badge')).toHaveText('1 left');
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Active', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(rows(page)).toHaveCount(1);
  // This action removes its own row; assert the resulting view, not a
  // re-resolved checkbox that no longer exists after the synchronous update.
  await rows(page).first().getByRole('checkbox').click();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('.empty-state')).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole('button', { name: /^Delete / }).first().click();
  await page.getByRole('button', { name: /^Delete / }).first().click();
  await expect(page.locator('.count-badge')).toHaveText('0 left');
  await expect(page.locator('.empty-state')).toBeVisible();
  await add(page, 'Start again'); await expect(rows(page)).toHaveCount(1);
});

test('retains keyed row DOM and supports keyboard submission', async ({ page }) => {
  await page.evaluate(() => { window.firstRow = document.querySelector('.todo-row'); });
  const input = page.getByRole('textbox', { name: 'New task' });
  await input.fill('Added with Enter'); await input.press('Enter');
  await expect(rows(page)).toHaveCount(4);
  expect(await page.evaluate(() => window.firstRow === document.querySelector('.todo-row'))).toBe(true);
  await page.getByRole('button', { name: 'Delete Added with Enter', exact: true }).click();
  expect(await page.evaluate(() => window.firstRow === document.querySelector('.todo-row'))).toBe(true);
  await expect(input).toBeFocused();
});

test('fits narrow screens and has no WCAG A/AA violations', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await add(page, 'A'.repeat(200));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 750 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
    return result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }));
  });
  expect(violations).toEqual([]);
});
