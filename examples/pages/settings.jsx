/** @jsxImportSource uele */
/**
 * settings — an app settings page: Tabs (profile / notifications /
 * appearance), switches, a theme picker that restyles the page live
 * through ThemeProvider, and a danger-zone AlertDialog. Unified layer;
 * `test/pages.test.jsx` drives it on eight presets.
 */
import { signal, read, write } from 'uele/reactive';
import {
	Container, Stack, Heading, Tabs, Field, Input, Switch, Button, Select,
	Alert, AlertDialog
} from 'uele/ui';
import { ThemeProvider, themes } from 'uele/themes';

export const SettingsPage = () => {
	const name = signal('Ada Lovelace');
	const emailNews = signal(true);
	const pushNews = signal(false);
	const themeName = signal('light');
	const saved = signal('');
	const deleted = signal(false);

	const profile = (
		<Stack>
			<Field label="Display name">
				<Input model={name} aria-label="Display name" />
			</Field>
			<Button onclick={() => write(saved, `Saved profile for ${read(name)}`)}>Save profile</Button>
			{() => read(saved) ? <Alert tone="success">{saved}</Alert> : null}
		</Stack>
	);
	const notifications = (
		<Stack>
			<label>Email updates <Switch model={emailNews} label="Email updates" /></label>
			<label>Push notifications <Switch model={pushNews} label="Push notifications" /></label>
			<span>{() => `Email ${read(emailNews) ? 'on' : 'off'} · Push ${read(pushNews) ? 'on' : 'off'}`}</span>
		</Stack>
	);
	const appearance = (
		<Stack>
			<Field label="Theme">
				<Select model={themeName} options={Object.keys(themes)} aria-label="Theme" />
			</Field>
			<span>Current theme: {themeName}</span>
		</Stack>
	);

	return (
		<ThemeProvider theme={() => themes[read(themeName)] || themes.light}>
			<Container>
				<Stack>
					<Heading level={1}>Settings</Heading>
					<Tabs items={[
						{ value: 'profile', label: 'Profile', content: profile },
						{ value: 'notifications', label: 'Notifications', content: notifications },
						{ value: 'appearance', label: 'Appearance', content: appearance }
					]} />
					<Heading level={2}>Danger zone</Heading>
					{() => read(deleted) ? <Alert tone="danger">Account deleted (demo only — nothing happened)</Alert> : null}
					<AlertDialog
						trigger="Delete account"
						title="Delete this account?"
						description="This is a demo, so confirming only updates this page."
						danger
						confirmLabel="Delete"
						onConfirm={() => write(deleted, true)}
					>
						<span>There is no undo in demos either.</span>
					</AlertDialog>
				</Stack>
			</Container>
		</ThemeProvider>
	);
};

export const mountSettings = (target = document.body) => {
	const app = SettingsPage();
	target.append(app);
	return app;
};
