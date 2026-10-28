export const title = "Playground";

export const markdown = `A minimal, editable JSX playground. Pick an example, change the code, and watch the preview re-run in real time. Everything below runs the **real** uele bundle — no mocks, no simplified runtime.

## Minimal JSX

The smallest possible uele app: one element, one live region.

\`\`\`jsx live
import { h, useLive } from "uele";

const [count, setCount] = useLive(0);

document.body.append(
  <main>
    <h1>Hello, uele</h1>
    <p>{count} clicks</p>
    <button onClick={() => setCount((c) => c + 1)}>Click me</button>
  </main>
);
\`\`\`

That is the whole app — no \`render()\`, no virtual DOM, no mount call. \`h("h1", ...)\` returns a real \`HTMLHeadingElement\` and \`useLive()\` creates a self-updating marker region.

## With JSX components

Components are just functions that return elements.

\`\`\`jsx live
import { h, useLive } from "uele";

const Button = ({ label, onClick }) => (
  <button onClick={onClick} className="primary">
    {label}
  </button>
);

const App = () => {
  const [name, setName] = useLive("stranger");
  return (
    <main>
      <h1>Hello, {name}!</h1>
      <input
        placeholder="Your name"
        onInput={(e) => setName(e.target.value || "stranger")}
      />
      <Button label="Greet" onClick={() => alert(\`Hi, \${name}!\`)} />
    </main>
  );
};

document.body.append(<App />);
\`\`\`

## Try it

Every example in these docs is editable — select the code, change it, and the preview re-runs automatically. The examples gallery below has complete mini-apps you can fork.

## Size

The compiled output of the minimal example above is **~292 B gzip** — the entire uele runtime plus your code, compressed.

---

> Next: [**Elements & JSX**](#/elements) — a deeper look at \`h()\`, \`f()\` and JSX.
`;
