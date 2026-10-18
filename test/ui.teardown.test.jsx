/** @jsxImportSource uele */
/**
 * Teardown: document listeners, timers, observers and source subscriptions a
 * component creates must die when the region enclosing it discards its
 * subtree — the same disposal the core gives bindings and nested regions.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePreactSignals } from 'uele/adapters/preact';
import { signal } from '@preact/signals-core';
import {
	CommandPalette, ContextMenu, CountdownTimer, Dialog, InfiniteScroll,
	Lightbox, Switch, TimeAgo, Toast
} from 'uele/ui';

beforeEach(() => {
	usePreactSignals();
	document.body.innerHTML = '';
	document.body.style.overflow = '';
});
afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.useRealTimers(); });

const tick = () => new Promise((r) => setTimeout(r, 0));
/** mount `node` inside a switchable region; returns the gate cell */
const gated = (node) => {
	const show = signal(true);
	document.body.append(<div>{() => (show.value ? node : 'gone')}</div>);
	return show;
};

describe('document listeners are removed on teardown', () => {
	it('Dialog removes its Escape listener and stops following its open cell', () => {
		const spy = vi.spyOn(document, 'removeEventListener');
		const open = signal(false);
		const show = gated(<Dialog open={open} trigger="Launch" title="T">Body</Dialog>);
		show.value = false; // subtree discarded
		expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
		open.value = true; // the dead dialog must not lock the body any more
		expect(document.body.style.overflow).toBe('');
		expect(document.querySelector('[role=dialog]')).toBeNull();
		spy.mockRestore();
	});

	it('CommandPalette, ContextMenu and Lightbox remove theirs', () => {
		const spy = vi.spyOn(document, 'removeEventListener');
		const a = gated(<CommandPalette items={[]} />);
		const b = gated(<ContextMenu items={[]}><div>zone</div></ContextMenu>);
		const c = gated(Lightbox({ images: [{ src: 'a.png' }] }));
		a.value = b.value = c.value = false;
		expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function)); // palette + lightbox
		expect(spy).toHaveBeenCalledWith('click', expect.any(Function)); // context menu
		spy.mockRestore();
	});
});

describe('timers and observers are stopped on teardown', () => {
	it('TimeAgo freezes when torn down; CountdownTimer never completes', async () => {
		vi.useFakeTimers();
		const ago = gated(<TimeAgo date={new Date(Date.now() - 90_000)} interval={1000} />);
		const agoEl = document.querySelector('[data-uele-timeago]');
		expect(agoEl.textContent).toBe('1 minute ago');
		vi.advanceTimersByTime(61_000);
		expect(agoEl.textContent).toBe('2 minutes ago'); // ticking while mounted
		const done = vi.fn();
		const cd = gated(<CountdownTimer seconds={30} onComplete={done} />);
		const cdEl = document.querySelector('[data-uele-countdown]');
		ago.value = false;
		cd.value = false;
		vi.advanceTimersByTime(180_000);
		expect(agoEl.textContent).toBe('2 minutes ago'); // frozen at teardown
		expect(done).not.toHaveBeenCalled();
		expect(cdEl.getAttribute('data-done')).toBe('false');
	});

	it('InfiniteScroll disconnects its observer, and never attaches one if torn down first', async () => {
		const instances = [];
		vi.stubGlobal('IntersectionObserver', class {
			constructor(cb) { this.cb = cb; this.disconnected = false; instances.push(this); }
			observe() {}
			disconnect() { this.disconnected = true; }
		});
		const show = gated(<InfiniteScroll onLoadMore={() => {}}>rows</InfiniteScroll>);
		await tick(); // the observer attaches in a setTimeout(0)
		expect(instances.length).toBe(1);
		show.value = false;
		expect(instances[0].disconnected).toBe(true);

		const late = gated(<InfiniteScroll onLoadMore={() => {}}>rows</InfiniteScroll>);
		late.value = false; // discarded before the attach timeout fires
		await tick();
		expect(instances.length).toBe(1); // no observer was ever created for it
	});

	it('Toast neither fires its dismiss timer nor re-arms after teardown', async () => {
		vi.useFakeTimers();
		const onClose = vi.fn();
		const show = gated(<Toast title="Saved" duration={1000} onClose={onClose} />);
		show.value = false;
		vi.advanceTimersByTime(5000);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('Switch stops painting its background after teardown', () => {
		const model = signal(false);
		const show = gated(<Switch model={model} label="S" />);
		const el = document.querySelector('[role=switch]');
		show.value = false;
		model.value = true; // the dead switch must not repaint
		expect(el.style.background).not.toBe('var(--uele-accent, #2563eb)');
	});
});
