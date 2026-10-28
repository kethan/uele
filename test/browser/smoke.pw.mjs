/**
 * Real-browser smoke + accessibility pass (Playwright + axe-core).
 *
 * Complements the jsdom suites: verifies the *built* bundles boot in
 * Chromium with a clean console, that shipped components respond to real
 * input, that region teardown restores `document.title`, that the router
 * intercepts links and follows history, and that the rendered gallery is
 * axe-clean (wcag2a/wcag2aa). Run with `npm run test:browser`.
 */
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const HARNESS = '/test/browser/harness.html';
const axePath = fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url));

/** Boot the harness, collecting pageerrors and console errors as they happen. */
async function boot(page) {
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	await page.goto(HARNESS);
	try {
		await expect(page.getByTestId('gallery')).toBeVisible();
	} catch (error) {
		throw new Error(`Harness failed to boot. Browser errors:\n${errors.join('\n') || '(none captured)'}`, { cause: error });
	}
	return errors;
}

/** In-page error collector installed by harness.html (belt and braces). */
const harnessErrors = (page) => page.evaluate(() => window.__errors);

async function runAxe(page) {
	await page.addScriptTag({ path: axePath });
	return page.evaluate(async () => {
		const results = await axe.run(document, {
			runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
		});
		return results.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} node(s))`);
	});
}

test('boots with no console errors', async ({ page }) => {
	const errors = await boot(page);
	await expect(page.getByRole('heading', { name: 'uele browser harness' })).toBeVisible();
	expect(errors).toEqual([]);
	expect(await harnessErrors(page)).toEqual([]);
});

test('switch, accordion and tabs respond to real input', async ({ page }) => {
	const errors = await boot(page);

	const toggle = page.getByRole('switch');
	await expect(toggle).toHaveAttribute('aria-checked', 'false');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-checked', 'true');
	await expect(page.getByTestId('switch-state')).toHaveText('on');

	const header = page.getByRole('button', { name: 'Shipping' });
	await expect(header).toHaveAttribute('aria-expanded', 'false');
	await header.click();
	await expect(header).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText('Ships in 2 days.')).toBeVisible();

	await page.getByRole('tab', { name: 'Two' }).click();
	await expect(page.getByRole('tabpanel')).toHaveText('Second panel');

	expect(errors).toEqual([]);
	expect(await harnessErrors(page)).toEqual([]);
});

test('dialog opens, locks scroll, Escape closes and unlocks', async ({ page }) => {
	const errors = await boot(page);

	await page.getByTestId('open-dialog').click();
	const dialog = page.getByRole('dialog', { name: 'Harness dialog' });
	await expect(dialog).toBeVisible();
	await expect(page.getByText('Dialog body text.')).toBeVisible();
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

	expect(errors).toEqual([]);
});

test('Title region teardown restores document.title', async ({ page }) => {
	const errors = await boot(page);
	await expect(page).toHaveTitle('Harness');

	await page.getByTestId('title-on').click();
	await expect(page).toHaveTitle('Deep Page — uele harness');

	await page.getByTestId('title-off').click();
	await expect(page).toHaveTitle('Harness');

	expect(errors).toEqual([]);
});

test('router intercepts links and follows history', async ({ page }) => {
	const errors = await boot(page);

	await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible();
	await page.getByRole('link', { name: 'About' }).click();
	await expect(page).toHaveURL(/\/about$/);
	await expect(page.getByRole('heading', { name: 'About page' })).toBeVisible();

	await page.goBack();
	await expect(page).toHaveURL(/harness\.html$/);
	await expect(page.getByRole('heading', { name: 'Home page' })).toBeVisible();

	expect(errors).toEqual([]);
});

test('axe finds no wcag2a/wcag2aa violations (gallery, then open dialog)', async ({ page }) => {
	await boot(page);
	expect(await runAxe(page)).toEqual([]);

	await page.getByTestId('open-dialog').click();
	await expect(page.getByRole('dialog', { name: 'Harness dialog' })).toBeVisible();
	expect(await runAxe(page)).toEqual([]);
});
