/**
 * The docs must not rot: every JSX snippet in README.md, docs/PRESETS.md and
 * docs/ADAPTERS.md has to parse, and every claim about the shipped presets
 * (hook name, subpath, `.d.ts`, optional peer dependency, jsdoc description)
 * has to match the sources. `docs/PRESETS.md` is generated from those sources
 * by `scripts/gen-presets-doc.py` — this pins the other direction.
 *
 * @vitest-environment node (esbuild's binary check needs a real Uint8Array, not jsdom's)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const NAME = pkg.name;

/**
 * Parse snippets with whatever transformer the installed vite ships:
 * `transformWithOxc` on vite 6+ (vitest 3+), `transformWithEsbuild` before that.
 * Importing `esbuild` directly is not an option - it is not a dependency of this
 * package, so the suite would die on machines that only have vite. Both APIs have
 * changed shape across versions (arg order in vite 8, `jsx: { importSource }`
 * instead of `jsxImportSource` in oxc), so instead of guessing we probe each
 * candidate with a snippet that must parse and one that must not, and keep the
 * first one that gets both right.
 */
const transform = await (async () => {
	let vite;
	try {
		vite = await import('vite');
	} catch {
		return null; // vite not installed at all: skip the parse checks
	}
	const ext = (loader) => 'snippet.' + loader;
	const candidates = [];
	if (vite.transformWithOxc) {
		candidates.push((code, loader) =>
			vite.transformWithOxc(code, ext(loader), {
				lang: loader,
				jsx: { runtime: 'automatic', importSource: NAME },
			})
		);
		candidates.push((code, loader) =>
			vite.transformWithOxc(code, ext(loader), { lang: loader, jsx: 'automatic', jsxImportSource: NAME })
		);
		candidates.push((code, loader) =>
			vite.transformWithOxc(ext(loader), code, { loader, jsx: 'automatic', jsxImportSource: NAME })
		);
	}
	if (vite.transformWithEsbuild) {
		const opts = (loader) => ({ loader, jsx: 'automatic', jsxImportSource: NAME });
		candidates.push((code, loader) => vite.transformWithEsbuild(code, ext(loader), opts(loader)));
		candidates.push((code, loader) => vite.transformWithEsbuild(ext(loader), code, opts(loader)));
	}
	const ok = (fn, code, loader) =>
		fn(code, loader).then(
			() => true,
			() => false
		);
	for (const fn of candidates) {
		// must accept valid code and reject garbage, or we do not trust it
		if ((await ok(fn, 'const ok = <div id="x">hi</div>;', 'jsx')) && !(await ok(fn, 'const = ;', 'jsx')))
			return fn;
	}
	return null;
})();
const parses = (code, loader) => {
	if (!transform) return true; // no usable transform on this machine: skip
	return transform(code, loader).then(
		() => true,
		() => false
	);
};
// fileURLToPath, not `.pathname`: on windows `.pathname` keeps the leading slash
// (`/C:/Users/...`) and every read below turns into `C:\C:\Users\...`
const ROOT = fileURLToPath(new URL('../', import.meta.url));
// CRLF: a checkout with `core.autocrlf` (windows) hands back `\r\n`, and every
// line-anchored match below would silently find nothing - normalise on the way in
const read = (p) => readFileSync(ROOT + p, 'utf8').replace(/\r\n/g, '\n');

const codeBlocks = (text, lang) => {
	const out = [];
	const re = new RegExp('```' + lang + '\\r?\\n([\\s\\S]*?)```', 'g');
	let m;
	while ((m = re.exec(text))) out.push(m[1]);
	return out;
};

const slugs = (folder) =>
	readdirSync(ROOT + folder)
		.filter((f) => f.endsWith('.js') && f !== 'util.js')
		.map((f) => f.slice(0, -3))
		.sort();

const hooksOf = (folder, slug) => [...read(folder + '/' + slug + '.js').matchAll(/export const (use\w+)/g)].map((m) => m[1]);

