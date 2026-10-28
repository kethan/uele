/**
 * Browser harness for the Playwright pass. Boots the *consumer* module
 * graph — built core from /dist, source-ESM subpaths, preact-signals
 * preset — and mounts a small gallery plus router/Title scenarios the
 * specs drive through real DOM events. Specs interact via roles/testids
 * only; nothing here is test-aware beyond `data-ready`.
 */
import { h } from 'uele';
import { signal } from '@preact/signals-core';
import { preactSignals } from 'uele/signals/preact';
import { Button, Switch, Accordion, Tabs, Dialog } from 'uele/ui';
import { Title } from 'uele/flow';
import { createRouter, Router, Link } from 'uele/router';

preactSignals();

const app = document.getElementById('app');

/* ------------------------------------------------------------ gallery --- */
const notifications = signal(false);
const dialogOpen = signal(false);
const showTitle = signal(false);

const gallery = h(
	'section',
	{ 'data-testid': 'gallery', 'aria-label': 'Component gallery' },
	h('h1', {}, 'uele browser harness'),

	// Switch: state text is a live binding on the same signal.
	Switch({ model: notifications, label: 'Notifications' }),
	h('p', {}, ['Notifications: ', h('span', { 'data-testid': 'switch-state' }, () => (notifications.value ? 'on' : 'off'))]),

	// Accordion: starts fully closed, first header expands its region.
	Accordion({
		items: [{ value: 'shipping', title: 'Shipping', content: 'Ships in 2 days.' }],
		defaultValue: '',
	}),

	// Tabs: second tab swaps the tabpanel.
	Tabs({
		items: [
			{ value: 'one', label: 'One', content: 'First panel' },
			{ value: 'two', label: 'Two', content: 'Second panel' },
		],
	}),

	// Dialog: controlled open signal; trigger is a plain button so the spec
	// does not depend on Dialog's own trigger rendering.
	h(
		'button',
		{ type: 'button', 'data-testid': 'open-dialog', onclick: () => (dialogOpen.value = true) },
		'Open dialog',
	),
	Dialog({
		open: dialogOpen,
		onOpenChange: (v) => (dialogOpen.value = v),
		title: 'Harness dialog',
		description: 'A dialog rendered in a real browser.',
		children: [h('p', {}, 'Dialog body text.')],
	}),

	// Title region: toggling mounts/unmounts flow's Title — teardown must
	// restore the harness document title (regression covered in jsdom too).
	h('button', { type: 'button', 'data-testid': 'title-on', onclick: () => (showTitle.value = true) }, 'Show page title'),
	h('button', { type: 'button', 'data-testid': 'title-off', onclick: () => (showTitle.value = false) }, 'Hide page title'),
	() => (showTitle.value ? Title({ children: 'Deep Page — uele harness' }) : null),

	// A shipped Button for axe/visual coverage (specs don't drive it).
	Button({ children: 'Shipped button' }),
);

/* ------------------------------------------------------------- router --- */
const base = location.pathname; // served at /test/browser/harness.html
const router = createRouter();
router.get(base, () => h('div', {}, h('h2', {}, 'Home page'), Link({ to: base + '/about', children: 'About' })));
router.get(base + '/about', () => h('div', {}, h('h2', {}, 'About page'), Link({ to: base, children: 'Home' })));

app.append(gallery, Router({ app: router, 'data-testid': 'router-view', notFound: h('p', {}, 'Not found') }));
app.dataset.ready = 'true';
