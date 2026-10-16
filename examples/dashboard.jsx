/** @jsxImportSource uele */
/**
 * dashboard — the extended catalogue composed into one small admin screen:
 * themed AppShell + Navbar, Stat cards, a SearchInput driving a sortable
 * DataTable, a settings Dialog and a CommandPalette — all reactive through
 * whichever preset is installed.
 *
 *     import { mountDashboard } from './dashboard.jsx';
 *     mountDashboard(document.body);
 */
import { usePreactSignals } from 'uele/adapters/preact';
import { signal, computed } from '@preact/signals-core';
import {
	AppShell, Navbar, Stat, Grid, DataTable, SearchInput, Dialog, Button,
	CommandPalette, Badge, Row, Stack
} from 'uele/ui';
import { ThemeProvider, themes } from 'uele/themes';
import { useNow } from 'uele/hooks';

const USERS = [
	{ name: 'Ada', role: 'Admin', status: 'online' },
	{ name: 'Grace', role: 'Editor', status: 'away' },
	{ name: 'Linus', role: 'Viewer', status: 'offline' },
	{ name: 'Margaret', role: 'Editor', status: 'online' }
];

export const DashboardApp = () => {
	usePreactSignals();
	const theme = signal(themes.light);
	const query = signal('');
	const filtered = computed(() => USERS.filter((u) => u.name.toLowerCase().includes(query.value.toLowerCase())));
	const settingsOpen = signal(false);
	const [clock] = useNow(1000);
	const commands = [
		{ label: 'Toggle theme', hint: 'Appearance', onSelect: () => (theme.value = theme.value === themes.dark ? themes.light : themes.dark) },
		{ label: 'Open settings', hint: 'Dialog', onSelect: () => (settingsOpen.value = true) }
	];

	return (
		<ThemeProvider theme={theme}>
			<AppShell
				header={
					<Navbar
						brand="uele admin"
						links={[{ label: 'Users', href: '#users', current: true }, { label: 'Docs', href: '#docs' }]}
						actions={
							<Row>
								<span>{clock}</span>
								<CommandPalette trigger="Commands" items={commands} />
								<Button onclick={() => (theme.value = theme.value === themes.dark ? themes.light : themes.dark)}>Theme</Button>
							</Row>
						}
					/>
				}
				sidebar={
					<Stack>
						<strong>Sections</strong>
						<span>Users</span>
						<span>Settings</span>
					</Stack>
				}
			>
				<Stack>
					<Grid columns={3}>
						<Stat label="Users" value={USERS.length} help="all time" />
						<Stat label="Online" value={USERS.filter((u) => u.status === 'online').length} />
						<Stat label="Plan" value={<Badge tone="success">Pro</Badge>} />
					</Grid>
					<Row>
						<SearchInput model={query} placeholder="Filter users…" aria-label="Filter users" />
						<Button onclick={() => (settingsOpen.value = true)}>Settings</Button>
					</Row>
					<DataTable
						columns={[
							{ key: 'name', label: 'Name', sortable: true },
							{ key: 'role', label: 'Role', sortable: true },
							{ key: 'status', label: 'Status', render: (v) => <Badge tone={v === 'online' ? 'success' : 'neutral'}>{v}</Badge> }
						]}
						data={filtered}
					/>
					<Dialog model={settingsOpen} title="Settings" trigger={null}>
						<p>There is nothing to configure. It just works.</p>
					</Dialog>
				</Stack>
			</AppShell>
		</ThemeProvider>
	);
};

export const mountDashboard = (target = document.body) => {
	const app = DashboardApp();
	target.append(app);
	return app;
};
