export const NAV = [
  {
    group: "Get Started",
    items: [
      { slug: "introduction", title: "Introduction" },
      { slug: "installation", title: "Installation" },
      { slug: "hello-world", title: "Hello World" },
    ],
  },
  {
    group: "Learn uele",
    items: [
      { slug: "elements", title: "Elements & JSX" },
      { slug: "components", title: "Components" },
      { slug: "state", title: "State with useLive" },
      { slug: "events", title: "Events & Attributes" },
      { slug: "conditional", title: "Conditional Rendering" },
      { slug: "lists", title: "Lists & Keys" },
      { slug: "async", title: "Async & Lazy" },
      { slug: "signals", title: "Signals & Presets" },
      { slug: "diffing", title: "List Diffing" },
    ],
  },
  {
    group: "Reference",
    items: [
      { slug: "examples", title: "Examples Gallery", wide: true },
      { slug: "api", title: "API Reference", wide: true },
    ],
  },
];

export const ALL_PAGES = NAV.flatMap((g) => g.items);

export const nextPrev = (slug) => {
  const i = ALL_PAGES.findIndex((p) => p.slug === slug);
  return { prev: ALL_PAGES[i - 1] || null, next: ALL_PAGES[i + 1] || null };
};
