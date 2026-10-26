/**
 * DOM-level smoke test for the docs chrome without a browser: renders every
 * markdown page through the real renderMarkdown() pipeline under linkedom and
 * checks nav integrity, headings, code fences and playground instantiation.
 */
import { parseHTML } from "linkedom";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dom = parseHTML("<!doctype html><html><body><div id='app'></div></body></html>");
for (const key of ["window", "document", "Node", "Event", "CustomElementRegistry"]) {
  if (dom[key] !== undefined) globalThis[key] = dom[key];
}
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.queueMicrotask = queueMicrotask;

const { NAV } = await import(resolve(here, "..", "src", "content", "nav.js"));
const { PAGES } = await import(resolve(here, "..", "src", "content", "pages", "index.js"));
const { EXAMPLES } = await import(resolve(here, "..", "src", "content", "examples.js"));
const { renderMarkdown } = await import(resolve(here, "..", "src", "lib", "markdown.js"));

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
};

// 1. every nav slug (except the special examples page) resolves to a page
for (const group of NAV) {
  for (const item of group.items) {
    if (item.slug === "examples") continue;
    check(!!PAGES[item.slug], `nav slug "${item.slug}" has a page`);
  }
}

// 2. every page renders and contains the expected building blocks
let totalPlaygrounds = 0;
let totalFences = 0;
for (const [slug, page] of Object.entries(PAGES)) {
  const host = dom.document.createElement("div");
  let threw = null;
  try {
    host.append(renderMarkdown(page.markdown));
  } catch (err) {
    threw = err;
  }
  check(!threw, `page "${slug}" renders without errors${threw ? ": " + threw.message : ""}`);
  if (threw) continue;

  const liveFences = (page.markdown.match(/```jsx live/g) || []).length;
  totalFences += liveFences;
  const playgrounds = host.querySelectorAll(".playground").length;
  totalPlaygrounds += playgrounds;
  check(playgrounds === liveFences, `page "${slug}" mounted ${liveFences} playground(s)`);
  check(host.querySelectorAll("h2, h3").length > 0, `page "${slug}" has section headings`);
  // a stray "undefined" outside code would mean a missing interpolation
  const stray = [...host.querySelectorAll("*")]
    .filter((el) => !el.closest("code, pre, .code-block") && !["TEXTAREA", "INPUT"].includes(el.tagName))
    .some((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes("undefined")));
  check(!stray, `page "${slug}" has no stray "undefined" text outside code`);
}

check(totalPlaygrounds === totalFences, `all ${totalFences} live fences became playgrounds`);

// 3. static code blocks highlight
const staticHost = dom.document.createElement("div");
staticHost.append(
  renderMarkdown("```js\nconst x = 1;\n```")
);
check(staticHost.querySelector(".code-block pre")?.innerHTML.includes("tok-num"), "syntax highlighting works");

// 4. callouts and tables
const rich = dom.document.createElement("div");
rich.append(
  renderMarkdown(
    "> **Tip:** remember this.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n"
  )
);
check(!!rich.querySelector(".callout.tip"), "callout renders with tip variant");
check(!!rich.querySelector("table"), "markdown table renders");

// 5. gallery examples have unique ids and non-empty code
const ids = new Set(EXAMPLES.map((e) => e.id));
check(ids.size === EXAMPLES.length, "gallery example ids are unique");
check(EXAMPLES.every((e) => e.code.includes("uele") && e.title && e.description), "gallery examples are complete");

// 6. API page tables and installation page render
const apiHost = dom.document.createElement("div");
apiHost.append(renderMarkdown(PAGES.api.markdown));
check(apiHost.querySelectorAll("table").length >= 3, "api reference renders its tables");
check(!!apiHost.querySelector("h1, h2, h3"), "api reference has headings");

const installHost = dom.document.createElement("div");
installHost.append(renderMarkdown(PAGES.installation.markdown));
check(installHost.querySelectorAll(".code-block").length >= 3, "installation page has static code blocks");
check(!installHost.querySelector(".playground"), "installation page has no playgrounds");

// 7. the docs site is itself a uele app: bundle src/app.jsx exactly like Vite
//    would (bare uele* specifiers -> repository source, CSS stubbed) and boot
//    it under a fresh linkedom, then exercise routing and the filter region.
{
  const repo = resolve(here, "..", "..");
  const ALIAS = {
    uele: resolve(repo, "src", "index.js"),
    "uele/jsx-runtime": resolve(repo, "jsx-runtime", "index.ts"),
    "uele/jsx-dev-runtime": resolve(repo, "jsx-runtime", "index.ts"),
    "uele/reactive": resolve(repo, "reactive", "index.js"),
    "uele/hooks": resolve(repo, "hooks", "index.js"),
    "uele/ui": resolve(repo, "ui", "index.js"),
    "uele/themes": resolve(repo, "themes", "index.js"),
    "uele/adapters/preact": resolve(repo, "adapters", "preact.js"),
  };
  const bundled = await build({
    stdin: {
      contents: `import "./src/styles.css"; import "./src/app.jsx";`,
      loader: "jsx",
      resolveDir: resolve(here, ".."),
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    jsx: "automatic",
    jsxImportSource: "uele",
    plugins: [
      {
        name: "smoke-alias-and-css",
        setup(b) {
          b.onResolve({ filter: /^uele(?:\/[\w-]+)*$/ }, (a) =>
            ALIAS[a.path] ? { path: ALIAS[a.path] } : undefined
          );
          b.onResolve({ filter: /\.css$/ }, (a) => ({ path: a.path, namespace: "css" }));
          b.onLoad({ filter: /.*/, namespace: "css" }, () => ({ contents: "", loader: "js" }));
        },
      },
    ],
  });
  const url =
    "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text, "utf8").toString("base64");

  const appDom = parseHTML("<!doctype html><html><body><div id='app'></div></body></html>");
  const location = { hash: "" };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const saved = {};
  for (const k of ["window", "document", "Node", "Event", "location"])
    saved[k] = globalThis[k];
  Object.assign(globalThis, {
    window: appDom.window,
    document: appDom.document,
    Node: appDom.Node,
    Event: appDom.Event,
    CustomEvent: appDom.CustomEvent || appDom.Event,
    alert: () => {},
    location,
  });
  appDom.window.location = location;
  appDom.window.scrollTo = () => {};
  // linkedom has no history; uele/router pushes state on in-app navigation
  appDom.window.history = {
    state: null,
    pushState: () => {},
    replaceState: () => {},
    go: () => {},
    back: () => {},
    forward: () => {},
  };

  let bootError = null;
  try {
    await import(url);
    await sleep(120); // preact effect-driven regions flush on a microtask
  } catch (err) {
    bootError = err;
  }
  const q = (s) => appDom.document.querySelector(s);
  const qa = (s) => [...appDom.document.querySelectorAll(s)];
  check(!bootError, `app.jsx boots without errors${bootError ? ": " + bootError.message : ""}`);
  check(!!q(".site-header") && !!q(".sidebar"), "app shell renders header and sidebar");
  check(q("#content")?.textContent.includes("Build user interfaces"), "home route renders the hero");
  check(qa(".nav-item").some((a) => a.textContent.includes("129 components")), "sidebar links the UI Kit page");
  check(!appDom.document.body.innerHTML.includes("[object"), "app never stringifies a node array");

  appDom.window.location.hash = "#/ui-kit";
  appDom.window.dispatchEvent(new appDom.Event("hashchange"));
  await sleep(120);
  check(q("#content")?.textContent.includes("Complete component index"), "hash route opens the UI Kit page");
  check(qa(".playground").length === 14, "UI Kit page mounts all 14 playgrounds");
  check(q("#content")?.textContent.includes("CommandPalette"), "UI Kit catalog lists every export");

  appDom.window.location.hash = "#/nope";
  appDom.window.dispatchEvent(new appDom.Event("hashchange"));
  await sleep(60);
  check(q("#content")?.textContent.includes("Page not found"), "unknown route renders the not-found view");

  const filter = q(".nav-filter");
  filter.value = "state";
  filter.dispatchEvent(new appDom.Event("input", { bubbles: true }));
  await sleep(60);
  const visible = qa(".nav-item").filter(
    (a) => a.closest(".nav-group")?.style.display !== "none"
  );
  check(visible.length === 1 && visible[0].textContent.includes("State"), "sidebar filter narrows the nav reactively");

  Object.assign(globalThis, saved);
}

console.log(`\n${failures ? "FAILED" : "OK"} — ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
