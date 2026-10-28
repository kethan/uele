export const title = "Events & Attributes";

export const markdown = `
uele follows familiar DOM conventions: props named \`on*\` become handlers,
\`className\` becomes \`class\`, and everything else is written as a property
or attribute.

## Event handlers

Any \`onClick\`, \`onInput\`, \`onSubmit\`, … is attached to the element.
Native handlers are assigned as properties, so assigning a falsy value
unregisters them; unknown events are bound with \`addEventListener\`, which
means **custom events work automatically**.

\`\`\`jsx
import { h, useLive } from "uele";

const [status, setStatus] = useLive("nothing yet");

const App = () => (
  <main>
    <button onClick={() => setStatus("clicked")}>Click</button>
    <button
      onMouseEnter={() => setStatus("hovered")}
      onMouseLeave={() => setStatus("left")}
    >
      Hover me
    </button>
    <p>Last event: <strong>{status}</strong></p>
  </main>
);

document.body.append(<App />);
\`\`\`

## Forms

\`onSubmit\` receives the native event, so \`preventDefault()\` works exactly
as it does in plain DOM code.

\`\`\`jsx
import { h, useLive } from "uele";

const [submitted, setSubmitted] = useLive("—");
let draft = "";

document.body.append(
  <main>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(draft || "—");
      }}
    >
      <input
        placeholder="Type a message"
        onInput={(e) => (draft = e.target.value)}
      />
      <button type="submit">Send</button>
    </form>
    <p>Last message: <strong>{submitted}</strong></p>
  </main>
);
\`\`\`

## Checkboxes, selects and inputs

Property-backed attributes like \`checked\`, \`value\` and \`selected\` are
written as properties. With a signal preset installed (see **Signals &
Presets**) they accept reactive cells directly; with core \`useLive\`, hold
the displayed text in a region seeded with its initial value and write the
new value to the setter:

\`\`\`jsx
import { h, useLive } from "uele";

const [picked, setPicked] = useLive("vanilla");
// booleans render as empty comment nodes, so display the state as text
const [agreed, setAgreed] = useLive("no");

document.body.append(
  <main>
    <label>
      <input
        type="checkbox"
        onChange={(e) => setAgreed(e.target.checked ? "yes" : "no")}
      />
      I agree
    </label>
    <p>Agreed: <strong>{agreed}</strong></p>

    <label>
      Flavor:{" "}
      <select onChange={(e) => setPicked(e.target.value)}>
        <option value="vanilla">Vanilla</option>
        <option value="chocolate">Chocolate</option>
        <option value="strawberry">Strawberry</option>
      </select>
    </label>
    <p>You picked <strong>{picked}</strong></p>
  </main>
);
\`\`\`

## Style objects

\`style\` takes a string or an object. Object keys may be camelCase,
kebab-case or custom properties, and \`null\` / \`undefined\` clears a value.
With a signal preset, a style value can be a cell and uele rewrites just that
one CSS property on every change — the element is never rebuilt:

\`\`\`jsx
import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const size = signal(16);

document.body.append(
  <main>
    <div>
      <label>
        Font size: {size}px{" "}
      <input
        type="range" min="12" max="40"
        value={size}
        onInput={(e) => (size.value = Number(e.target.value))}
      />
    </label>
    <p style={{ fontSize: size, fontWeight: 700, color: "#635bff" }}>
      Resize me with the slider
    </p>
    </div>
  </main>
);
\`\`\`

## Custom attributes and the props registry

Unknown attributes fall through to \`setAttribute\`, including
\`data-*\`, \`aria-*\` and web-component attributes. For bespoke element
behaviour, the \`props\` registry lets you teach uele a new prop:

\`\`\`jsx
import { h, props } from "uele";

// teach uele an "autofocus" prop (kept here as a demo of the registry)
props.set("autofocus-demo", (el) => el.focus());

document.body.append(
  <main>
    <input autofocus-demo placeholder="Focused via a custom prop" />
    <p>Custom props receive (element, value, name, attrs).</p>
  </main>
);
\`\`\`

## Events on components

Components are functions, so they don't carry DOM events themselves — pass
**handler props** and let the component wire them to real elements:

\`\`\`jsx
import { h, useLive } from "uele";

const BigButton = ({ label, onActivate }) => (
  <button
    className="primary"
    style={{ padding: "12px 22px", fontSize: "16px" }}
    onClick={onActivate}
  >
    {label}
  </button>
);

const [clicks, setClicks] = useLive(0);

document.body.append(
  <main>
    <BigButton label="Activate me" onActivate={() => setClicks((n) => n + 1)} />
    <p>Activated {clicks} times</p>
  </main>
);
\`\`\`
`;
