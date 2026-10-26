// Full mini-apps shown in the Examples gallery. Every example uses only core
// uele + useLive and is also validated by scripts/check-examples.mjs.

export const EXAMPLES = [
  {
    id: "counter",
    title: "Counter",
    description: "The classic: one live region, three buttons, functional updates.",
    code: `import { h, useLive } from "uele";

const [count, setCount] = useLive(0);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums" }}>{count}</h2>
    <button onClick={() => setCount((c) => c - 1)}>−</button>
    <button className="primary" onClick={() => setCount((c) => c + 1)}>+</button>
    <button onClick={() => setCount(0)}>Reset</button>
  </main>
);`,
  },
  {
    id: "todos",
    title: "Todo list",
    description: "Add, complete and delete tasks — state in variables, rows in a live region.",
    tall: true,
    code: `import { h, useLive } from "uele";

let todos = [
  { id: 1, text: "Read the introduction", done: true },
  { id: 2, text: "Edit a live example", done: false },
];
let seq = 2;
let draft = "";

const [view, setView] = useLive("");

const render = () =>
  setView(
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0" }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => {
                todos = todos.map((t) =>
                  t.id === todo.id ? { ...t, done: !t.done } : t
                );
                render();
              }}
            />
            <span
              style={{
                flex: 1,
                textDecoration: todo.done ? "line-through" : "none",
                color: todo.done ? "#9aa0b4" : "#1b1c22",
              }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => {
                todos = todos.filter((t) => t.id !== todo.id);
                render();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p style={{ color: "#6b6f7c", margin: "6px 0" }}>
        {todos.filter((t) => !t.done).length} remaining
      </p>
    </div>
  );
render();

document.body.append(
  <main style={{ maxWidth: 400 }}>
    <h2>Todos</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        todos = [...todos, { id: ++seq, text, done: false }];
        draft = "";
        e.target.querySelector("input").value = "";
        render();
      }}
    >
      <input placeholder="What needs doing?" onInput={(e) => (draft = e.target.value)} />
      <button type="submit">Add</button>
    </form>
    {view}
  </main>
);`,
  },
  {
    id: "clock",
    title: "Live clock",
    description: "A timer drives a region once per second — nothing else re-renders.",
    code: `import { h, useLive } from "uele";

const [time, setTime] = useLive(new Date().toLocaleTimeString());
setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{time}</h2>
    <p style={{ color: "#6b6f7c", marginTop: 0 }}>updates every second</p>
  </main>
);`,
  },
  {
    id: "converter",
    title: "Temperature converter",
    description: "Two number inputs share one output region — Celsius and Fahrenheit.",
    code: `import { h, useLive } from "uele";

const [out, setOut] = useLive("Enter a value to convert");

document.body.append(
  <main>
    <h2>Temperature</h2>
    <p>
      <label>
        Celsius{" "}
        <input
          type="number"
          placeholder="0"
          onInput={(e) => {
            if (e.target.value === "") return setOut("Enter a value to convert");
            const c = Number(e.target.value);
            setOut(c + " °C  =  " + (c * 9 / 5 + 32) + " °F");
          }}
        />
      </label>
    </p>
    <p>
      <label>
        Fahrenheit{" "}
        <input
          type="number"
          placeholder="32"
          onInput={(e) => {
            if (e.target.value === "") return setOut("Enter a value to convert");
            const f = Number(e.target.value);
            setOut(f + " °F  =  " + ((f - 32) * 5 / 9).toFixed(1) + " °C");
          }}
        />
      </label>
    </p>
    <p style={{ fontSize: 17, fontWeight: 700, color: "#635bff" }}>{out}</p>
  </main>
);`,
  },
  {
    id: "filter",
    title: "Search filter",
    description: "Filter an array on every keystroke and stream the rows into a region.",
    code: `import { h, useLive } from "uele";

const languages = [
  "JavaScript", "TypeScript", "Python", "Rust", "Go",
  "Ruby", "Elixir", "Swift", "Kotlin", "Zig",
];

const [results, setResults] = useLive(
  languages.map((l) => <li key={l}>{l}</li>)
);

document.body.append(
  <main>
    <h2>Languages</h2>
    <input
      placeholder="Search…"
      onInput={(e) => {
        const q = e.target.value.toLowerCase();
        const found = languages.filter((l) => l.toLowerCase().includes(q));
        setResults(
          found.length
            ? found.map((l) => <li key={l}>{l}</li>)
            : <li>No matches</li>
        );
      }}
    />
    <ul>{results}</ul>
  </main>
);`,
  },
  {
    id: "tabs",
    title: "Tabs with Switch",
    description: "A Switch/Match pair swaps panels while the buttons stay untouched.",
    code: `import { h, useLive, Switch, Match } from "uele";

let tab = "one";
const [panel, setPanel] = useLive("");

const render = () =>
  setPanel(
    <Switch fallback={<p>Not found</p>}>
      <Match when={tab === "one"}>
        <p>📄 Content of the first tab</p>
      </Match>
      <Match when={tab === "two"}>
        <p>⚙️ Settings live on the second tab</p>
      </Match>
      <Match when={tab === "three"}>
        <p>✉️ Messages on the third tab</p>
      </Match>
    </Switch>
  );
render();

document.body.append(
  <main>
    <nav>
      {["one", "two", "three"].map((t) => (
        <button
          key={t}
          style={{ marginRight: 6 }}
          onClick={() => {
            tab = t;
            render();
          }}
        >
          {t}
        </button>
      ))}
    </nav>
    <section style={{ marginTop: 12, padding: "4px 0" }}>{panel}</section>
  </main>
);`,
  },
  {
    id: "swatch",
    title: "Color swatch",
    description: "A color input rebuilds a styled subtree — note the hex label lives in the region too.",
    code: `import { h, useLive } from "uele";

let hex = "#635bff";
const [swatch, setSwatch] = useLive("");

const render = () =>
  setSwatch(
    <div>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: 14,
          background: hex,
          margin: "10px 0",
          boxShadow: "0 8px 24px -10px rgba(0,0,0,.4)",
        }}
      />
      <code>{hex}</code>
    </div>
  );
render();

document.body.append(
  <main>
    <h2>Swatch</h2>
    <input
      type="color"
      value={hex}
      onInput={(e) => {
        hex = e.target.value;
        render();
      }}
    />
    {swatch}
  </main>
);`,
  },
  {
    id: "form-preview",
    title: "Live form preview",
    description: "Plain variables hold field values; a region renders the preview card.",
    code: `import { h, useLive } from "uele";

const form = { name: "", role: "Developer" };
const [card, setCard] = useLive(
  <p style={{ color: "#6b6f7c" }}>Fill the form to see a preview</p>
);

const render = () =>
  setCard(
    <article
      style={{
        border: "1px solid #d8dae5",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        background: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 4px" }}>{form.name || "Your name"}</h3>
      <p style={{ margin: 0, color: "#6b6f7c" }}>{form.role}</p>
    </article>
  );

document.body.append(
  <main style={{ maxWidth: 360 }}>
    <h2>Profile</h2>
    <input
      placeholder="Name"
      onInput={(e) => {
        form.name = e.target.value;
        render();
      }}
    />
    <select
      style={{ marginLeft: 8 }}
      onChange={(e) => {
        form.role = e.target.value;
        render();
      }}
    >
      <option>Developer</option>
      <option>Designer</option>
      <option>Manager</option>
    </select>
    {card}
  </main>
);`,
  },
  {
    id: "ticker",
    title: "Async stream",
    description: "An async iterable renders each produced value into the same region.",
    code: `import { h } from "uele";

const ticker = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: () =>
        new Promise((done) =>
          setTimeout(
            () => done({ value: <p>Tick {++i} of 6</p>, done: i >= 6 }),
            500
          )
        ),
    };
  },
};

document.body.append(
  <main>
    <h3>Streaming values</h3>
    {ticker}
  </main>
);`,
  },
  {
    id: "likes",
    title: "Like button",
    description: "Two independent regions track likes and the actor — no component re-renders.",
    code: `import { h, useLive } from "uele";

let count = 0;
const [likes, setLikes] = useLive(0);
const [who, setWho] = useLive("nobody yet");

const people = ["Ada", "Lin", "Grace", "Alan"];

document.body.append(
  <main>
    <h2>{likes} {count === 1 ? "like" : "likes"}</h2>
    <button
      className="primary"
      onClick={() => {
        count += 1;
        setLikes(count);
        setWho(people[Math.min(count - 1, people.length - 1)]);
      }}
    >
      ♥ Like
    </button>
    <button
      onClick={() => {
        count = Math.max(0, count - 1);
        setLikes(count);
      }}
    >
      Unlike
    </button>
    <p style={{ color: "#6b6f7c" }}>Last liked by: <strong>{who}</strong></p>
  </main>
);`,
  },
];
