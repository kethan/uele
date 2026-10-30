/**
 * Minimal static file server for the Playwright harness (`test/browser/`).
 * Serves the repository root so the harness can load the *built* core from
 * /dist, the source-ESM subpaths (/ui, /flow, …) and /node_modules exactly
 * the way a consumer's bundler would resolve them. No caching, no build.
 *
 *   node scripts/static-server.mjs        # PORT env or 4173
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 4173);

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.cjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
	try {
		const { pathname } = new URL(req.url, 'http://localhost');
        // The default preview is the no-preset State todo. Never expose repository
        // metadata or dotfiles when this development-only server is shared.
        if (pathname === '/') {
            res.writeHead(302, { location: '/examples/state/index.html' }); res.end(); return;
        }
        const decoded = decodeURIComponent(pathname);
        if (decoded.split(/[\\/]/).some(part => part.startsWith('.') && part !== '.' && part !== '..'))
            throw new Error('private path');
		const path = normalize(join(root, decoded));
		if (!path.startsWith(root)) throw new Error('outside root');
		const body = await readFile(path);
		res.writeHead(200, {
			'content-type': MIME[extname(path)] || 'application/octet-stream',
			'cache-control': 'no-store',
		});
		res.end(req.method === 'HEAD' ? undefined : body);
	} catch {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('not found');
	}
});

server.listen(port, '0.0.0.0', () => {
	console.log(`uele static server on http://0.0.0.0:${port}`);
});
