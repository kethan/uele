/** @jsxImportSource uele */
/**
 * chat — a small messaging app: a presence list, a message thread and a
 * composer, built from primitives + a couple of cells. Sending appends
 * your bubble and (unless `autoReply: false`) earns a canned reply a
 * moment later. Unified layer only; `test/pages.test.jsx` chats on eight
 * presets with `autoReply` off for determinism.
 */
import { signal, read, write } from 'uele/reactive';
import { Card, Stack, Row, Heading, Avatar, StatusDot, Form, Input, Button } from 'uele/ui';

const CONTACTS = [
	{ name: 'Ada Lovelace', status: 'online' },
	{ name: 'Grace Hopper', status: 'away' },
	{ name: 'Linus Torvalds', status: 'offline' }
];

export const ChatPage = ({ autoReply = true } = {}) => {
	const contact = signal(CONTACTS[0].name);
	const draft = signal('');
	const messages = signal([
		{ from: 'Ada Lovelace', text: 'Hey! Did the deploy ship?' },
		{ from: 'me', text: 'It did — all green.' }
	]);

	const send = () => {
		const text = String(read(draft)).trim();
		if (!text) return;
		write(messages, [...read(messages), { from: 'me', text }]);
		write(draft, '');
		if (autoReply) {
			const to = read(contact);
			setTimeout(() => write(messages, [...read(messages), { from: to, text: 'Got it!' }]), 400);
		}
	};

	return (
		<Card style={{ maxWidth: '56rem', margin: '2rem auto' }}>
			<Row style={{ alignItems: 'flex-start' }}>
				<Stack style={{ minWidth: '12rem' }}>
					<Heading level={2}>Chats</Heading>
					{CONTACTS.map((c) => (
						<Button variant="ghost" onclick={() => write(contact, c.name)}>
							<Row>
								<Avatar name={c.name} size={28} />
								<span>{c.name}</span>
								<StatusDot status={c.status} label={`${c.name} is ${c.status}`} />
							</Row>
						</Button>
					))}
				</Stack>
				<Stack style={{ flex: '1 1 auto' }}>
					<Heading level={2}>{contact}</Heading>
					<Stack aria-label="Messages">
						{() => read(messages).map((m) => (
							<div style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', background: m.from === 'me' ? 'var(--uele-accent, #2563eb)' : 'var(--uele-surface-hover, #f1f5f9)', color: m.from === 'me' ? '#fff' : 'inherit', borderRadius: '1rem', padding: '0.5rem 0.875rem', maxWidth: '75%' }}>
								<span>{m.text}</span>
							</div>
						))}
					</Stack>
					<Form onSubmit={send}>
						<Row>
							<Input model={draft} placeholder="Type a message…" aria-label="Message" />
							<Button type="submit">Send</Button>
						</Row>
					</Form>
				</Stack>
			</Row>
		</Card>
	);
};

export const mountChat = (target = document.body, options) => {
	const app = ChatPage(options);
	target.append(app);
	return app;
};
