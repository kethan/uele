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
	fetch(request: Request): Promise<Renderable>;
}
export declare function createRouter(): RouterApp;
export interface LinkProps { onclick: (event: Event) => void }
export declare function useRouter(app: RouterApp, initial?: Renderable, notFound?: Renderable | null): [any, () => LinkProps, (path: string) => Promise<void>];
export declare function navigate(path: string): void;
export declare const Link: (props?: { to?: string; children?: Renderable } & Record<string, unknown>) => Node;
export declare const Router: (props?: { app: RouterApp; initial?: Renderable; notFound?: Renderable | null } & Record<string, unknown>) => Node;
