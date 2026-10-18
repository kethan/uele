/** @jsxImportSource uele */
/**
 * The sample pages (`examples/pages/*`) are written ONCE against the
 * unified authoring layer — `uele/reactive` cells, `uele/hooks` and
 * `uele/ui` primitives; no page imports a signal library. This suite proves
 * it: every page is mounted and driven end-to-end (fill, click, submit,
 * sort, buy, chat) on nine different presets, asserting only DOM outcomes.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mountLogin } from '../examples/pages/login.jsx';
import { mountDashboardPage } from '../examples/pages/dashboard.jsx';
import { mountTables } from '../examples/pages/tables.jsx';
import { mountWebsite } from '../examples/pages/website.jsx';
import { mountSettings } from '../examples/pages/settings.jsx';
import { mountShop } from '../examples/pages/shop.jsx';
import { mountChat } from '../examples/pages/chat.jsx';

const PRESETS = [
	['ulive', 'uele/adapters/ulive', 'useUlive'],
	['preact', 'uele/adapters/preact', 'usePreactSignals'],
	['vue', 'uele/adapters/vue', 'useVue'],
	['usignal', 'uele/adapters/usignal', 'useUsignal'],
	['alien-signals', 'uele/adapters/alien-signals', 'useAlienSignals'],
	['s-js', 'uele/adapters/sjs', 'useSjs'],
	['mobx', 'uele/adapters/mobx', 'useMobx'],
	['solid', 'uele/adapters/solid', 'useSolid'],
	['signals', 'uele/adapters/signals', 'useSignals']
];

const settle = () => new Promise((r) => setTimeout(r, 0)); // usignal paints on the next tick; everyone else is sync
const type = async (input, value) => {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	await settle();
};
const choose = async (select, value) => {
	select.value = value;
	select.dispatchEvent(new Event('change', { bubbles: true }));
	await settle();
};
const byText = (root, selector, text) => [...root.querySelectorAll(selector)].find((el) => el.textContent.trim() === text || el.textContent.includes(text));
const submit = async (root) => {
	root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	await settle();
};

describe('pages are unified: no signal-library imports, all uele/reactive', () => {
	const dir = process.cwd() + '/examples/pages/';
	for (const file of ['login.jsx', 'dashboard.jsx', 'tables.jsx', 'website.jsx', 'settings.jsx', 'shop.jsx', 'chat.jsx']) {
		it(file + ' only uses the unified layer', () => {
			const src = readFileSync(dir + file, 'utf8');
			expect(src).toContain("from 'uele/reactive'");
			for (const lib of ['@preact/signals-core', 'ulive', '@vue/reactivity', 'usignal', 'alien-signals', 's-js', 'mobx', 'solid-js'])
				expect(src, file + ' must not import ' + lib).not.toContain(`from '${lib}'`);
		});
	}
});

describe.each([
	['rxjs', 'uele/adapters/rxjs', 'useRxjs'],
	['nanostores', 'uele/adapters/nanostores', 'useNanostores'],
	['tanstack', 'uele/adapters/tanstack', 'useTanstackStore']
])('sample pages (first paint) on subscribe-only %s', (slug, path, fn) => {
	beforeEach(async () => {
		document.body.innerHTML = '';
		(await import(path))[fn]();
	});

	it('website and login render their initial paint without an effect runner', async () => {
		// static regions paint; reactive thunk children (`{() => price}`) are
		// the documented subscribe-only limitation — they need an effect runner
		const site = mountWebsite(document.body);
		await settle();
		expect(site.textContent).toContain('Ship reactive apps');
		expect(site.textContent).toContain('Starter');
		expect(site.textContent).toContain('Which signal library should I use?');
		document.body.innerHTML = '';
		const login = mountLogin(document.body);
		await settle();
		expect(login.textContent).toContain('Welcome back');
		expect(login.textContent).toContain('Demo account');
	});
});

describe.each(PRESETS)('sample pages on %s', (slug, path, fn) => {
	beforeEach(async () => {
		document.body.innerHTML = '';
		document.body.style.overflow = '';
		(await import(path))[fn]();
	});

	it('login validates, rejects and accepts the demo account', async () => {
		const app = mountLogin(document.body);
		const email = app.querySelector('input[aria-label="Email"]');
		const password = app.querySelector('input[aria-label="Password"]');
		await type(email, 'not-an-email');
		await type(password, 'password123');
		await submit(app);
		expect(app.textContent).toContain('valid email');

		await type(email, 'demo@uele.dev');
		await type(password, 'wrong-password');
		await submit(app);
		expect(app.textContent).toContain('Invalid credentials');

		await type(password, 'password123');
		await submit(app);
		expect(app.textContent).toContain('Welcome back');
		expect(app.querySelector('[role="alert"], [role="status"]')).toBeTruthy();
	});

	it('dashboard stats follow the period segmented control', async () => {
		const app = mountDashboardPage(document.body);
		expect(app.textContent).toContain('$8,930'); // week by default
		byText(app, 'button', 'Month').click();
		await settle();
		expect(app.textContent).toContain('$36,400');
		byText(app, 'button', 'Day').click();
		await settle();
		expect(app.textContent).toContain('$1,240');
		expect(app.textContent).toContain('Recent orders');
	});

	it('tables page filters, sorts and pages', async () => {
		const app = mountTables(document.body);
		expect(app.textContent).toContain('10 people');
		const search = app.querySelector('input[type="search"], input[aria-label="Filter people"]');
		await type(search, 'editor');
		expect(app.textContent).toContain('4 people');
		await type(search, '');
		app.querySelector('[data-sort="age"]').click();
		await settle();
		expect(app.querySelector('tbody td').textContent).toBe('Margaret Hamilton'); // youngest first
		app.querySelector('[aria-label="Go to next page"]').click();
		await settle();
		expect(app.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
	});

	it('website pricing toggles and FAQ expands', async () => {
		const app = mountWebsite(document.body);
		expect(app.textContent).toContain('$9/mo');
		byText(app, 'button', 'Yearly').click();
		await settle();
		expect(app.textContent).toContain('$90/yr');
		expect(app.textContent).not.toContain('$9/mo');
		const faq = [...app.querySelectorAll('button[aria-expanded]')].find((b) => b.textContent.includes('virtual DOM'));
		faq.click();
		await settle();
		expect(faq.getAttribute('aria-expanded')).toBe('true');
		expect(app.textContent).toContain('marked DOM region');
	});

	it('settings page tabs, switches and live theme picker', async () => {
		const app = mountSettings(document.body);
		byText(app, '[role="tab"]', 'Notifications').click();
		await settle();
		expect(app.textContent).toContain('Email on');
		const push = [...app.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Push notifications' || b.closest('label')?.textContent.includes('Push'));
		push.click();
		await settle();
		expect(app.textContent).toContain('Push on');

		byText(app, '[role="tab"]', 'Appearance').click();
		await settle();
		await choose(app.querySelector('select[aria-label="Theme"]'), 'dark');
		expect(app.dataset.appearance).toBe('dark');

		byText(app, 'button', 'Delete account').click();
		await settle();
		app.querySelector('[data-action="confirm"]').click();
		await settle();
		expect(app.textContent).toContain('Account deleted');
	});

	it('shop adds to cart, totals and checks out', async () => {
		const app = mountShop(document.body);
		const addKeyboard = () => byText(app, 'button', 'Add Mechanical keyboard to cart').click();
		addKeyboard();
		await settle();
		addKeyboard();
		await settle();
		byText(app, 'button', 'Cart').click();
		await settle();
		expect(app.querySelector('[aria-label="Quantity of Mechanical keyboard"]').textContent).toBe('2');
		expect(app.textContent).toContain('Total: $178.00');
		app.querySelector('[aria-label="Increase Mechanical keyboard"]').click();
		await settle();
		expect(app.textContent).toContain('Total: $267.00');
		byText(app, 'button', 'Checkout').click();
		await settle();
		expect(app.textContent).toContain('Order placed');
	});

	it('chat sends a message to the selected contact thread', async () => {
		const app = mountChat(document.body, { autoReply: false });
		const input = app.querySelector('input[aria-label="Message"]');
		await type(input, 'Shipping tomorrow!');
		await submit(app);
		expect(app.querySelector('[aria-label="Messages"]').textContent).toContain('Shipping tomorrow!');
		expect(input.value).toBe('');
		const grace = [...app.querySelectorAll('button')].find((b) => b.textContent.includes('Grace Hopper'));
		grace.click();
		await settle();
		expect(app.querySelector('h2').textContent).toBeTruthy();
		expect(app.textContent).toContain('Grace Hopper');
	});
});
