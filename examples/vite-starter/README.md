# uele + Vite starter

A small todo app built with **full uele, JavaScript/JSX, Preact Signals and
Vite 8**. No React, React plugin, router, UStor or custom diff setup.

## Start from this checkout

Use Node **22.12+** (recommended), or Node 20.19+ supported by Vite.
Run these commands from the repository root:

```sh
npm ci
npm run build
cd examples/vite-starter
npm ci
npm run dev
```

Open the address Vite prints. The dev server binds to `0.0.0.0` and accepts
Arena's `.e2b.app` preview hosts. No localhost API requests are made by the app.

The first two commands build uele itself. This starter intentionally depends
on `uele` through **`file:../..`**, so it exercises the current checkout's API
rather than assuming an older registry release has the same exports. The
root and starter lockfiles are both committed; generated builds are not.

## Production build

From this directory:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to a static host. `vite preview` is a local
build check, not a production server. The app is entirely client-side and resets its
sample tasks on reload; it does not persist data or send it anywhere.

## Make it yours

```text
index.html         page metadata and entry point
vite.config.js     automatic JSX runtime and development/preview settings
jsconfig.json      editor JSX settings
src/main.jsx       one preset setup call, mounting, HMR cleanup
src/App.jsx        state, computed values, actions, and JSX
src/style.css      responsive styles; no CSS framework or external fonts
public/favicon.svg local favicon
```

- `preactSignals()` runs once in `main.jsx`, before rendering.
- Signals drive text, input values, checkbox state and class flags.
- Computed values derive the filters and counts; they are not duplicate state.
- `For` keys rows by stable IDs. Its explicit function form passes the key
  accessor as an ordinary option (JSX's reserved `key` metadata is not a prop).
  Each todo owns a `done` signal so retained rows update without replacing data.
- `useLive` owns the app view. Vite's HMR dispose hook unmounts it before a
  JavaScript update; remounting resets the demo state. CSS updates are live.
- JSX uses **uele's** automatic runtime. Vite 8 uses `oxc.jsx`; this is not an
  outdated `esbuild` configuration or a React compatibility shim. Its cold
  dependency scanner uses the same JSX settings via `optimizeDeps`.

Start by changing `src/App.jsx`. Add storage, routing or other integrations
only when your app needs them. See [all presets](../../docs/PRESETS.md) and
[the main guide](../../README.md).

## Copy outside the repository

Do not copy the folder unchanged and keep `file:../..`: that path must resolve
to a built uele checkout. Either point it to your local checkout, or build and
pack this uele version and install its `.tgz` into your copied starter using
`npm install /path/to/uele-0.11.1.tgz`. When a matching API release is available,
you can use its published package instead. Commit the resulting lockfile.

## Browser verification

From the repository root, after the installation/build steps above:

```sh
npm run test:starter
```

The Playwright configuration starts both the dev server and production
preview. It checks real interactions, safe text rendering, stable row nodes,
keyboard input, narrow layouts, accessibility, and development-only HMR.
On Linux, Chromium needs libnspr4/libnss3 or an appropriate
`UELE_CHROMIUM_LIBS` path; see the CI workflow. Other platforms use the same
browser selection as the main browser suite.

This is a full-renderer app with CSS and a development toolchain, **not** one
of the tiny-app size proofs. No library or app-size budget has been changed.
