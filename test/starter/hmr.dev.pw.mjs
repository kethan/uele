import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

test('JSX hot updates remount exactly once and keep event handlers working', async ({ page }) => {
  const path = new URL('../../examples/vite-starter/src/App.jsx', import.meta.url);
  const original = readFileSync(path, 'utf8');
  const changed = original.replace('Make room for', 'Make space for');
  expect(changed).not.toBe(original);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('/');
  await expect(page.locator('.todo-row')).toHaveCount(3);
  try {
    writeFileSync(path, changed);
    await expect(page.locator('#page-title')).toContainText('Make space for');
    await expect(page.locator('#app > .site')).toHaveCount(1);
    await expect(page.locator('.todo-row')).toHaveCount(3);
    await page.getByRole('textbox', { name: 'New task' }).fill('After HMR');
    await page.getByRole('button', { name: 'Add task', exact: true }).click();
    await expect(page.locator('.todo-row')).toHaveCount(4);
    expect(errors).toEqual([]);
  } finally {
    writeFileSync(path, original);
  }
});
