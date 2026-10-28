export const title = "Components";

export const markdown = `
A uele component is a **function that receives props and returns a node** (or
a reactive value, a promise, an array of nodes — anything that qualifies as a
child). There are no classes, no lifecycle methods and no hooks rules beyond
plain JavaScript.

## Your first component

\`\`\`jsx
import { h } from "uele";

const Greeting = ({ name }) => (
  <section>
    <h2>Hello, {name} 👋</h2>
    <p>Components are functions that take props and return elements.</p>
  </section>
);

document.body.append(
  <main>
    <Greeting name="Ada" />
    <Greeting name="Lin" />
  </main>
);
\`\`\`

## Props and children

Everything you pass in JSX lands in the single props object, including
\`children\`. Components compose exactly like DOM elements.

\`\`\`jsx
import { h } from "uele";

const Card = ({ title, children }) => (
  <article
    style={{
      border: "1px solid #d8dae5",
      borderRadius: "12px",
      padding: "18px",
      margin: "10px 0",
      background: "#fff",
    }}
  >
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {children}
  </article>
);

const App = () => (
  <main>
    <Card title="First card">
      <p>Cards receive arbitrary content through children.</p>
    </Card>
    <Card title="Second card">
      <ul>
        <li>Compose components inside components</li>
        <li>Props are plain objects — destructure freely</li>
      </ul>
    </Card>
  </main>
);

document.body.append(<App />);
\`\`\`

## State inside a component

Components run once and return real nodes. State that changes over time lives
in a \`useLive\` region (covered in depth on the next page):

\`\`\`jsx
import { h, useLive } from "uele";

const Counter = ({ start = 0, step = 1 }) => {
  const [count, setCount] = useLive(start);
  return (
    <div>
      <button onClick={() => setCount((c) => c - step)}>−{step}</button>
      <strong style={{ margin: "0 12px" }}>{count}</strong>
      <button className="primary" onClick={() => setCount((c) => c + step)}>
        +{step}
      </button>
    </div>
  );
};

document.body.append(
  <main>
    <h3>Two independent instances</h3>
    <Counter start={0} step={1} />
    <br />
    <Counter start={10} step={5} />
  </main>
);
\`\`\`

Each component call creates its own region and its own setter — instances are
fully independent.

## Async components

A component may be \`async\`. The returned promise is itself a valid child, so
uele renders nothing (or a placeholder) until it resolves:

\`\`\`jsx
import { h } from "uele";

const UserCard = async ({ id }) => {
  // simulate a network request
  const user = await new Promise((resolve) =>
    setTimeout(
      () => resolve({ id, name: "Ada Lovelace", role: "Mathematician" }),
      900
    )
  );
  return (
    <article style={{ border: "1px solid #d8dae5", borderRadius: "10px", padding: "14px" }}>
      <h3 style={{ margin: 0 }}>{user.name}</h3>
      <p style={{ margin: "4px 0 0", color: "#6b6f7c" }}>
        {user.role} · id {user.id}
      </p>
    </article>
  );
};

document.body.append(
  <main>
    <p>Loading a user…</p>
    <UserCard id={42} />
  </main>
);
\`\`\`

## Choosing a component dynamically

\`Dynamic\` renders whatever component it is handed, forwarding the rest of
the props — useful for tabs, layouts and feature flags.

\`\`\`jsx
import { h, Dynamic } from "uele";

const Notice = ({ tone, children }) => (
  <p style={{ color: tone === "error" ? "#e5484d" : "#17a673", fontWeight: 700 }}>
    {children}
  </p>
);

const App = () => (
  <main>
    <Dynamic component={Notice} tone="error">Something went wrong</Dynamic>
    <Dynamic component={Notice} tone="ok">All systems go</Dynamic>
  </main>
);

document.body.append(<App />);
\`\`\`
`;
