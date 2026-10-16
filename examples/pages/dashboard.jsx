/** @jsxImportSource uele */
/**
 * dashboard — an admin overview page on the unified authoring layer:
 * AppShell + Navbar chrome, period-driven Stat cards (SegmentedControl),
 * goal Progress bars, an activity Timeline and a recent-orders DataTable.
 * Cells/hooks/primitives only — no signal-library imports;
 * `test/pages.test.jsx` mounts it on eight presets.
 */
import { signal, computed, read } from 'uele/reactive';
import {
	AppShell, Navbar, Stack, Row, Grid, Stat, Card, Heading, SegmentedControl,
	Progress, Timeline, DataTable, Badge
} from 'uele/ui';

const PERIODS = {
	day: { revenue: '$1,240', orders: 32, visitors: '1,204' },
	week: { revenue: '$8,930', orders: 214, visitors: '8,412' },
	month: { revenue: '$36,400', orders: 902, visitors: '34,020' }
};

export const DashboardPage = () => {
	const period = signal('week');
	const stats = computed(() => PERIODS[read(period)] || PERIODS.week);
	const orders = [
		{ id: '#1042', customer: 'Ada', total: '$120', state: 'paid' },
		{ id: '#1043', customer: 'Grace', total: '$86', state: 'pending' },
		{ id: '#1044', customer: 'Linus', total: '$240', state: 'paid' }
	];

	return (
		<AppShell
			header={<Navbar brand="Acme admin" links={[{ label: 'Overview', href: '#', current: true }, { label: 'Orders', href: '#orders' }]} />}
			sidebar={
				<Stack>
					<strong>Sections</strong>
					<span>Overview</span>
					<span>Orders</span>
					<span>Customers</span>
				</Stack>
			}
		>
			<Stack>
				<Row>
					<Heading level={1}>Overview</Heading>
					<SegmentedControl
						model={period}
						label="Period"
						options={[
							{ value: 'day', label: 'Day' },
							{ value: 'week', label: 'Week' },
							{ value: 'month', label: 'Month' }
						]}
					/>
				</Row>
				<Grid columns={3}>
					<Stat label="Revenue" value={() => read(stats).revenue} help="vs previous period" />
					<Stat label="Orders" value={() => read(stats).orders} />
					<Stat label="Visitors" value={() => read(stats).visitors} />
				</Grid>
				<Grid columns={2}>
					<Card>
						<Heading level={2}>Monthly goal</Heading>
						<Progress value={68} label="Monthly goal" />
						<span>68% of $50k</span>
					</Card>
					<Card>
						<Heading level={2}>Activity</Heading>
						<Timeline items={[
							{ title: 'Order #1044 paid', time: '2m ago' },
							{ title: 'New signup: Margaret', time: '1h ago' },
							{ title: 'Weekly report sent', time: '3h ago' }
						]} />
					</Card>
				</Grid>
				<Heading level={2}>Recent orders</Heading>
				<DataTable
					columns={[
						{ key: 'id', label: 'Order' },
						{ key: 'customer', label: 'Customer', sortable: true },
						{ key: 'total', label: 'Total' },
						{ key: 'state', label: 'Status', render: (v) => <Badge tone={v === 'paid' ? 'success' : 'warning'}>{v}</Badge> }
					]}
					data={orders}
				/>
			</Stack>
		</AppShell>
	);
};

export const mountDashboardPage = (target = document.body) => {
	const app = DashboardPage();
	target.append(app);
	return app;
};
