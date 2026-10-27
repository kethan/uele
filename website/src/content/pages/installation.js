export const title = "Installation";

export const markdown = `
uele runs in two modes: **zero-build**, straight from a CDN with an import
map, or **with a bundler** such as Vite, esbuild or Rollup plus the automatic
JSX runtime. Both modes share the same module API.

## Option 1 — no build step

Paste this into an \`.html\` file and open it in a browser. ES modules and an
import map are all you need.

\`\`\`html
<script type="importmap">
  {
    "imports": {
      "uele": "https://esm.sh/uele@1",
      "uele/": "https://esm.sh/uele@1/"
    }
  }
</script>
<script type="module">
  import { h, useLive } from "uele";

  const [count, setCount] = useLive(0);

  document.body.append(
    h("main", [
      h("button", { onClick: () => setCount((c) => c - 1) }, "−"),
      h("strong", { style: { margin: "0 12px" } }, count),
      h("button", { onClick: () => setCount((c) => c + 1) }, "+"),
    ])
  );
</script>
\`\`\`

Without JSX there is nothing to compile — \`h()\` calls run as-is. For a
JSX-like tagged-template experience in zero-build projects, uele works
beautifully with [htm](https://github.com/developit/htm).

> **Tip:** pin the major version (\`uele@1\`) so every specifier resolves to
> the same runtime copy.

## Option 2 — npm and a bundler

Install the package from npm:

\`\`\`bash
npm install uele
# or
yarn add uele
\`\`\`

### Vite / esbuild

uele ships an automatic JSX runtime, so no \`h\` import is required in JSX
files. Configure the import source once:

\`\`\`js
// vite.config.js
export default {
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "uele",
  },
};
\`\`\`

### TypeScript

\`\`\`jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "uele"
  }
}
\`\`\`

### Rollup

Use \`@rollup/plugin-babel\` (or any Babel-based pipeline) with the React
automatic runtime pointing at uele:

\`\`\`js
babel({
  babelHelpers: "bundled",
  presets: [["@babel/preset-react", { runtime: "automatic", importSource: "uele" }]],
});
\`\`\`

## Package entry points

The package exposes several entry points for different job sizes:

| Import | What it is for |
| --- | --- |
| \`uele\` | Full core: \`h\`, \`useLive\`, control flow, \`lazy\`, \`api\`, \`props\` |
| \`uele/lite\` | Minimal core for custom reactive runtimes |
| \`uele/jsx-runtime\` | Automatic JSX runtime (used by the compiler, not by hand) |
| \`uele/ui\` | 45+ headless UI primitives |
| \`uele/hooks\` | Reactive hooks portable across every preset |
| \`uele/router\` | Client-side routing |
| \`uele/adapters/*\` | One-call presets for signal libraries |

## How this playground works

Every live example in these docs is compiled in your browser with Babel using
exactly the automatic-runtime settings above, then executed in a sandboxed
iframe whose import map resolves \`uele\` to a locally bundled copy of the
library — no network requests, no build step, nothing to install.

### Two execution engines

Each playground header has a **Built-in / Sandpack** switch:

- **Built-in (default):** a srcdoc iframe with an opaque origin and a data-URL
  import map. Completely offline, instant to boot, and the engine behind every
  executable example in this site's test suite.
- **Sandpack:** the same CodeSandbox bundler that powers sandpack.codesandbox.io,
  self-hosted under \`/sandpack/\` — no request ever leaves your origin. The
  editor code is still compiled with the Babel settings above, and every module
  (\`uele\`, its adapters and diff presets, \`ulive\`, \`udomdiff\`, Preact
  signals) is injected as a virtual \`node_modules\` package, so examples run
  with zero npm-registry access. Use it to preview how the code behaves inside
  a real webpack packager with workers, an error overlay and module boundaries.
  The choice is remembered per browser.

> Sandpack needs workers and a same-origin iframe, so its frame runs with
> broader sandbox flags than the built-in runner; switching back restores the
> opaque-origin sandbox. The 65 MB bundler is copied from
> \`@codesandbox/sandpack-client\` at install time
> (\`npm run vendor:sandpack\`) and is never committed to the repository.
`;
