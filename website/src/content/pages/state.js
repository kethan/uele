export const title = "State with useLive";

export const markdown = `
\`useLive\` is the built-in reactivity primitive. It pairs a **live region**
(the DOM nodes currently rendered) with a **setter** that swaps the region's
contents — no external signal library required.

## The shape of useLive

\`\`\`js
const [region, setRegion] = useLive(initialValue);
\`\`\`

- \`region\` is an array of marker nodes that you drop into JSX like any child.
- \`setRegion(next)\` replaces the rendered value. Pass a function to receive
  the previous value: \`setRegion((prev) => prev + 1)\`.
- Values can be primitives, nodes, arrays, promises or thunks — the same rules
  as any child.

> **Warning:** a setter only swaps content while its marker nodes are attached
> to the document. Calling \`setRegion(...)\` **before** the region is mounted
> is a no-op, so the first render must be passed as the \`useLive\` initial
> value — build it, then update from event handlers that run after mount:
>
> \`\`\`js
> const build = () => <section>{/* current state */}</section>;
> const [region, setRegion] = useLive(build());   // present on first paint
> // later, from a handler: setRegion(build());
> \`\`\`

## A counter

\`\`\`jsx live
import { h, useLive } from "uele";

const [count, setCount] = useLive(0);

document.body.append(
  <main>
    <h2>{count}</h2>
    <button onClick={() => setCount((c) => c - 1)}>−</button>
    <button className="primary" onClick={() => setCount((c) => c + 1)}>
      +
    </button>
    <button onClick={() => setCount(0)}>Reset</button>
  </main>
);
\`\`\`

Only the text between the region markers changes. The heading and buttons are
created once and never touched again.

## Controlled text

Bind an input's \`onInput\` to a setter and the region re-renders on every
keystroke:

\`\`\`jsx live
import { h, useLive } from "uele";

const [name, setName] = useLive("stranger");

document.body.append(
  <main>
    <input
      placeholder="Type your name"
      onInput={(e) => setName(e.target.value || "stranger")}
    />
    <p>Hello, <strong>{name}</strong>!</p>
  </main>
);
\`\`\`

## Re-rendering a subtree

A region can hold elements too. Keep the source of truth in plain variables,
then rebuild the subtree through the setter whenever something changes. This
is the pattern for class toggles, styles and any value used as a **prop**:

\`\`\`jsx live
import { h, useLive } from "uele";

let liked = false;

const build = () => (
  <article
    style={{
      padding: "18px",
      borderRadius: "12px",
      border: "1px solid #d8dae5",
      background: liked ? "#fff4ed" : "#ffffff",
    }}
  >
    <h3 style={{ marginTop: 0 }}>Like this post</h3>
    <p>{liked ? "You liked this ❤️" : "Not liked yet"}</p>
    <button
      className="primary"
      onClick={() => {
        liked = !liked;
        setCard(build());
      }}
    >
      {liked ? "Unlike" : "Like"}
    </button>
  </article>
);
// first render is the region's initial value — present immediately on mount
const [card, setCard] = useLive(build());

document.body.append(<main>{card}</main>);
\`\`\`

## A live clock

Setters work from anywhere — timers, fetches, sockets. Here an interval
drives a region once per second:

\`\`\`jsx live
import { h, useLive } from "uele";

const [time, setTime] = useLive(new Date().toLocaleTimeString());
setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums" }}>{time}</h2>
    <p>The interval only touches the live region.</p>
  </main>
);
\`\`\`

## Multiple regions, one component

Every \`useLive\` call is independent. Build as many regions as the UI needs —
each setter only touches its own markers:

\`\`\`jsx live
import { h, useLive } from "uele";

const [a, setA] = useLive(0);
const [b, setB] = useLive(10);

document.body.append(
  <main>
    <p>
      <button onClick={() => setA((v) => v + 1)}>a++</button> region a = {a}
    </p>
    <p>
      <button onClick={() => setB((v) => v - 1)}>b−−</button> region b = {b}
    </p>
    <p>Updating one region never re-renders the other.</p>
  </main>
);
\`\`\`

> **Note:** uele also supports external signal libraries (ulive, Solid, Preact
> signals, Vue, MobX…) through the \`api\` object and the adapters in
> \`uele/adapters/*\`. With a preset installed, cells render directly as
> children and \`useLive\` is one option among many rather than the only one.
`;
