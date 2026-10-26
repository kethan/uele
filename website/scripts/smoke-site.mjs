/**
 * DOM-level smoke test for the docs chrome without a browser: renders every
 * markdown page through the real renderMarkdown() pipeline under linkedom and
 * checks nav integrity, headings, code fences and playground instantiation.
 */
import { parseHTML } from "linkedom";
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

console.log(`\n${failures ? "FAILED" : "OK"} — ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
