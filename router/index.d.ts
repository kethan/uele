import type { Cell } from '../reactive/index.js';
type Renderable = unknown;

export interface RouteContext {
	params: Record<string, string>;
	query: Record<string, string | string[]>;
	path: string;
	url: URL;
	request: Request;
}
export interface RouterApp {
	routes: unknown[];
	get(path: string, handler: (context: RouteContext) => Renderable | Promise<Renderable>): RouterApp;
	fetch(request: Request): Renderable | Promise<Renderable>;
}
export declare function createRouter(): RouterApp;
export interface LinkProps { onclick: (event: Event) => void }
export interface RouterState {
	view: Cell<Renderable>;
	props: LinkProps;
	/** Resolve this router's view; module-level navigate() also updates browser history. */
	navigate(path: string): Promise<void>;
	/** Terminal, idempotent. Router components call this automatically on teardown. */
	dispose(): void;
}
export declare function useRouter(app: Pick<RouterApp, 'fetch'>, initial?: Renderable, notFound?: Renderable | null): RouterState;
export declare function navigate(path: string): void;
export declare const Link: (props?: { to?: string; children?: Renderable } & Record<string, unknown>) => Node;
export declare const Router: (props?: { app: Pick<RouterApp, 'fetch'>; initial?: Renderable; notFound?: Renderable | null } & Record<string, unknown>) => Node;
