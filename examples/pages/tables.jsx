/** @jsxImportSource uele */
/**
 * tables — a data-table page: a SearchInput filters a sortable, paginated
 * DataTable of people, with a live "N people" count. Written once against
 * `uele/reactive`; `test/pages.test.jsx` sorts, filters and pages it on
 * eight signal presets.
 */
import { signal, computed, read } from 'uele/reactive';
import { Container, Stack, Row, Heading, Text, SearchInput, DataTable, Badge } from 'uele/ui';

const PEOPLE = [
	{ name: 'Ada Lovelace', role: 'Admin', status: 'online', age: 36 },
	{ name: 'Grace Hopper', role: 'Editor', status: 'away', age: 45 },
	{ name: 'Linus Torvalds', role: 'Viewer', status: 'offline', age: 54 },
	{ name: 'Margaret Hamilton', role: 'Editor', status: 'online', age: 33 },
	{ name: 'Alan Turing', role: 'Viewer', status: 'offline', age: 41 },
	{ name: 'Edsger Dijkstra', role: 'Admin', status: 'away', age: 48 },
	{ name: 'Barbara Liskov', role: 'Editor', status: 'online', age: 39 },
	{ name: 'Donald Knuth', role: 'Viewer', status: 'offline', age: 60 },
	{ name: 'Radia Perlman', role: 'Admin', status: 'online', age: 44 },
	{ name: 'Tim Berners-Lee', role: 'Editor', status: 'away', age: 52 }
];

export const TablesPage = () => {
	const query = signal('');
	const filtered = computed(() => {
		const q = String(read(query)).toLowerCase();
		return PEOPLE.filter((p) => !q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));
	});

	return (
		<Container>
			<Stack>
				<Heading level={1}>People</Heading>
				<Row>
					<SearchInput model={query} placeholder="Filter people…" aria-label="Filter people" />
					<Text as="span">{() => `${read(filtered).length} people`}</Text>
				</Row>
				<DataTable
					columns={[
						{ key: 'name', label: 'Name', sortable: true },
						{ key: 'role', label: 'Role', sortable: true },
						{ key: 'age', label: 'Age', sortable: true },
						{ key: 'status', label: 'Status', render: (v) => <Badge tone={v === 'online' ? 'success' : v === 'away' ? 'warning' : 'neutral'}>{v}</Badge> }
					]}
					data={filtered}
					pageSize={4}
					empty="No people match"
				/>
			</Stack>
		</Container>
	);
};

export const mountTables = (target = document.body) => {
	const app = TablesPage();
	target.append(app);
	return app;
};
