export const title = "Elements & JSX";

export const markdown = `
uele elements are thin wrappers over the real DOM. This page covers what you
can put inside them: plain values, nodes, arrays and reactive values.

## What counts as a child?

uele's \`add()\` step flattens arrays, turns primitive values into text nodes,
appends DOM nodes as-is, and turns reactive values into live regions. All of
these are valid children at once:

\`\`\`jsx live
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

When an attribute must change over time, keep the flag in a variable and
rebuild the element through a live region (regions are DOM nodes, so they are
used as children — see **State with useLive**):

\`\`\`jsx live
import { h, useLive } from "uele";

let disabled = false;
const [view, setView] = useLive("");

const render = () =>
  setView(
    <button disabled={disabled}>
      {disabled ? "Disabled" : "Enabled"} button
    </button>
  );
render();

document.body.append(
  <main>
    {view}
    <button
      className="primary"
      onClick={() => {
        disabled = !disabled;
        render();
      }}
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

\`\`\`jsx live
import { h, useLive } from "uele";

let featured = false;
const [card, setCard] = useLive("");

const render = () =>
  setCard(
    <section
      className={{ card: true, featured }}
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: featured ? "#eeedff" : "#f5f5f8",
        border: "1px solid #d8dae5",
        transition: "background 200ms ease",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Class + style maps</h3>
      <p>The \`featured\` class is {featured ? "on" : "off"}.</p>
      <button
        onClick={() => {
          featured = !featured;
          render();
        }}
      >
        Toggle featured
      </button>
    </section>
  );

render();
// a useLive region is an array of marker nodes — drop it into JSX so it is
// flattened, rather than handing the raw array to a native DOM append()
document.body.append(<main>{card}</main>);
\`\`\`

> **Tip:** class objects and style objects also accept reactive cells from a
> signal preset (ulive, Solid, Preact signals…). With core-only \`useLive\`,
> rebuild the element as above — regions are children, not values.

## SVG and MathML

Namespaced elements are detected automatically, so inline SVG and MathML
just work with no extra configuration:

\`\`\`jsx live
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

\`\`\`jsx live
import { h } from "uele";

document.body.append(
  <main>
    <input ref={(el) => el.focus()} placeholder="Focused on mount" />
    <p>The ref callback runs after the element is attached.</p>
  </main>
);
\`\`\`
`;
