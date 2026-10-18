/** @jsxImportSource uele */
/**
 * Components used with NO signal preset installed.
 *
 * `uele/ui` keeps its internal state in `own()` cells: when `signal()` has no
 * preset behind it, `own()` falls back to a tiny hand-rolled cell so
 * uncontrolled components still work standalone. Every other test file
 * installs a preset before mounting, so this file deliberately does not —
 * it is the only coverage of that fallback (ui/index.js `own()`).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Toggle, Checkbox, AlertDialog } from 'uele/ui';

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('ui components without a signal preset', () => {
	it('Toggle mounts and toggles via the fallback cell', async () => {
		const onChange = vi.fn();
		const node = <Toggle onChange={onChange}>Bold</Toggle>;
		document.body.append(node);
		await new Promise((r) => setTimeout(r, 0));
		// first paint works; without an effect runner bindings do not re-run
		// (the same documented limit as the subscribe-only presets), so the
		// state contract is asserted through onChange, which must toggle
		expect(node.getAttribute('aria-pressed')).toBe('false');
		node.click();
		await new Promise((r) => setTimeout(r, 0));
		expect(onChange).toHaveBeenCalledWith(true);
		node.click();
		await new Promise((r) => setTimeout(r, 0));
		expect(onChange).toHaveBeenLastCalledWith(false);
	});

	it('Checkbox mounts and reports changes without a preset', async () => {
		const onChange = vi.fn();
		document.body.append(<Checkbox aria-label="agree" onChange={onChange} />);
		const input = document.body.querySelector('input[type="checkbox"]');
		expect(input).toBeTruthy();
		input.click();
		await new Promise((r) => setTimeout(r, 0));
		expect(input.checked).toBe(true);
		expect(onChange).toHaveBeenCalled();
	});

	it('AlertDialog drives the fallback subscribe/notify path and restores scroll', async () => {
		// AlertDialog's inner open-state is an own() fallback cell here, and
		// Dialog subscribes to it for the scroll lock: mounting exercises
		// subscribe() (immediate call), Confirm writes it (notify), and the
		// lock must be applied then restored even with no effect runner.
		const onConfirm = vi.fn();
		document.body.append(<AlertDialog defaultOpen onConfirm={onConfirm} title="Delete file?">This cannot be undone.</AlertDialog>);
		await new Promise((r) => setTimeout(r, 0));
		expect(document.body.querySelector('[role="alertdialog"], [role="dialog"]')).toBeTruthy();
		expect(document.body.style.overflow).toBe('hidden'); // applyLock ran via the subscription
		const confirm = [...document.body.querySelectorAll('button')].find((b) => b.getAttribute('data-action') === 'confirm');
		confirm.click();
		await new Promise((r) => setTimeout(r, 0));
		expect(onConfirm).toHaveBeenCalled();
		expect(document.body.style.overflow).toBe(''); // write notified applyLock, lock restored
	});
});
