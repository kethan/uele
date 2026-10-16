/** @jsxImportSource uele */
/**
 * website — a small marketing site in one file: navbar, hero, feature grid,
 * pricing with a monthly/yearly SegmentedControl, testimonials and an FAQ
 * accordion, footer. Unified-layer only (`uele/reactive` + `uele/ui`);
 * `test/pages.test.jsx` toggles its pricing and FAQ on eight presets.
 */
import { signal, read } from 'uele/reactive';
import {
	Navbar, Container, Stack, Row, Grid, Card, Heading, Text, Button, Badge,
	SegmentedControl, Avatar, Accordion, Separator
} from 'uele/ui';

const PLANS = [
	{ name: 'Starter', monthly: 9, yearly: 90, blurb: 'For side projects' },
	{ name: 'Pro', monthly: 29, yearly: 290, blurb: 'For growing teams' },
	{ name: 'Scale', monthly: 99, yearly: 990, blurb: 'For serious traffic' }
];

export const WebsitePage = () => {
	const billing = signal('monthly');
	const price = (plan) => () => (read(billing) === 'monthly' ? `$${plan.monthly}/mo` : `$${plan.yearly}/yr`);

	return (
		<div>
			<Navbar
				brand="Nimbus"
				links={[
					{ label: 'Features', href: '#features' },
					{ label: 'Pricing', href: '#pricing' },
					{ label: 'FAQ', href: '#faq' }
				]}
				actions={<Button>Start free</Button>}
			/>
			<Container>
				<Stack style={{ gap: '3rem', padding: '2rem 0' }}>
					<Stack style={{ textAlign: 'center', alignItems: 'center' }}>
						<Badge tone="info">New: realtime sync</Badge>
						<Heading level={1}>Ship reactive apps without the framework tax</Heading>
						<Text>uele renders straight to the DOM — your signals, your rules, no virtual DOM.</Text>
						<Row>
							<Button variant="solid">Get started</Button>
							<Button variant="outline">Read the docs</Button>
						</Row>
					</Stack>

					<Grid columns={3}>
						<Card><Heading level={2}>Tiny</Heading><Text>~2 kB core, zero dependencies, tree-shakeable primitives.</Text></Card>
						<Card><Heading level={2}>Signal-native</Heading><Text>Bring ulive, preact, vue, solid — any of eleven libraries.</Text></Card>
						<Card><Heading level={2}>Headless</Heading><Text>Accessible primitives, your styles, Radix-style ergonomics.</Text></Card>
					</Grid>

					<Stack>
						<Heading level={2}>Pricing</Heading>
						<SegmentedControl
							model={billing}
							label="Billing period"
							options={[
								{ value: 'monthly', label: 'Monthly' },
								{ value: 'yearly', label: 'Yearly' }
							]}
						/>
						<Grid columns={3}>
							{PLANS.map((plan) => (
								<Card>
									<Stack>
										<Heading level={3}>{plan.name}</Heading>
										<strong style={{ fontSize: '1.75rem' }}>{price(plan)}</strong>
										<Text>{plan.blurb}</Text>
										<Button>Choose {plan.name}</Button>
									</Stack>
								</Card>
							))}
						</Grid>
					</Stack>

					<Stack>
						<Heading level={2}>Loved by builders</Heading>
						<Row>
							<Avatar name="Ada Lovelace" />
							<Text>“We replaced a framework with 200 lines of uele and signals.” — Ada, CTO</Text>
						</Row>
					</Stack>

					<Stack>
						<Heading level={2}>FAQ</Heading>
						<Accordion items={[
							{ value: 'q1', title: 'Which signal library should I use?', content: 'Any of the eleven presets — the page code never changes.' },
							{ value: 'q2', title: 'Is there a virtual DOM?', content: 'No. Updates write straight to the marked DOM region.' },
							{ value: 'q3', title: 'Can I use my own styles?', content: 'Yes — primitives are headless and themed via CSS variables.' }
						]} />
					</Stack>

					<Separator />
					<Text as="span">© 2026 Nimbus — built with uele.</Text>
				</Stack>
			</Container>
		</div>
	);
};

export const mountWebsite = (target = document.body) => {
	const app = WebsitePage();
	target.append(app);
	return app;
};
