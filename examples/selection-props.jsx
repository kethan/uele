/** Single/multiple select and select-all state. Install a signal adapter first. */
import { h } from 'uele';
import { signal, read, write } from 'uele/reactive';
import { appProps } from 'uele/props';

appProps();
export function SelectionForm() {
	const priority = signal('normal'), recipients = signal(['team']);
	const options = ['team', 'support', 'engineering'];
	return <fieldset>
		<legend>Notification preferences</legend>
		<label>Priority <select bindSelect={[priority, (value) => write(priority, value)]}>
			<option value="normal">Normal</option><option value="urgent">Urgent</option>
		</select></label>
		<label>Recipients <select multiple bindSelect={[recipients, (values) => write(recipients, values)]}>
			{options.map((value) => <option value={value}>{value}</option>)}
		</select></label>
		<label><input type="checkbox"
			bindChecked={[() => read(recipients).length === options.length,
				(checked) => write(recipients, checked ? [...options] : [])]}
			indeterminate={() => read(recipients).length > 0 && read(recipients).length < options.length} /> Select all recipients</label>
		<p text={() => `${read(priority)}: ${read(recipients).join(', ') || 'none'}`} />
	</fieldset>;
}
