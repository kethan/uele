import "./styles.css";
import { h, mount } from "./lib/dom.js";
import { NAV, ALL_PAGES, nextPrev } from "./content/nav.js";
import { PAGES } from "./content/pages/index.js";
import { EXAMPLES } from "./content/examples.js";
import { HERO_CODE, FEATURES, TEASER } from "./content/home.js";
import { renderMarkdown } from "./lib/markdown.js";
import { createPlayground, destroyAllPlaygrounds } from "./lib/playground.js";
import { highlight } from "./lib/highlight.js";

const REPO_URL = "https://github.com/kethan/uele";
const app = document.getElementById("app");

/* --------------------------------------------------------------- header */
function buildHeader() {
  const links = [
    { href: "#/introduction", label: "Docs" },
    { href: "#/examples", label: "Examples" },
    { href: "#/api", label: "API" },
  ];
  return h(
    "header",
    { class: "site-header" },
    h(
      "button",
      {
        class: "menu-btn",
        "aria-label": "Toggle navigation",
        onclick: () => document.body.classList.toggle("nav-open"),
      },
      "☰"
    ),
    h("a", { class: "brand", href: "#/" }, h("span", { class: "logo" }, "u"), "uele", h("small", null, "docs")),
    h(
      "nav",
      { class: "header-links" },
      ...links.map((l) => h("a", { href: l.href, dataset: { href: l.href.slice(2) } }, l.label)),
      h("a", { class: "always", href: REPO_URL, target: "_blank", rel: "noopener" }, "GitHub ↗")
    )
  );
}

/* --------------------------------------------------------------- sidebar */
function buildSidebar(active) {
  const filter = h("input", {
    class: "nav-filter",
    type: "search",
    placeholder: "Filter docs…",
    "aria-label": "Filter documentation pages",
  });

  const groups = NAV.map((group) => {
    const items = group.items.map((item) =>
      h(
        "a",
        {
          class: `nav-item${item.slug === active ? " active" : ""}`,
          href: `#/${item.slug}`,
          dataset: { title: item.title.toLowerCase() },
        },
        item.title
      )
    );
    return h("div", { class: "nav-group", dataset: { group: "true" } }, h("h4", null, group.group), ...items);
  });

  const empty = h("div", { class: "nav-empty", style: "display:none" }, "No pages match");

  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    let anyVisible = false;
    for (const group of groups) {
      let visibleInGroup = 0;
      for (const item of group.querySelectorAll(".nav-item")) {
        const show = !q || item.dataset.title.includes(q);
        item.classList.toggle("hidden", !show);
        if (show) visibleInGroup++;
      }
      group.style.display = visibleInGroup ? "" : "none";
      anyVisible = anyVisible || visibleInGroup > 0;
    }
    empty.style.display = anyVisible ? "none" : "block";
  });

  return h("aside", { class: "sidebar" }, filter, ...groups, empty);
}

/* --------------------------------------------------------------- home */
function buildHome() {
  const heroPlayground = createPlayground({ code: HERO_CODE, title: "Playground — edit me" });

  const teaserBlock = h(
    "div",
    { class: "code-block" },
    h(
      "div",
      { class: "code-bar" },
      h("span", { class: "dot" }),
      h("span", { class: "lang" }, "JSX")
    ),
    h("pre", { html: highlight(TEASER, "jsx") })
  );

  return h(
    "div",
    { class: "doc-page" },
    h(
      "section",
      { class: "hero" },
      h("span", { class: "badge" }, "⚡ A tiny reactive frontend library"),
      h("h1", null, "Build user interfaces with ", h("span", { class: "grad" }, "plain functions"), " and JSX"),
      h(
        "p",
        { class: "tagline" },
        "uele turns real DOM nodes, promises and signals into live components — no virtual DOM, no compiler, a few kilobytes of runtime."
      ),
      h(
        "div",
        { class: "hero-cta" },
        h("a", { class: "btn primary btn-lg", href: "#/introduction" }, "Get started"),
        h("a", { class: "btn btn-lg", href: "#/examples" }, "Try live examples")
      )
    ),
    heroPlayground.root,
    h(
      "section",
      { class: "home-section" },
      h("h2", null, "Why uele?"),
      h("p", { class: "sub" }, "Small enough to read, complete enough to ship."),
      h(
        "div",
        { class: "feature-grid" },
        ...FEATURES.map((f) =>
          h(
            "div",
            { class: "feature-card" },
            h("div", { class: "icon" }, f.icon),
            h("h3", null, f.title),
            h("p", null, f.text)
          )
        )
      )
    ),
    h(
      "section",
      { class: "home-section" },
      h("h2", null, "From zero to an app"),
      h("p", { class: "sub" }, "Elements, state and keyed lists in a handful of lines."),
      teaserBlock
    )
  );
}

