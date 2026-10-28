/** @jsxImportSource uele */
/**
 * Type level contract of the authoring layer, `uele/flow` and `uele/router`.
 * Compiled by `npm run test:types`.
 */
import type { Child } from 'uele';
import { signal, computed, effect, batch, untracked, read, write, isCell, canEffect, canCompute, active } from 'uele/reactive';
import { Suspense, Await, ErrorBoundary, Portal, Title } from 'uele/flow';
import { createRouter, useRouter, Link, Router, navigate } from 'uele/router';
import type { RouteContext, RouterApp, LinkProps } from 'uele/router';

// ------------------------------------------------------------- uele/reactive
const count = signal(0);
const doubled = computed(() => read(count) * 2);
const off: (() => void) | void = effect(() => read(count));
const batched: void | unknown = batch(() => write(count, read(count) + 1));
const peeked: unknown = untracked(() => read(count));
const cell: boolean = isCell(count);
const has: boolean = canEffect() && canCompute();
const hooks = active();

const value: unknown = read(count);
write(count, 1);
write(doubled, 'written through the same api');

// ----------------------------------------------------------------- uele/flow
const loader: Child = <Await for={Promise.resolve('x')} fallback={'…'}>{(v: string) => v}</Await>;
const suspense: Child = (
	<Suspense fallback={'…'} catch={(e: Error) => e.message}>
		{async () => 'loaded'}
	</Suspense>
);
const guarded: Child = (
	<ErrorBoundary fallback={(e: Error) => e.message} onError={(e: Error) => console.error(e)}>
		{() => 'fine'}
	</ErrorBoundary>
);
const moved: Node = Portal({ mount: document.body, children: 'toast' });
const titled: Node = Title({ children: 'uele' });

// ---------------------------------------------------------------- uele/router
const app: RouterApp = createRouter();
app.get('/', () => 'home');
app.get('/user/:id', ({ params, query, path, url, request }: RouteContext) => `${params.id}${path}${url}${request}${query}`);

const { view, props: linkProps, navigate: go } = useRouter(app, '…', <h1>404</h1>);
const spread: LinkProps = linkProps;
const done: Promise<void> = go('/user/1');
const link: Node = Link({ to: '/about', children: 'About' });
const shell: Node = Router({ app, initial: '…', notFound: <h1>404</h1> });
navigate('/about');

// the view is a cell, so it renders anywhere a value is expected
const routed: Child = view;

// keep the compiler honest about unused values
export { doubled, off, batched, peeked, cell, has, hooks, value, loader, suspense, guarded, moved, titled, spread, done, link, shell, routed };
