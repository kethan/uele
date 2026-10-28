import { afterEach, expect, test } from 'vitest';
import { useUlive } from 'uele/adapters/ulive';
import { SelectionForm } from '../examples/selection-props.jsx';

afterEach(() => document.body.replaceChildren());
test('selection example updates priority, select-all and mixed state', () => {
	useUlive(); const app = SelectionForm(); document.body.append(app);
	const [single, multiple] = app.querySelectorAll('select');
	const all = app.querySelector('input');
	expect(all.indeterminate).toBe(true); expect(multiple.selectedOptions.length).toBe(1);
	all.click(); expect(multiple.selectedOptions.length).toBe(3); expect(all.indeterminate).toBe(false);
	all.click(); expect(multiple.selectedOptions.length).toBe(0); expect(all.checked).toBe(false);
	single.value = 'urgent'; single.dispatchEvent(new Event('change'));
	expect(app.querySelector('p').textContent).toBe('urgent: none');
});
