/** @jsxImportSource uele */
/**
 * login — a complete login page on the unified authoring layer.
 *
 * Nothing in this file knows which signal library is installed: cells come
 * from `uele/reactive`, state helpers from `uele/hooks`, markup from
 * `uele/ui`. Install ANY preset before mounting and it runs unchanged
 * (`test/pages.test.jsx` drives it on eight of them):
 *
 *     import { preactSignals } from 'uele/signals/preact';
 *     preactSignals();
 *     import { mountLogin } from './login.jsx';
 *     mountLogin(document.body);
 *
 * Demo credentials (shown on the page): demo@uele.dev / password123
 */
import { signal, read, write } from 'uele/reactive';
import {
	Center, Card, Stack, Heading, Text, Form, Field, Input, PasswordInput,
	Checkbox, Button, Alert, Link
} from 'uele/ui';

export const LoginPage = () => {
	const email = signal('');
	const password = signal('');
	const remember = signal(true);
	const status = signal('idle'); // idle | error | success
	const message = signal('');

	const submit = () => {
		const e = String(read(email)).trim();
		const p = String(read(password));
		if (!/^\S+@\S+\.\S+$/.test(e)) (write(status, 'error'), write(message, 'Enter a valid email address'));
		else if (p.length < 8) (write(status, 'error'), write(message, 'Password must be at least 8 characters'));
		else if (e === 'demo@uele.dev' && p === 'password123') (write(status, 'success'), write(message, `Welcome back${read(remember) ? ' (remembered)' : ''}`));
		else (write(status, 'error'), write(message, 'Invalid credentials — try the demo account below'));
	};

	return (
		<Center style={{ minHeight: '100dvh', background: 'var(--uele-bg, #fff)' }}>
			<Card style={{ width: 'min(24rem, calc(100% - 2rem))' }}>
				<Stack>
					<Heading level={1}>Welcome back</Heading>
					<Text>Sign in to your account to continue.</Text>
					{() => read(status) === 'error' ? <Alert tone="danger">{message}</Alert> : null}
					{() => read(status) === 'success' ? <Alert tone="success">{message}</Alert> : null}
					<Form onSubmit={submit}>
						<Stack>
							<Field label="Email">
								<Input model={email} type="email" placeholder="you@example.com" aria-label="Email" />
							</Field>
							<Field label="Password">
								<PasswordInput model={password} showStrength aria-label="Password" />
							</Field>
							<label>
								<Checkbox model={remember} /> Remember me
							</label>
							<Button type="submit">Sign in</Button>
						</Stack>
					</Form>
					<Text as="span">
						Demo account: demo@uele.dev / password123 · <Link href="#forgot">Forgot password?</Link>
					</Text>
					<Button variant="outline" onclick={submit}>Continue with GitHub</Button>
				</Stack>
			</Card>
		</Center>
	);
};

export const mountLogin = (target = document.body) => {
	const app = LoginPage();
	target.append(app);
	return app;
};
