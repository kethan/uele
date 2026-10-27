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
import { h, If } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const loggedIn = signal(false);

document.body.append(
  <main>
    <If when={loggedIn} fallback={<p>Please sign in to continue.</p>}>
      <p>Welcome back! 👋</p>
    </If>
    <button
      className="primary"
      onClick={() => (loggedIn.value = !loggedIn.value)}
    >
      {() => (loggedIn.value ? "Sign out" : "Sign in")}
    </button>
  </main>
);
\`\`\`

A signal cell is truthy as a JavaScript value, so never write
\`{cell && <p>…</p>}\` — the cell itself renders as a child. Hand it straight
to \`If\` (or wrap it: \`when={() => cell.value}\`); the effect swaps the
branch in place when the condition flips, no surrounding DOM is rebuilt.

## Inline conditionals

Plain JavaScript expressions work too — \`&&\`, the ternary operator and
guard clauses are all valid inside JSX. Wrap a condition in a thunk so the
signal preset re-runs just that expression when its cell changes:

\`\`\`jsx live
import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const unread = signal(3);

document.body.append(
  <main>
    <p>
      {() =>
        unread.value > 0
          ? <strong>You have {unread} new messages</strong>
          : <span>Inbox zero 🎉</span>
      }
    </p>
    <button onClick={() => (unread.value = Math.max(0, unread.value - 1))}>
      Read one
    </button>
    <button className="primary" onClick={() => (unread.value += 1)}>
      Receive one
    </button>
  </main>
);
\`\`\`

## Switch and Match

\`Switch\` picks the first \`Match\` whose \`when\` is truthy, falling back to
its own \`fallback\` when none match. \`Match\` is an alias of \`If\`.

\`\`\`jsx live
import { h, Switch, Match } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const route = signal("home");

document.body.append(
  <main>
    <nav>
      {["home", "about", "contact", "missing"].map((r) => (
        <button
          key={r}
          onClick={() => (route.value = r)}
          style={{ marginRight: 6 }}
        >
          {r}
        </button>
      ))}
    </nav>
    <section style={{ marginTop: 12 }}>
      <Switch fallback={<p>404 — page not found</p>}>
        <Match when={() => route.value === "home"}>
          <p>🏠 Home page</p>
        </Match>
        <Match when={() => route.value === "about"}>
          <p>ℹ️ About page</p>
        </Match>
        <Match when={() => route.value === "contact"}>
          <p>✉️ Contact page</p>
        </Match>
      </Switch>
    </section>
  </main>
);
\`\`\`

## Dynamic

\`Dynamic\` renders whichever component it is handed and forwards the rest of
the props. It is the tool for tabs, plugin slots and feature-flagged UI:

\`\`\`jsx live
import { h, Dynamic } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const Red = ({ label }) => <p style={{ color: "#e5484d", fontWeight: 700 }}>{label}</p>;
const Blue = ({ label }) => <p style={{ color: "#635bff", fontWeight: 700 }}>{label}</p>;

const useRed = signal(true);

document.body.append(
  <main>
    {() => (
      <Dynamic
        component={useRed.value ? Red : Blue}
        label="Swapped at runtime"
      />
    )}
    <button onClick={() => (useRed.value = !useRed.value)}>
      Swap component
    </button>
  </main>
);
\`\`\`

> **Note:** \`Dynamic\` calls whatever function it receives in \`component\`
> as a component, so the selector cannot itself be a thunk — put the thunk
> one level up and have it return the chosen \`Dynamic\` element. The region
> then swaps just that element when the cell changes.
`;
