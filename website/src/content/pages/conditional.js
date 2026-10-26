export const title = "Conditional Rendering";

export const markdown = `
uele ships control flow as **components**: \`If\` (also exported as \`Show\`
and \`Match\`), \`Switch\` and \`Dynamic\`. They return live thunks, so the
surrounding DOM is never rebuilt — only the region between their markers
changes.

## If and Show

\`If\` takes a \`when\` condition, children for the true branch and an optional
\`fallback\` for the false branch. \`Show\` is the same component under a more
JSX-friendly name.

\`\`\`jsx live
import { h, useLive, If } from "uele";

let loggedIn = false;

const build = () => (
  <If when={loggedIn} fallback={<p>Please sign in to continue.</p>}>
    <p>Welcome back! 👋</p>
  </If>
);
const [panel, setPanel] = useLive(build());

document.body.append(
  <main>
    {panel}
    <button
      className="primary"
      onClick={() => {
        loggedIn = !loggedIn;
        setPanel(build());
      }}
    >
      {loggedIn ? "Sign out" : "Sign in"}
    </button>
  </main>
);
\`\`\`

Because core \`useLive\` regions hold DOM rather than boolean cells, the
pattern is: keep the condition in a variable, build the \`If\` inside a live
region, and re-run the builder when the variable flips. With a signal preset
the condition can be a cell and the region updates on its own.

## Inline conditionals

Plain JavaScript expressions work too — \`&&\`, the ternary operator and
guard clauses are all valid inside JSX. Keep the condition in a plain
variable and rebuild the region when it changes:

\`\`\`jsx live
import { h, useLive } from "uele";

let unread = 3;

const build = () =>
  unread > 0
    ? <strong>You have {unread} new messages</strong>
    : <span>Inbox zero 🎉</span>;
const [inbox, setInbox] = useLive(build());

document.body.append(
  <main>
    <p>{inbox}</p>
    <button
      onClick={() => {
        unread = Math.max(0, unread - 1);
        setInbox(build());
      }}
    >
      Read one
    </button>
    <button
      className="primary"
      onClick={() => {
        unread += 1;
        setInbox(build());
      }}
    >
      Receive one
    </button>
  </main>
);
\`\`\`

## Switch and Match

\`Switch\` picks the first \`Match\` whose \`when\` is truthy, falling back to
its own \`fallback\` when none match. \`Match\` is an alias of \`If\`.

\`\`\`jsx live
import { h, useLive, Switch, Match } from "uele";

let route = "home";

const build = () => (
  <Switch fallback={<p>404 — page not found</p>}>
    <Match when={route === "home"}>
      <p>🏠 Home page</p>
    </Match>
    <Match when={route === "about"}>
      <p>ℹ️ About page</p>
    </Match>
    <Match when={route === "contact"}>
      <p>✉️ Contact page</p>
    </Match>
  </Switch>
);
const [view, setView] = useLive(build());

document.body.append(
  <main>
    <nav>
      {["home", "about", "contact", "missing"].map((r) => (
        <button
          key={r}
          onClick={() => {
            route = r;
            setView(build());
          }}
          style={{ marginRight: 6 }}
        >
          {r}
        </button>
      ))}
    </nav>
    <section style={{ marginTop: 12 }}>{view}</section>
  </main>
);
\`\`\`

## Dynamic

\`Dynamic\` renders whichever component it is handed and forwards the rest of
the props. It is the tool for tabs, plugin slots and feature-flagged UI:

\`\`\`jsx live
import { h, useLive, Dynamic } from "uele";

const Red = ({ label }) => <p style={{ color: "#e5484d", fontWeight: 700 }}>{label}</p>;
const Blue = ({ label }) => <p style={{ color: "#635bff", fontWeight: 700 }}>{label}</p>;

let useRed = true;

const build = () => (
  <Dynamic component={useRed ? Red : Blue} label="Swapped at runtime" />
);
const [slot, setSlot] = useLive(build());

document.body.append(
  <main>
    {slot}
    <button
      onClick={() => {
        useRed = !useRed;
        setSlot(build());
      }}
    >
      Swap component
    </button>
  </main>
);
\`\`\`

> **Note:** \`Dynamic\` reads \`component\` when the element is created. If the
> choice itself depends on changing state, rebuild it through a live region as
> shown above — or put the \`Dynamic\` inside a function component that a
> parent re-runs.
`;