/* --------------------------------------------------------------- docs */
function buildDocPage(slug) {
  const page = PAGES[slug];
  const frag = document.createDocumentFragment();
  frag.append(h("h1", null, page.title));
  frag.append(renderMarkdown(page.markdown));

  const { prev, next } = nextPrev(slug);
  const pager = h(
    "div",
    { class: "pager" },
    prev
      ? h("a", { href: `#/${prev.slug}`, class: "prev" }, h("span", { class: "dir" }, "← Previous"), h("span", { class: "title" }, prev.title))
      : h("span"),
    next
      ? h("a", { href: `#/${next.slug}`, class: "next" }, h("span", { class: "dir" }, "Next →"), h("span", { class: "title" }, next.title))
      : h("span")
  );
  frag.append(pager);
  return h("article", { class: "doc-page" }, frag);
}

/* --------------------------------------------------------------- gallery */
function buildExamplesPage() {
  const cards = EXAMPLES.map((ex) => {
    const pg = createPlayground({ code: ex.code, title: "Live preview", tall: ex.tall });
    const toggle = h("button", { class: "btn toggle-code", type: "button" }, "View code");
    const card = h(
      "article",
      { class: "gallery-card", id: `example-${ex.id}` },
      h("div", { class: "gallery-body" }, h("h3", null, ex.title), h("p", null, ex.description), toggle),
      pg.root
    );
    toggle.addEventListener("click", () => {
      const open = card.classList.toggle("expanded");
      toggle.textContent = open ? "Hide code" : "View code";
      if (open) setTimeout(() => pg.editor.scrollIntoView({ block: "nearest" }), 50);
    });
    return card;
  });

  return h(
    "article",
    { class: "doc-page wide" },
    h("h1", null, "Examples Gallery"),
    h(
      "p",
      { class: "lead" },
      "Ten complete mini-apps, each running the real uele bundle in a sandboxed iframe. Every preview is editable — press View code, change it, and hit Run."
    ),
    h("div", { class: "gallery" }, ...cards)
  );
}

function buildNotFound(slug) {
  return h(
    "article",
    { class: "doc-page" },
    h("h1", null, "Page not found"),
    h("p", null, `There is no page for “${slug}”.`),
    h("a", { class: "btn primary", href: "#/" }, "Back to home")
  );
}

/* --------------------------------------------------------------- shell */
function buildFooter() {
  return h(
    "footer",
    { class: "footer" },
    "uele documentation · playgrounds run a locally bundled copy of the library · ",
    h("a", { href: REPO_URL, target: "_blank", rel: "noopener" }, "github.com/kethan/uele")
  );
}

function render() {
  destroyAllPlaygrounds();
  const slug = location.hash.replace(/^#\/?/, "").split("/")[0] || "";
  document.body.classList.remove("nav-open");

  let content;
  let wide = false;
  if (slug === "") content = buildHome();
  else if (slug === "examples") {
    content = buildExamplesPage();
    wide = true;
  } else if (PAGES[slug]) {
    content = buildDocPage(slug);
    wide = ALL_PAGES.find((p) => p.slug === slug)?.wide || false;
  } else content = buildNotFound(slug);

  const backdrop = h("div", {
    class: "backdrop",
    onclick: () => document.body.classList.remove("nav-open"),
  });

  mount(
    app,
    buildHeader(),
    backdrop,
    h(
      "div",
      { class: "layout" },
      buildSidebar(slug),
      h("main", { class: `content${wide ? " wide" : ""}`, id: "content" }, content)
    ),
    buildFooter()
  );

  // active state in the top nav
  document.querySelectorAll(".header-links a[data-href]").forEach((a) => {
    a.classList.toggle("active", a.dataset.href === slug);
  });

  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
render();
