import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Runs the SAME complete todos scenario against the example app of every
 * signal preset — the "works with every signal library, out of the box" proof.
 * Each mount re-wires its preset (shared `api`), state is fresh per TodoApp().
 */

const APPS = [
	['ulive', 'ulive'],
	['preact', '@preact/signals-core'],
	['vue', '@vue/reactivity'],
	['usignal', 'usignal'],
	['alien-signals', 'alien-signals'],
	['s-js', 's-js'],
	['mobx', 'mobx'],
	['rxjs', 'rxjs'],
	['nanostores', 'nanostores'],
	['tanstack', '@tanstack/store'],
	['solid', 'solid-js']
];

// ---- tiny dom driver ----
const input = (app) => app.querySelector('input[aria-label="New todo"]');
const list = (app) => app.querySelector('[aria-label="Todo list"]');
const rows = (app) => [...list(app).children]; // apps are mounted: jsdom fires `change` only for attached controls
const rowLabel = (row) => row.querySelector('label') || row; // the empty-state row IS the label
const rowText = (row) => rowLabel(row).textContent;
const add = (app, text) => {
	input(app).value = text;
	input(app).dispatchEvent(new Event('input'));
	app.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
};
const toggleRow = (i) => (app) => {
	const cb = rows(app)[i].querySelector('input[type=checkbox]');
	cb.click();
};
const delRow = (i) => (app) => rows(app)[i].querySelector('button').click();
const clickText = (t) => (app) =>
	[...app.querySelectorAll('button')].find((b) => b.textContent.trim() === t).click();
const spans = (app) => [...app.querySelectorAll('span')].map((s) => s.textContent);

describe.each(APPS)('todos app — %s (via %s)', (slug, lib) => {
	let mod;
	beforeEach(async () => {
		document.body.innerHTML = '';
		mod = await import(`../examples/todos/${slug}.jsx`);
	});

	it('mounts fresh and shows the empty state', () => {
		const app = mod.mountTodos(document.body);
		expect(rows(app).length).toBe(1); // "Nothing here"
		expect(rowText(rows(app)[0])).toBe('Nothing here');
		expect(spans(app)[0]).toBe('0 left');
		expect(spans(app)[1]).toBe('Filter: all');
		expect(input(app).value).toBe('');
		expect(input(app).placeholder).toBe('What needs doing?');
	});

	it('adds todos and keeps the remaining count live', () => {
		const app = mod.mountTodos(document.body);
		add(app, 'buy milk');
		add(app, 'walk dog');
		add(app, 'write tests');
		expect(rows(app).map(rowText)).toEqual(['buy milk', 'walk dog', 'write tests']);
		expect(spans(app)[0]).toBe('3 left');
		expect(input(app).value).toBe(''); // cleared after add
		add(app, '   '); // whitespace-only: ignored
		expect(rows(app).length).toBe(3);
	});

	it('toggles done (strike-through + count) and deletes', () => {
		const app = mod.mountTodos(document.body);
		add(app, 'a');
		add(app, 'b');
		add(app, 'c');
		toggleRow(0)(app);
		expect(rows(app)[0].querySelector('input').checked).toBe(true);
		expect(rowLabel(rows(app)[0]).style.textDecoration).toContain('line-through');
		expect(spans(app)[0]).toBe('2 left');
		toggleRow(0)(app); // untoggle
		expect(spans(app)[0]).toBe('3 left');
		delRow(1)(app); // deletes 'b', which is not done
		expect(rows(app).map(rowText)).toEqual(['a', 'c']);
		expect(spans(app)[0]).toBe('2 left');
	});

	it('filters all/active/completed and updates the filter indicator', () => {
		const app = mod.mountTodos(document.body);
		add(app, 'a');
		add(app, 'b');
		add(app, 'c');
		toggleRow(1)(app); // b done
		clickText('Active')(app);
		expect(rows(app).map(rowText)).toEqual(['a', 'c']);
		expect(spans(app)[1]).toBe('Filter: active');
		clickText('Completed')(app);
		expect(rows(app).map(rowText)).toEqual(['b']);
		expect(spans(app)[1]).toBe('Filter: completed');
		clickText('All')(app);
		expect(rows(app).map(rowText)).toEqual(['a', 'b', 'c']);
		expect(spans(app)[1]).toBe('Filter: all');
	});

	it('clears completed and survives a full round trip', () => {
		const app = mod.mountTodos(document.body);
		add(app, 'keep');
		add(app, 'drop-1');
		add(app, 'drop-2');
		toggleRow(1)(app);
		toggleRow(2)(app);
		clickText('Clear completed')(app);
		expect(rows(app).map(rowText)).toEqual(['keep']);
		expect(spans(app)[0]).toBe('1 left');
		toggleRow(0)(app);
		expect(spans(app)[0]).toBe('0 left');
		expect(rowText(rows(app)[0])).toBe('keep');
	});

	it('mounts independent instances (no shared state)', () => {
		const a = mod.TodoApp();
		add(a, 'only in a');
		const b = mod.TodoApp();
		expect(rowText(rows(b)[0])).toBe('Nothing here');
		add(b, 'only in b');
		expect(rows(a).map(rowText)).toEqual(['only in a']);
		expect(rows(b).map(rowText)).toEqual(['only in b']);
	});
});
