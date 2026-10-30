/** @jsxImportSource uele */
/** Simulated live presence + draft composer. Install a signal adapter before mounting. */
import { signal, read, write } from 'uele/reactive';
import { appProps, autoScroll } from 'uele/props';

appProps();

export function LiveComposer() {
	const online = signal(true), draft = signal(''), typing = signal(false);
	const set = (cell) => (value) => write(cell, value);
	return <section aria={{ label: 'Live composer' }} data={{ connection: () => read(online) ? 'online' : 'offline' }}>
		<button onclick={() => { write(online, !read(online)); }}>Toggle connection</button>
		<p role="status" aria={{ live: 'polite' }} text={() => read(online) ? 'Connected' : 'Reconnecting…'} />
		<label>Message <input bindValue={[draft, set(draft)]} disabled={() => !read(online)}
			listen={{ focus: () => { write(typing, true); }, blur: () => { write(typing, false); } }} /></label>
		<label><input type="checkbox" bindChecked={[typing, set(typing)]} /> Share typing status</label>
		<small show={typing}>Typing…</small>
		<p text={() => `Draft: ${read(draft)}`} />
		<div role="log" aria={{ label: 'Messages' }} style={{ maxHeight: '12rem', overflowY: 'auto' }} use={autoScroll()}>
			<p text={() => read(draft) || 'Your message preview appears here.'} />
		</div>
		<div use={(node) => {
			// Replace the timer with a WebSocket subscription in a real app.
			const timer = setInterval(() => { node.dataset.lastSeen = new Date().toISOString(); }, 1000);
			return () => clearInterval(timer);
		}}>Presence heartbeat (disposed when removed through a uele region)</div>
	</section>;
}
