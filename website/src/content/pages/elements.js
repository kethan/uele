export const title = "Elements & JSX";

export const markdown = `
uele elements are thin wrappers over the real DOM. This page covers what you
can put inside them: plain values, nodes, arrays and reactive values.

## What counts as a child?

uele's \`add()\` step flattens arrays, turns primitive values into text nodes,
appends DOM nodes as-is, and turns reactive values into live regions. All of
these are valid children at once:

\`\`\`jsx
import { h } from "uele";

const items = ["alpha", "beta", "gamma"];
const node = h("em", null, "a real node");

document.body.append(
  <main>
    <p>String {42} and {true && "conditional text"}</p>
    <p>{node}</p>
    <ul>{items.map((word) => <li key={word}>{word}</li>)}</ul>
    <p>{null} — null, undefined and false render nothing.</p>
  </main>
);
\`\`\`

## Attributes and properties

uele writes to an element **property** when one exists (\`value\`,
\`checked\`, \`id\`, \`textContent\`, …) and falls back to an attribute
otherwise. The falsy rules are predictable:

- \`null\`, \`undefined\` and \`false\` **remove** the attribute
- \`true\` sets it to an empty string
- numbers are stringified

When an attribute must change over time, hand it a reactive cell from a
signal preset — uele flips the property in place, no rebuild (see **Signals &
Presets**):

\`\`\`jsx
import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const disabled = signal(false);

document.body.append(
  <main>
    <button disabled={disabled}>
      {() => (disabled.value ? "Disabled" : "Enabled")} button
    </button>
    <button
      className="primary"
      onClick={() => (disabled.value = !disabled.value)}
    >
      Toggle disabled
    </button>
  </main>
);
\`\`\`

## Class and style

\`className\` maps to the \`class\` attribute. A class object toggles
individual class names, and styles accept a plain object with camelCase,
kebab-case or CSS custom-property keys.

\`\`\`jsx
import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const featured = signal(false);

document.body.append(
  <main>
    <section
      className={{ card: true, featured }}
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: () => (featured.value ? "#eeedff" : "#f5f5f8"),
        border: "1px solid #d8dae5",
        transition: "background 200ms ease",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Class + style maps</h3>
      <p>
        The \`featured\` class is {() => (featured.value ? "on" : "off")}.
      </p>
      <button onClick={() => (featured.value = !featured.value)}>
        Toggle featured
      </button>
    </section>
  </main>
);
\`\`\`

> **Tip:** class objects and style objects accept reactive cells (or thunks)
> from any signal preset (ulive, Solid, Preact signals…), so a single class
> name or CSS property updates without touching the rest of the element.

## SVG and MathML

Namespaced elements are detected automatically, so inline SVG and MathML
just work with no extra configuration:

\`\`\`jsx
import { h } from "uele";

document.body.append(
  <main>
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#635bff" strokeWidth="6" />
      <circle cx="50" cy="50" r="16" fill="#00b8d4" />
    </svg>
    <p>
      Math: <math><mrow><msup><mi>x</mi><mn>2</mn></msup></mrow></math>
    </p>
  </main>
);
\`\`\`

## Refs

The \`ref\` prop receives the finished element \`(element, props)\` once it is
created — the place for focus, measurement and third-party libraries.

\`\`\`jsx
import { h } from "uele";

// a node created up front lets the ref callback report back through plain DOM
const status = <p>waiting for ref…</p>;

document.body.append(
  <main>
    <input
      ref={(el) => {
        // the finished element: focus it AND make the effect observable
        el.value = "filled by the ref";
        el.style.outline = "2px solid #635bff";
        el.focus();
        status.textContent = "ref ran: value set, outline added and focus() called";
      }}
      placeholder="Focused on mount"
    />
    {status}
  </main>
);
\`\`\`
`;
