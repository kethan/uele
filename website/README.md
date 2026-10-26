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
│   ├── uele.js          # esbuild bundle of ../src (the real library, inlined usub)
│   └── jsx-runtime.js   # automatic JSX runtime wrapper for direct ESM use
├── scripts/
│   ├── bundle.mjs                    # builds public/uele.js from the library source
│   ├── check-examples.mjs            # runs every live example under linkedom
│   ├── check-playground-pipeline.mjs # replicates the iframe data-URL pipeline
│   └── smoke-site.mjs                # markdown/nav rendering smoke test
└── src/
    ├── main.js             # app shell: hash router, header, sidebar, pages
    ├── styles.css
    ├── lib/
    │   ├── dom.js          # tiny hyperscript helper for the site chrome
    │   ├── markdown.js     # markdown → DOM, `jsx live` fences become playgrounds
    │   ├── highlight.js    # dependency-free syntax highlighter
    │   └── playground.js   # Babel transform + sandboxed iframe runner + console
    └── content/
        ├── nav.js
        ├── home.js
        ├── examples.js     # examples gallery
        └── pages/          # one markdown module per docs page
```

## How the live playground works

1. Code in the editor is compiled in the browser with
   [`@babel/standalone`](https://babeljs.io/docs/babel-standalone) using the
   React **automatic** JSX runtime with `importSource: "uele"`.
2. The local library (`../src/index.js`, with its `usub` dependency inlined)
   is fetched once and turned into a base64 **data-URL module** that also
   exports the `jsx`/`jsxs`/`Fragment` runtime bindings.
3. The compiled code runs in a sandboxed `<iframe>` (`allow-scripts` only,
   opaque origin) whose import map resolves both `"uele"` and
   `"uele/jsx-runtime"` to that data URL — so examples need **no network and
   no CDN**.
4. Every run uses a fresh `srcdoc` (full DOM and subscription cleanup), and
   `console.*` calls plus runtime errors are forwarded with `postMessage`
   into the console panel.
5. Babel itself is a lazy-loaded chunk, so documentation pages stay tiny.

All examples use only the core library and the built-in `useLive` primitive,
which means they run against the single bundled module with no external
signals.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Bundle uele and start the Vite dev server |
| `npm run build` | Production build into `dist-site/` |
| `npm run preview` | Serve the production build |
| `npm run bundle` | Rebuild `public/uele.js` from `../src` |
| `npm test` | All three validation suites |
| `npm run check-examples` | Execute all 50 live examples under linkedom |
| `npm run check-pipeline` | Verify the data-URL iframe pipeline end to end |
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
