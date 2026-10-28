import { afterEach, expect, test, vi } from 'vitest';
import { useUlive } from 'uele/adapters/ulive';
import { useLive } from 'uele';
import { LiveComposer } from '../examples/live-props.jsx';

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
test('live composer updates connection, draft, typing and disposes heartbeat', () => {
	useUlive(); vi.useFakeTimers();
	const app = LiveComposer();
	const [nodes, set] = useLive([app]); document.body.append(...nodes);
	const input = app.querySelector('input:not([type])');
	input.value = 'Hello'; input.dispatchEvent(new Event('input'));
	expect(app.textContent).toContain('Draft: Hello');
	input.dispatchEvent(new Event('focus')); expect(app.querySelector('small').hidden).toBe(false);
	input.dispatchEvent(new Event('blur')); expect(app.querySelector('small').hidden).toBe(true);
	app.querySelector('button').click(); expect(input.disabled).toBe(true);
	expect(app.dataset.connection).toBe('offline'); expect(app.textContent).toContain('Reconnecting');
	vi.advanceTimersByTime(1000); expect(app.querySelector('[data-last-seen]').dataset.lastSeen).toBeTruthy();
	set([]); expect(vi.getTimerCount()).toBe(0);
});
