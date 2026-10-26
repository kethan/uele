# uele website

Documentation site and live-code playground for the [uele](../README.md)
reactive frontend library — a ReactJS.org-style docs experience with editable,
in-browser examples.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm install` also runs the bundle step, so the site works immediately with no
other setup.

## What's inside

```
website/
├── index.html
├── public/
│   ├── uele.js            # esbuild bundle of ../src (the real library, inlined usub)
│   ├── jsx-runtime.js     # automatic JSX runtime wrapper for direct ESM use
│   └── vendor/            # generated — playground modules (gitignored)
│       ├── reactive.js          # uele/reactive
│       ├── hooks.js             # uele/hooks
│       ├── adapter-preact.js    # uele/adapters/preact
│       ├── adapter-ulive.js     # uele/adapters/ulive
│       ├── diff-rebuild.js      # uele/diffs/rebuild (zero-dependency differ)
│       ├── diff-udomdiff.js     # uele/diffs/udomdiff
│       ├── signals-core.js      # @preact/signals-core, bundled whole
│       ├── ulive.js             # ulive, bundled whole
│       └── udomdiff.js          # udomdiff, bundled whole
├── scripts/
│   ├── bundle.mjs                    # builds public/uele.js + public/vendor/*
│   ├── check-examples.mjs            # bundles and runs every live example under linkedom
│   ├── check-playground-pipeline.mjs # validates Babel output + the iframe import map
│   ├── check-signals.mjs             # behavioral assertions for presets, hooks, diffs
│   └── smoke-site.mjs                # markdown/nav rendering smoke test
└── src/
    ├── main.js             # app shell: hash router, header, sidebar, pages
    ├── styles.css
    ├── lib/
    │   ├── dom.js              # tiny hyperscript helper for the site chrome
    │   ├── markdown.js         # markdown → DOM, `jsx live` fences become playgrounds
    │   ├── highlight.js        # dependency-free syntax highlighter
    │   ├── vendor-manifest.js  # specifier → vendor file map shared by iframe + tests
    │   └── playground.js       # Babel transform + sandboxed iframe runner + console
    └── content/
        ├── nav.js
        ├── home.js
        ├── examples.js     # examples gallery (core, signals, hooks and diffs)
        └── pages/          # one markdown module per docs page, incl. signals.js
                             # and diffing.js
```

## How the live playground works

1. Code in the editor is compiled in the browser with
   [`@babel/standalone`](https://babeljs.io/docs/babel-standalone) using the
   React **automatic** JSX runtime with `importSource: "uele"`.
2. `scripts/bundle.mjs` builds the playground module set:
   - `uele.js` — the local library (`../src/index.js`) with `usub` inlined;
     the iframe appends a small JSX-runtime footer so the same data URL
     satisfies both `"uele"` and `"uele/jsx-runtime"`.
   - `vendor/*.js` — uele subpaths (`reactive`, `hooks`, adapters, diffs)
     built with their bare imports **externalized**, alongside the npm
     signal/diff packages (`@preact/signals-core`, `ulive`, `udomdiff`)
     bundled whole.
3. Each file is fetched once and inlined as a base64 **data-URL module**. The
   sandboxed `<iframe>` (`allow-scripts` only, opaque origin) gets an import
   map resolving every bare specifier to those data URLs — including the
   bare imports *inside* the vendor bundles — so adapters, `uele/reactive`
   and the renderer share one uele `api` instance. Examples need **no network
   and no CDN**.
4. Every run uses a fresh `srcdoc` (full DOM and subscription cleanup), and
   `console.*` calls plus runtime errors are forwarded with `postMessage`
   into the console panel.
5. Babel itself is a lazy-loaded chunk, so documentation pages stay tiny.

Examples run on two reactivity modes: core-only `useLive` (zero
dependencies) and real signal presets — `usePreactSignals()` with
`@preact/signals-core` and `useUlive()` with `ulive` — plus the portable
`uele/reactive` / `uele/hooks` subpaths and the `uele/diffs/*` engines.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Bundle uele and start the Vite dev server |
| `npm run build` | Production build into `dist-site/` |
| `npm run preview` | Serve the production build |
| `npm run bundle` | Rebuild `public/uele.js` and `public/vendor/*` from `../src` + npm packages |
| `npm test` | All four validation suites |
| `npm run check-examples` | Bundle and execute all 60+ live examples under linkedom |
| `npm run check-pipeline` | Verify Babel output and the iframe import-map coverage |
| `npm run check-signals` | Behavioral assertions for presets, reactive/hooks cells and diff engines |
| `npm run smoke` | Render every docs page through the markdown pipeline |

## Writing docs

Docs pages are markdown modules in `src/content/pages/`, registered in
`src/content/nav.js`. A fenced block tagged `jsx live` mounts an editable
playground; add `tall` for a taller editor:

````md
```jsx live
import { h, useLive } from "uele";

const [count, setCount] = useLive(0);
document.body.append(<button onClick={() => setCount((c) => c + 1)}>{count}</button>);
```
````

Every `jsx live` fence is automatically covered by `npm test`.