describe('every code snippet in the docs parses', () => {
	const docs = ['README.md', 'docs/PRESETS.md', 'docs/ADAPTERS.md'].map((p) => [p, read(p)]);

	it.each(
		docs.flatMap(([file, text]) =>
			codeBlocks(text, 'jsx').map((code, i) => [file + ' jsx#' + i, code])
		)
	)('%s', async (_name, code) => {
		expect(await parses(code, 'jsx')).toBe(true);
	});

	it.each(
		docs.flatMap(([file, text]) =>
			codeBlocks(text, 'js').map((code, i) => [file + ' js#' + i, code])
		)
	)('%s', async (_name, code) => {
		// pseudo-code blocks (a bare `{ … }` config, an ellipsis, a shell line) are skipped
		const pseudo = code.includes('...') || code.trimStart().startsWith('{') || code.includes('= …');
		if (pseudo) return;
		expect(await parses(code, 'js')).toBe(true);
	});
});

describe('docs/PRESETS.md matches the shipped presets', () => {
	const presets = read('docs/PRESETS.md');

	it.each(slugs('adapters'))('documents adapters/%s with its real hook name', (slug) => {
		const hooks = hooksOf('adapters', slug);
		expect(hooks.length).toBeGreaterThan(0);
		hooks.forEach((hook) => expect(presets).toContain('%s/adapters/%s`' % 0 ? hook : hook));
		expect(presets).toContain('`%s/adapters/%s` - `%s()`'.replace('%s/adapters', NAME + '/adapters').replace('%s`', slug + '`').replace('%s()', hooks[hooks.length - 1] + '()'));
	});

	it.each(slugs('diffs'))('documents diffs/%s with its real hook name', (slug) => {
		const hook = hooksOf('diffs', slug).pop();
		expect(presets).toContain('`%s/diffs/%s` - `%s()`'
			.replace('%s/diffs', NAME + '/diffs').replace('%s`', slug + '`').replace('%s()', hook + '()'));
	});

	it('every preset has a jsdoc description (the doc is generated from it)', () => {
		[...slugs('adapters').map((s) => 'adapters/' + s + '.js'), ...slugs('diffs').map((s) => 'diffs/' + s + '.js')].forEach(
			(file) => {
				const src = read(file);
				expect(src.startsWith('/**'), file + ' starts with a jsdoc block').toBe(true);
				expect(src).toContain(' *     import { use'); // the usage example the doc renders
			}
		);
	});

	it('every preset ships types next to it', () => {
		slugs('adapters').forEach((s) => expect(existsSync(ROOT + 'adapters/' + s + '.d.ts')).toBe(true));
		slugs('diffs').forEach((s) => expect(existsSync(ROOT + 'diffs/' + s + '.d.ts')).toBe(true));
	});

	it('every signal library is an optional peer dependency, never a real one', () => {
		const deps = Object.keys(pkg.dependencies || {});
		const optional = pkg.peerDependenciesMeta || {};
		slugs('adapters').forEach((slug) => {
			const src = read('adapters/' + slug + '.js');
			const libs = [...src.matchAll(/from '([^.'][^']*)'/g)]
				.map((m) => m[1])
				.filter((name) => name !== NAME && !name.startsWith(NAME + '/'));
			// `solid-js/dist/solid.js` is the `solid-js` package; `@preact/signals-core` is scoped
			const parts = libs[0].split('/');
			const lib = libs[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
			expect(lib, slug + ' imports a library').toBeTruthy();
			expect(deps, lib + ' must not be a hard dependency').not.toContain(lib);
			expect(optional[lib]?.optional, lib + ' is an optional peer').toBe(true);
		});
	});
});

describe('the authoring guide (docs/ADAPTERS.md)', () => {
	const guide = read('docs/ADAPTERS.md');

	it('documents every hook uele and uele/reactive use', () => {
		const hooks = [...read('adapters/util.js').matchAll(/^\t(\w+): undefined/gm)].map((m) => m[1]);
		hooks.forEach((hook) => expect(guide, 'the guide mentions `' + hook + '`').toContain('`' + hook + '`'));
	});

	it('points at the helpers the presets really share', () => {
		['scoped', 'wire', 'HOOKS', 'morphAdapter'].forEach((helper) => {
			const defined =
				read('adapters/util.js').includes('export const ' + helper) ||
				read('diffs/util.js').includes('export const ' + helper);
			expect(defined, helper + ' is exported by the shared util').toBe(true);
			expect(guide).toContain(helper);
		});
	});

	it('names every pitfall the shipped presets actually work around', () => {
		expect(guide).toContain('conflicting changes'); // s-js batch
		expect(guide).toContain('does not emit'); // tanstack subscribe
		expect(guide).toContain('solid-js/dist/solid.js'); // solid client build
	});
});
