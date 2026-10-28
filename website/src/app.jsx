// The docs site is itself a uele app: JSX compiles to uele's automatic
// runtime, state lives in signal cells, and every element is a real DOM
// node created by the same h() the playground examples teach. It even runs
// the preact-signals preset — the same adapter the UI Kit examples install.
import "./styles.css";
import "./lib/uele-setup.js";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, read, write } from "uele/reactive";
import { NAV, ALL_PAGES, nextPrev } from "./content/nav.js";
import { PAGES } from "./content/pages/index.js";
import { EXAMPLES } from "./content/examples.js";
import { HERO_CODE, FEATURES, TEASER } from "./content/home.js";
import { EXAMPLE_SIZES, formatSize } from "./example-sizes.js";
import { renderMarkdown } from "./lib/markdown.js";
import { createPlayground, destroyAllPlaygrounds } from "./lib/playground.js";
import { highlight } from "./lib/highlight.js";

usePreactSignals();

const REPO_URL = "https://github.com/kethan/uele";
const currentSlug = () => location.hash.replace(/^#\/?/, "").split("/")[0] || "";

/* --------------------------------------------------------------- header */
const Header = ({ active, theme, toggleTheme }) => {
  const links = [
    { href: "#/introduction", slug: "introduction", label: "Docs" },
    { href: "#/examples", slug: "examples", label: "Examples" },
    { href: "#/api", slug: "api", label: "API" },
  ];
  return (
    <header class="site-header">
      <button
        class="menu-btn"
        aria-label="Toggle navigation"
        onClick={() => document.body.classList.toggle("nav-open")}
      >
        ☰
      </button>
      <a class="brand" href="#/">
        <span class="logo">u</span>
        uele
        <small>docs</small>
      </a>
      <nav class="header-links">
        {links.map((l) => (
          <a
            href={l.href}
            data-href={l.slug}
            class={() => (active() === l.slug ? "active" : undefined)}
          >
            {l.label}
          </a>
        ))}
        <a class="always" href={REPO_URL} target="_blank" rel="noopener">
          GitHub ↗
        </a>
        <button
          class="btn ghost"
          type="button"
          onClick={toggleTheme}
          title="Toggle dark theme"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </nav>
    </header>
  );
};

/* --------------------------------------------------------------- sidebar */
const Sidebar = ({ active }) => {
  // The filter is a genuine signal region: typing rebuilds the nav groups
  // reactively, with no manual class toggling.
  const filter = signal("");
  const buildGroups = (q) =>
    NAV.map((group) => {
      const items = group.items.filter(
        (item) => !q || item.title.toLowerCase().includes(q)
      );
      if (!items.length) return null;
      return (
        <div class="nav-group" data-group="true">
          <h4>{group.group}</h4>
          {items.map((item) => (
            <a
              class={() =>
                active() === item.slug ? "nav-item active" : "nav-item"
              }
              href={`#/${item.slug}`}
              data-title={item.title.toLowerCase()}
            >
              {item.title}
            </a>
          ))}
        </div>
      );
    });

  return (
    <aside class="sidebar">
      <input
        class="nav-filter"
        type="search"
        placeholder="Filter docs…"
        aria-label="Filter documentation pages"
        onInput={(e) =>
          write(filter, e.target.value.trim().toLowerCase())
        }
      />
      {() => buildGroups(read(filter))}
    </aside>
  );
};

/* --------------------------------------------------------------- home */
const HomePage = () => {
  // createPlayground returns real DOM (editor + sandboxed iframe); a node is
  // a valid JSX child in uele, so the imperative widget slots straight in.
  const heroPlayground = createPlayground({
    code: HERO_CODE,
    title: "Playground — edit me",
    sizeLabel: formatSize(EXAMPLE_SIZES.hero),
  });

  const teaserBlock = (
    <div class="code-block">
      <div class="code-bar">
        <span class="dot" />
        <span class="lang">JSX</span>
      </div>
      <pre html={highlight(TEASER, "jsx")} />
    </div>
  );

  return (
    <div class="doc-page">
      <section class="hero">
        <span class="badge">⚡ A tiny reactive frontend library</span>
        <h1>
          Build user interfaces with <span class="grad">plain functions</span>{" "}
          and JSX
        </h1>
        <p class="tagline">
          uele turns real DOM nodes, promises and signals into live components
          — no virtual DOM, no compiler, a few kilobytes of runtime.
        </p>
        <div class="hero-cta">
          <a class="btn primary btn-lg" href="#/introduction">
            Get started
          </a>
          <a class="btn btn-lg" href="#/examples">
            Try live examples
          </a>
        </div>
      </section>
      {heroPlayground.root}
      <section class="home-section">
        <h2>Why uele?</h2>
        <p class="sub">Small enough to read, complete enough to ship.</p>
        <div class="feature-grid">
          {FEATURES.map((f) => (
            <div class="feature-card">
              <div class="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section class="home-section">
        <h2>From zero to an app</h2>
        <p class="sub">
          Elements, state and keyed lists in a handful of lines.
        </p>
        {teaserBlock}
      </section>
    </div>
  );
};

/* --------------------------------------------------------------- docs */
const DocPage = ({ slug }) => {
  const page = PAGES[slug];
  const { prev, next } = nextPrev(slug);
  return (
    <article class="doc-page">
      <h1>{page.title}</h1>
      {renderMarkdown(page.markdown, slug)}
      <div class="pager">
        {prev ? (
          <a href={`#/${prev.slug}`} class="prev">
            <span class="dir">← Previous</span>
            <span class="title">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={`#/${next.slug}`} class="next">
            <span class="dir">Next →</span>
            <span class="title">{next.title}</span>
          </a>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
};

/* --------------------------------------------------------------- gallery */
const ExamplesPage = () => (
  <article class="doc-page wide">
    <h1>Examples Gallery</h1>
    <p class="lead">
      {EXAMPLES.length} complete mini-apps, each running the real uele bundle
      in a sandboxed iframe. Every preview is editable — press View code,
      change it, and hit Run.
    </p>
    <div class="gallery">
      {EXAMPLES.map((ex) => {
        const pg = createPlayground({
          code: ex.code,
          title: "Live preview",
          tall: ex.tall,
          sizeLabel: formatSize(EXAMPLE_SIZES[ex.id]),
        });
        const toggle = (
          <button class="btn toggle-code" type="button">
            View code
          </button>
        );
        const card = (
          <article class="gallery-card" id={`example-${ex.id}`}>
            <div class="gallery-body">
              <h3>{ex.title}</h3>
              <p>{ex.description}</p>
              {toggle}
            </div>
            {pg.root}
          </article>
        );
        toggle.addEventListener("click", () => {
          const open = card.classList.toggle("expanded");
          toggle.textContent = open ? "Hide code" : "View code";
          if (open)
            setTimeout(() => pg.editor.scrollIntoView({ block: "nearest" }), 50);
        });
        return card;
      })}
    </div>
  </article>
);

const NotFound = ({ slug }) => (
  <article class="doc-page">
    <h1>Page not found</h1>
    <p>{`There is no page for “${slug}”.`}</p>
    <a class="btn primary" href="#/">
      Back to home
    </a>
  </article>
);

/* --------------------------------------------------------------- shell */
const Footer = () => (
  <footer class="footer">
    uele documentation · playgrounds run a locally bundled copy of the library
    ·{" "}
    <a href={REPO_URL} target="_blank" rel="noopener">
      github.com/kethan/uele
    </a>
  </footer>
);

const viewFor = (slug) => {
  if (slug === "") return { slug, wide: false, el: <HomePage /> };
  if (slug === "examples")
    return { slug, wide: true, el: <ExamplesPage /> };
  if (PAGES[slug]) {
    const wide = ALL_PAGES.find((p) => p.slug === slug)?.wide || false;
    return { slug, wide, el: <DocPage slug={slug} /> };
  }
  return { slug, wide: false, el: <NotFound slug={slug} /> };
};

let writeTheme = () => {};

const App = () => {
  // Route state is a pair of signals seeded with the first view; the
  // hashchange handler swaps them, and thunk regions re-render on write.
  const slug = signal(currentSlug());
  const route = signal(viewFor(read(slug)));

  // Theme: persists in localStorage, reflected as data-theme on <html>.
  let storedTheme = "light";
  try {
    storedTheme = localStorage.getItem("uele-theme") || "light";
  } catch {
    /* storage unavailable (linkedom / private mode) */
  }
  const theme = signal(storedTheme);
  writeTheme = (t) => {
    write(theme, t);
    try {
      localStorage.setItem("uele-theme", t);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.setAttribute("data-theme", t);
  };
  document.documentElement.setAttribute("data-theme", read(theme));

  window.addEventListener("hashchange", () => {
    destroyAllPlaygrounds();
    document.body.classList.remove("nav-open");
    write(slug, currentSlug());
    write(route, viewFor(read(slug)));
    window.scrollTo(0, 0);
  });

  return (
    <div class="app-root">
      <Header
        active={() => read(slug)}
        theme={read(theme)}
        toggleTheme={() => writeTheme(read(theme) === "dark" ? "light" : "dark")}
      />
      <div
        class="backdrop"
        onClick={() => document.body.classList.remove("nav-open")}
      />
      <div class="layout">
        <Sidebar active={() => read(slug)} />
        <main
          id="content"
          class={() => (read(route).wide ? "content wide" : "content")}
        >
          {() => read(route).el}
        </main>
      </div>
      <Footer />
    </div>
  );
};

document.getElementById("app").replaceChildren(<App />);
