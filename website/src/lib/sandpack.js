// Sandpack runner for the docs playgrounds. The self-hosted bundler lives in
// public/sandpack (see scripts/vendor-sandpack.mjs) and every module an
// example can import is injected as a virtual /node_modules file, so the
// runner needs no registry or CDN access at runtime.
//
// The editor's Babel pipeline (playground.js -> transformJSX) stays the
// compiler: examples are JSX with importSource "uele", which the bundler's
// generic babel worker knows nothing about. We hand Sandpack plain compiled
// ESM and let its webpack packager resolve the virtual packages.

import { VENDOR_MODULES, CORE_SPECS } from "./vendor-manifest.js";

// Mirror of the RUNTIME_FOOTER in playground.js: the compiled automatic
// runtime imports { jsx, jsxs, Fragment } from "uele/jsx-runtime", and the
// public/uele.js bundle only exports the core API, so append these shims to
// the virtual uele package (both playground entry points stay in one module).
const RUNTIME_FOOTER = `
const jsx = (tag, props = {}) => {
  const { children, key, ...attrs } = props || {};
  return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};
export { jsx, jsx as jsxs, jsx as jsxDev, jsx as jsxDEV, h as Fragment, h as createElement };
`;

let clientPromise;
const loadSandpack = () =>
  (clientPromise ||= import("@codesandbox/sandpack-client").then((m) => m.loadSandpackClient));

// specifier -> virtual file path inside the Sandpack BrowserFS
const virtualPath = (spec) => {
  if (spec === "uele") return "/node_modules/uele/index.js";
  if (spec.startsWith("uele/")) return `/node_modules/uele/${spec.slice(5)}.js`;
  if (spec.startsWith("@")) {
    const [scope, name] = spec.split("/");
    return `/node_modules/${scope}/${name}/index.js`;
  }
  return `/node_modules/${spec}/index.js`;
};

const packageRoots = ["uele", "ulive", "udomdiff", "@preact/signals-core"];
const packageJsonFile = (spec) => {
  const name = spec.startsWith("@") ? spec : spec;
  return {
    path: `/node_modules/${name}/package.json`,
    code: JSON.stringify({ name, version: "0.0.0", main: "index.js" }),
  };
};

// Fetch the same vendored bundles the srcdoc playground uses, once.
let sourcesPromise;
const loadSources = async () =>
  (sourcesPromise ||= (async () => {
    const out = {};
    for (const [spec, path] of Object.entries(VENDOR_MODULES)) {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`could not load ${path} (${res.status})`);
      out[spec] = await res.text();
    }
    return out;
  })());

// bundlerURL points at the bundler's index.html page (not the directory:
// /sandpack/ would be intercepted by the site's SPA fallback and serve the
// docs app instead of the Sandpack bundler page).
const bundlerURL = () => new URL("sandpack/index.html", document.baseURI).href;

/**
 * Mount a Sandpack runner onto an existing iframe.
 *
 *   const runner = await createSandpackRunner({
 *     frame, getCode: () => editor.value,
 *     onStatus: (s) => ...,        // "loading" | "compiling" | "ok" | "error"
 *     onLog: ({ level, text }) => ...,
 *   });
 *   runner.run();                  // first run boots the bundler
 *   runner.run();                  // later runs hot-update the sandbox
 *   runner.dispose();
 */
export async function createSandpackRunner({ frame, getCode, onStatus, onLog }) {
  const [loadSandpackClient, sources] = await Promise.all([
    loadSandpack(),
    loadSources(),
  ]);

  const buildFiles = (compiled) => {
    const files = {
      "/package.json": {
        code: JSON.stringify({ name: "uele-playground", version: "0.0.0" }),
        hidden: true,
      },
      "/index.js": { code: compiled },
    };
    for (const [spec, code] of Object.entries(sources)) {
      files[virtualPath(spec)] = {
        code: CORE_SPECS.has(spec) ? code + RUNTIME_FOOTER : code,
        hidden: true,
      };
    }
    for (const spec of packageRoots) {
      const { path, code } = packageJsonFile(spec);
      files[path] = { code, hidden: true };
    }
    return files;
  };

  const setup = (compiled) => ({
    files: buildFiles(compiled),
    entry: "/index.js",
    template: "vanilla",
    dependencies: {},
    devDependencies: {},
  });

  let client = null;
  let disposed = false;
  let runSeq = 0;

  const listener = (msg) => {
    if (msg.type === "status") {
      const s = msg.status;
      if (s === "idle" || s === "done") onStatus("ok");
      else if (s === "initializing" || s === "installing-dependencies") onStatus("loading");
      else onStatus("compiling");
    } else if (msg.type === "done") {
      onStatus(msg.compilatonError ? "error" : "ok");
    } else if (msg.type === "success") {
      onStatus("ok");
    } else if (msg.type === "action" && msg.action === "show-error") {
      onStatus("error");
      onLog({ level: "error", text: `${msg.title || "Compile error"}: ${msg.message}` });
    } else if (msg.type === "console") {
      for (const entry of msg.log || []) {
        const level = entry.method === "error" || entry.method === "warn" ? entry.method : "log";
        onLog({ level, text: (entry.data || []).join(" ") });
      }
    }
  };

  const run = async (compile) => {
    if (disposed) return;
    const seq = ++runSeq;
    let compiled;
    try {
      onStatus(client ? "compiling" : "loading");
      compiled = await compile();
    } catch (err) {
      onStatus("error");
      onLog({
        level: "error",
        text: `${err.name === "SyntaxError" ? "Compile" : "Runtime setup"} error: ${err.message}`,
      });
      return;
    }
    if (disposed || seq !== runSeq) return;

    if (!client) {
      client = await loadSandpackClient(frame, setup(compiled), {
        bundlerURL: bundlerURL(),
        showErrorScreen: true,
        showLoadingScreen: false,
        showOpenInCodeSandbox: false,
        clearConsoleOnFirstCompile: true,
      });
      client.listen(listener);
    } else {
      client.updateSandbox(setup(compiled));
    }
  };

  const dispose = () => {
    disposed = true;
    if (client) {
      client.destroy();
      client = null;
    }
  };

  return { run, dispose };
}
