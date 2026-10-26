// Live JSX playground: Babel transforms the editor code with uele's automatic
// JSX runtime, then it runs inside a sandboxed iframe. The iframe has an opaque
// origin, so the whole runtime travels inside the srcdoc as a data-URL import
// map instead of a network fetch — no CORS, no server requirements. Console
// output and errors are forwarded to the parent and rendered in a console panel.

import { h } from "./dom.js";

// Mirror of public/jsx-runtime.js: Babel's automatic runtime imports
// { jsx, jsxs, Fragment } from "uele/jsx-runtime". Appended to the inlined
// uele bundle so a single data-URL module satisfies both import specifiers.
const RUNTIME_FOOTER = `
const jsx = (tag, props = {}) => {
  const { children, key, ...attrs } = props || {};
  return h(tag, attrs, ...(children == null ? [] : Array.isArray(children) ? children : [children]));
};
export { jsx, jsx as jsxs, jsx as jsxDev, jsx as jsxDEV, h as Fragment, h as createElement };
`;

const toBase64 = (source) => {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

// fetch the locally bundled uele once, then expose it as a self-contained
// data: URL module containing the JSX runtime exports as well
let runtimeUrlPromise;
const loadRuntimeUrl = () =>
  (runtimeUrlPromise ||= fetch("/uele.js")
    .then((r) => {
      if (!r.ok) throw new Error(`could not load /uele.js (${r.status})`);
      return r.text();
    })
    .then((bundle) => "data:text/javascript;base64," + toBase64(bundle + RUNTIME_FOOTER)));

// Babel standalone is large (~3 MB), so it is only fetched the first time a
// playground actually compiles — doc pages themselves stay light.
let babelPromise;
const loadBabel = () =>
  (babelPromise ||= import("@babel/standalone").then((m) => m.default || m));

export async function transformJSX(code) {
  const Babel = await loadBabel();
  return Babel.transform(code, {
    presets: [["react", { runtime: "automatic", importSource: "uele" }]],
    filename: "playground.jsx",
    babelrc: false,
    configFile: false,
    sourceType: "module",
  }).code;
}

const IFRAME_STYLE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Arial, sans-serif;
    color: #1b1c22;
    padding: 16px;
    font-size: 15px;
    line-height: 1.55;
  }
  button {
    font: inherit;
    cursor: pointer;
    border: 1px solid #d8dae5;
    background: #fff;
    border-radius: 8px;
    padding: 7px 14px;
    transition: all .12s ease;
  }
  button:hover { border-color: #635bff; color: #4a42e0; }
  button.primary, button[type="submit"] {
    background: #635bff; border-color: #635bff; color: #fff;
  }
  input, select, textarea {
    font: inherit;
    border: 1px solid #d8dae5;
    border-radius: 8px;
    padding: 8px 11px;
    outline: none;
  }
  input:focus, select:focus, textarea:focus { border-color: #635bff; box-shadow: 0 0 0 3px rgba(99,91,255,.15); }
  label { display: inline-flex; align-items: center; gap: 7px; }
  ul { padding-left: 20px; }
  a { color: #635bff; }
`;

const CONSOLE_HOOK = `
<script>
(function () {
  var fmt = function (v) {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "function") return "ƒ " + (v.name || "anonymous") + "()";
    if (typeof v === "string") return v;
    if (v instanceof Node) return "<" + v.nodeName.toLowerCase() + ">";
    if (typeof v === "object") {
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    return String(v);
  };
  var send = function (level, args) {
    parent.postMessage(
      { __uele_playground: true, level: level, text: args.map(fmt).join(" ") },
      "*"
    );
  };
  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var orig = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      send(level === "debug" ? "log" : level, Array.prototype.slice.call(arguments));
      orig.apply(null, arguments);
    };
  });
  window.addEventListener("error", function (e) {
    send("error", [e.message + (e.filename ? " (" + e.lineno + ":" + e.colno + ")" : "")]);
  });
  window.addEventListener("unhandledrejection", function (e) {
    send("error", ["Unhandled promise rejection: " + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
  });
})();
<\/script>`;

async function buildSrcdoc(transformed) {
  const runtimeUrl = await loadRuntimeUrl();
  const importMap = JSON.stringify({
    imports: {
      uele: runtimeUrl,
      "uele/jsx-runtime": runtimeUrl,
    },
  });
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="importmap">${importMap}<\/script>
    <style>${IFRAME_STYLE}</style>
    ${CONSOLE_HOOK}
  </head>
  <body>
    <script type="module">
${transformed}
    <\/script>
  </body>
</html>`;
}

const lineCount = (code) => code.split("\n").length;

// every live playground registers a disposer so route changes can tear down
// iframe message listeners, pending debounces and the iframe itself
const instances = new Set();

export function destroyAllPlaygrounds() {
  for (const dispose of instances) dispose();
  instances.clear();
}

export function createPlayground({ code, title = "Live example", tall = false } = {}) {
  const initialCode = code;
  let timer = 0;
  let logs = [];
  let disposed = false;

  /* -- editor ------------------------------------------------------- */
  const gutter = h("div", { class: "gutter", "aria-hidden": "true" });
  const editor = h("textarea", {
    class: "editor-input",
    spellcheck: "false",
    autocapitalize: "off",
    autocomplete: "off",
    "aria-label": `${title} code editor`,
  });
  editor.value = code;

  const syncGutter = () => {
    const n = lineCount(editor.value);
    gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    gutter.scrollTop = editor.scrollTop;
    gutter.scrollLeft = editor.scrollLeft;
  };
  syncGutter();

  editor.addEventListener("scroll", syncGutter);
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value } = editor;
      editor.value = value.slice(0, s) + "  " + value.slice(en);
      editor.selectionStart = editor.selectionEnd = s + 2;
      scheduleRun();
    }
  });

  /* -- preview + console -------------------------------------------- */
  const frame = h("iframe", {
    title: `${title} preview`,
    sandbox: "allow-scripts allow-modals",
    loading: "lazy",
  });

  const consoleEl = h("div", { class: "console" });
  const renderConsole = () => {
    consoleEl.textContent = "";
    if (!logs.length) {
      consoleEl.append(h("div", { class: "console-empty" }, "console output appears here"));
      return;
    }
    for (const entry of logs) {
      const line = h("div", { class: `console-line ${entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : ""}` });
      line.append(h("span", { class: "level" }, entry.level), document.createTextNode(entry.text));
      consoleEl.append(line);
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };
  renderConsole();

  const onMessage = (e) => {
    if (e.source !== frame.contentWindow || !e.data || !e.data.__uele_playground) return;
    logs.push({ level: e.data.level, text: e.data.text });
    if (logs.length > 60) logs.shift();
    renderConsole();
  };
  window.addEventListener("message", onMessage);

  const clearConsole = () => {
    logs = [];
    renderConsole();
  };

  const consoleHead = h(
    "div",
    { class: "console-head" },
    "console",
    h("span", { class: "spacer" }),
    h("button", { type: "button", onclick: clearConsole }, "clear")
  );

  const preview = h(
    "div",
    { class: "preview-pane" },
    h(
      "div",
      { class: "preview-chrome" },
      h("span", { class: "dot r" }),
      h("span", { class: "dot y" }),
      h("span", { class: "dot g" }),
      h("span", { class: "url" }, "uele playground")
    ),
    h("div", { class: "preview-frame-wrap" }, frame),
    consoleHead,
    consoleEl
  );

  /* -- run pipeline -------------------------------------------------- */
  const statusDot = h("span", { class: "live-dot" });
  let runSeq = 0;

  const run = async () => {
    if (disposed) return;
    const seq = ++runSeq;
    clearTimeout(timer);
    const source = editor.value;
    let srcdoc;
    try {
      statusDot.style.background = "var(--amber)";
      statusDot.title = "compiling…";
      const transformed = await transformJSX(source);
      if (disposed || seq !== runSeq) return; // a newer run superseded this one
      srcdoc = await buildSrcdoc(transformed);
      if (disposed || seq !== runSeq) return;
    } catch (err) {
      if (disposed || seq !== runSeq) return;
      statusDot.style.background = "var(--red)";
      statusDot.title = "error";
      logs = [{ level: "error", text: `${err.name === "SyntaxError" ? "Compile" : "Runtime setup"} error: ${err.message}` }];
      renderConsole();
      return;
    }
    statusDot.style.background = "var(--green)";
    statusDot.title = "compiled";
    logs = [];
    renderConsole();
    // a fresh srcdoc gives every run a clean DOM and no leaked subscriptions
    frame.srcdoc = srcdoc;
  };

  const scheduleRun = () => {
    syncGutter();
    clearTimeout(timer);
    timer = setTimeout(run, 450);
  };
  editor.addEventListener("input", scheduleRun);

  const reset = () => {
    editor.value = initialCode;
    syncGutter();
    run();
  };

  const head = h(
    "div",
    { class: "playground-head" },
    statusDot,
    document.createTextNode(title),
    h("span", { class: "spacer" }),
    h("button", { class: "btn ghost", type: "button", onclick: reset, title: "Restore the original example" }, "Reset"),
    h("button", { class: "btn primary", type: "button", onclick: run }, "Run")
  );

  const root = h(
    "section",
    { class: `playground${tall ? " tall" : ""}` },
    head,
    h(
      "div",
      { class: "playground-body" },
      h("div", { class: "editor-pane" }, gutter, editor),
      preview
    )
  );

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    window.removeEventListener("message", onMessage);
    frame.srcdoc = "";
    instances.delete(dispose);
  };
  instances.add(dispose);

  // run once mounted
  queueMicrotask(() => {
    if (!disposed) run();
  });

  return { root, run, reset, editor, dispose };
}
