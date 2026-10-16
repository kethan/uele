/** @jsxImportSource uele */
/**
 * shop — a mini store app: a product grid, a live cart count, and a cart
 * drawer (Sheet) with quantity steppers and a computed total. Checkout is
 * fake but final. Unified layer only; `test/pages.test.jsx` buys things
 * with it on eight presets.
 */
import { signal, computed, read, write } from 'uele/reactive';
import {
	Container, Stack, Row, Grid, Card, Heading, Text, Button, Badge, Drawer
} from 'uele/ui';

const PRODUCTS = [
	{ id: 1, name: 'Mechanical keyboard', price: 89 },
	{ id: 2, name: 'Wireless mouse', price: 49 },
	{ id: 3, name: 'USB-C hub', price: 39 },
	{ id: 4, name: 'Desk lamp', price: 59 }
];
const money = (n) => `$${n.toFixed(2)}`;

export const ShopPage = () => {
	const cart = signal([]); // [{id, qty}]
	const cartOpen = signal(false);
	const placed = signal(false);
	const count = computed(() => read(cart).reduce((sum, item) => sum + item.qty, 0));
	const total = computed(() => read(cart).reduce((sum, item) => sum + item.qty * (PRODUCTS.find((p) => p.id === item.id)?.price || 0), 0));

	const add = (product) => {
		const items = read(cart);
		const found = items.find((i) => i.id === product.id);
		write(cart, found ? items.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)) : [...items, { id: product.id, qty: 1 }]);
		write(placed, false);
	};
	const setQty = (id, qty) => write(cart, read(cart).map((i) => (i.id === id ? { ...i, qty } : i)).filter((i) => i.qty > 0));
	const checkout = () => (write(cart, []), write(cartOpen, false), write(placed, true));

	return (
		<Container>
			<Stack>
				<Row>
					<Heading level={1}>Store</Heading>
					<Button onclick={() => write(cartOpen, true)}>
						Cart <Badge tone="info">{count}</Badge>
					</Button>
				</Row>
				{() => read(placed) ? <span role="status">Order placed — thank you!</span> : null}
				<Grid columns={2}>
					{PRODUCTS.map((product) => (
						<Card>
							<Stack>
								<Heading level={2}>{product.name}</Heading>
								<Text>{money(product.price)}</Text>
								<Button onclick={() => add(product)}>Add {product.name} to cart</Button>
							</Stack>
						</Card>
					))}
				</Grid>
				<Drawer model={cartOpen} side="right" title="Your cart">
					<Stack>
						{() => {
							const items = read(cart);
							if (!items.length) return <Text>Your cart is empty.</Text>;
							return items.map((item) => {
								const product = PRODUCTS.find((p) => p.id === item.id);
								return (
									<Row>
										<span>{product.name}</span>
										<Button aria-label={`Decrease ${product.name}`} onclick={() => setQty(item.id, item.qty - 1)}>−</Button>
										<span aria-label={`Quantity of ${product.name}`}>{item.qty}</span>
										<Button aria-label={`Increase ${product.name}`} onclick={() => setQty(item.id, item.qty + 1)}>+</Button>
										<span>{money(product.price * item.qty)}</span>
									</Row>
								);
							});
						}}
						<strong>Total: {() => money(read(total))}</strong>
						<Button variant="solid" onclick={checkout}>Checkout</Button>
					</Stack>
				</Drawer>
			</Stack>
		</Container>
	);
};

export const mountShop = (target = document.body) => {
	const app = ShopPage();
	target.append(app);
	return app;
};
