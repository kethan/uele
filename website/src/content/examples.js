// Full mini-apps shown in the Examples gallery. Simple demos use core
// useLive with a default value; stateful apps use a signal preset (ulive or
// Preact signals) with cells and keyed <For> lists. Every example is also
// validated by scripts/check-examples.mjs.

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
    description: "ulive signals hold the state; a keyed For reuses every unchanged row's DOM node.",
    tall: true,
    code: `import { h, For } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal, computed } from "ulive";

useUlive();

let seq = 2;
const todos = signal([
  { id: 1, text: "Read the introduction", done: true },
  { id: 2, text: "Edit a live example", done: false },
]);
const draft = signal("");
const remaining = computed(() => todos.value.filter((t) => !t.done).length);

const addTodo = (form) => {
  const text = draft.value.trim();
  if (!text) return;
  todos.value = [...todos.value, { id: ++seq, text, done: false }];
  draft.value = "";
  form.querySelector("input").value = "";
};

document.body.append(
  <main style={{ maxWidth: 400 }}>
    <h2>Todos</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addTodo(e.currentTarget);
      }}
    >
      <input
        placeholder="What needs doing?"
        onInput={(e) => (draft.value = e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0" }}>
      <For each={todos} key={(todo) => todo.id} fallback={<li>Nothing to do</li>}>
        {(todo) => (
          <li
            key={todo.id}
            style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() =>
                (todos.value = todos.value.map((t) =>
                  t.id === todo.id ? { ...t, done: !t.done } : t
                ))
              }
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
              onClick={() => (todos.value = todos.value.filter((t) => t.id !== todo.id))}
            >
              Delete
            </button>
          </li>
        )}
      </For>
    </ul>
    <p style={{ color: "#6b6f7c", margin: "6px 0" }}>{remaining} remaining</p>
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
    description: "A computed cell filters the array on every keystroke; For keeps the rows that still match on their existing nodes.",
    code: `import { h, For } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal, computed } from "ulive";

useUlive();

const languages = [
  "JavaScript", "TypeScript", "Python", "Rust", "Go",
  "Ruby", "Elixir", "Swift", "Kotlin", "Zig",
];
const query = signal("");
const results = computed(() => {
  const q = query.value.toLowerCase();
  return languages.filter((l) => l.toLowerCase().includes(q));
});

document.body.append(
  <main>
    <h2>Languages</h2>
    <input placeholder="Search…" onInput={(e) => (query.value = e.target.value)} />
    <ul>
      <For each={results} key={(language) => language} fallback={<li>No matches</li>}>
        {(language) => <li key={language}>{language}</li>}
      </For>
    </ul>
  </main>
);`,
  },
  {
    id: "tabs",
    title: "Tabs with Switch",
    description: "A signal cell drives Switch/Match — the buttons and surrounding DOM are never rebuilt.",
    code: `import { h, Switch, Match } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const tab = signal("one");

document.body.append(
  <main>
    <nav>
      {["one", "two", "three"].map((t) => (
        <button
          key={t}
          style={{ marginRight: 6 }}
          onClick={() => (tab.value = t)}
        >
          {t}
        </button>
      ))}
    </nav>
    <section style={{ marginTop: 12, padding: "4px 0" }}>
      <Switch fallback={<p>Not found</p>}>
        <Match when={() => tab.value === "one"}>
          <p>📄 Content of the first tab</p>
        </Match>
        <Match when={() => tab.value === "two"}>
          <p>⚙️ Settings live on the second tab</p>
        </Match>
        <Match when={() => tab.value === "three"}>
          <p>✉️ Messages on the third tab</p>
        </Match>
      </Switch>
    </section>
  </main>
);`,
  },
  {
    id: "swatch",
    title: "Color swatch",
    description: "One signal cell, three live bindings — uele patches only the CSS property and text that change.",
    code: `import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const hex = signal("#635bff");

document.body.append(
  <main>
    <h2>Swatch</h2>
    <input type="color" value={hex} onInput={(e) => (hex.value = e.target.value)} />
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
  </main>
);`,
  },
  {
    id: "form-preview",
    title: "Live form preview",
    description: "Two signal cells hold the field values; the preview card re-renders only its text nodes.",
    code: `import { h, If } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const name = signal("");
const role = signal("Developer");

document.body.append(
  <main style={{ maxWidth: 360 }}>
    <h2>Profile</h2>
    <input placeholder="Name" onInput={(e) => (name.value = e.target.value)} />
    <select style={{ marginLeft: 8 }} onChange={(e) => (role.value = e.target.value)}>
      <option>Developer</option>
      <option>Designer</option>
      <option>Manager</option>
    </select>
    <If when={() => name.value.trim() === ""} fallback={<span />}>
      <p style={{ color: "#6b6f7c" }}>Fill the form to see a preview</p>
    </If>
    <article
      style={{
        border: "1px solid #d8dae5",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        background: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 4px" }}>{() => name.value || "Your name"}</h3>
      <p style={{ margin: 0, color: "#6b6f7c" }}>{role}</p>
    </article>
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
    description: "Two independent signal cells track the count and the actor — no component re-renders.",
    code: `import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const likes = signal(0);
const who = signal("nobody yet");

const people = ["Ada", "Lin", "Grace", "Alan"];

document.body.append(
  <main>
    <h2>
      {likes} {() => (likes.value === 1 ? "like" : "likes")}
    </h2>
    <button
      className="primary"
      onClick={() => {
        likes.value += 1;
        who.value = people[Math.min(likes.value - 1, people.length - 1)];
      }}
    >
      ♥ Like
    </button>
    <button onClick={() => (likes.value = Math.max(0, likes.value - 1))}>
      Unlike
    </button>
    <p style={{ color: "#6b6f7c" }}>Last liked by: <strong>{who}</strong></p>
  </main>
);`,
  },
  {
    id: "signals-counter",
    title: "Preact signals counter",
    description: "A preset in one call; cells drive both text and the disabled attribute.",
    code: `import { h } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed } from "@preact/signals-core";

usePreactSignals();

const count = signal(0);
const isZero = computed(() => count.value === 0);
const doubled = computed(() => count.value * 2);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums" }}>{count}</h2>
    <p>doubled: <strong>{doubled}</strong></p>
    <button disabled={isZero} onClick={() => (count.value -= 1)}>−1</button>
    <button className="primary" onClick={() => (count.value += 1)}>+1</button>
    <button disabled={isZero} onClick={() => (count.value = 0)}>Reset</button>
  </main>
);`,
  },
  {
    id: "reactive-todos",
    title: "Todos on uele/reactive",
    description: "Preset-agnostic state: signal cells, a computed remaining count and a keyed For.",
    tall: true,
    code: `import { h, For } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { signal, computed, read, write } from "uele/reactive";

usePreactSignals();

let seq = 3;
const todos = signal([
  { id: 1, text: "learn signals", done: true },
  { id: 2, text: "wire a preset", done: false },
  { id: 3, text: "ship it", done: false },
]);
const draft = signal("");
const remaining = computed(() => read(todos).filter((t) => !t.done).length);

const addTodo = (form) => {
  const text = read(draft).trim();
  if (!text) return;
  write(todos, [...read(todos), { id: ++seq, text, done: false }]);
  write(draft, "");
  form.querySelector("input").value = "";
};

document.body.append(
  <main style={{ maxWidth: 420 }}>
    <h2>Reactive todos</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addTodo(e.currentTarget);
      }}
    >
      <input placeholder="New todo" onInput={(e) => write(draft, e.target.value)} />
      <button type="submit">Add</button>
    </form>
    <For each={todos} fallback={<p>Nothing to do</p>}>
      {(todo) => (
        <li
          key={todo.id}
          style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}
        >
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() =>
              write(
                todos,
                read(todos).map((t) =>
                  t.id === todo.id ? { ...t, done: !t.done } : t
                )
              )
            }
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
          <button onClick={() => write(todos, read(todos).filter((t) => t.id !== todo.id))}>
            ×
          </button>
        </li>
      )}
    </For>
    <p style={{ color: "#6b6f7c" }}>{remaining} remaining</p>
  </main>
);`,
  },
  {
    id: "ulive-counter",
    title: "Same app, ulive preset",
    description: "Swap usePreactSignals for useUlive — the JSX component code is unchanged.",
    code: `import { h } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal, computed } from "ulive";

useUlive();

const count = signal(0);
const squared = computed(() => count.value * count.value);

document.body.append(
  <main>
    <h2 style={{ fontVariantNumeric: "tabular-nums" }}>{count}</h2>
    <p>squared: <strong>{squared}</strong></p>
    <button className="primary" onClick={() => (count.value = count.value + 1)}>
      +1 with ulive
    </button>
    <button onClick={() => (count.value = 0)}>Reset</button>
  </main>
);`,
  },
  {
    id: "hooks-demo",
    title: "Portable hooks",
    description: "useToggle, useCounter and useDebounce from uele/hooks, all running on one preset.",
    code: `import { h, If } from "uele";
import { usePreactSignals } from "uele/adapters/preact";
import { useToggle, useCounter, useDebounce } from "uele/hooks";
import { signal, computed, read } from "uele/reactive";

usePreactSignals();

const [on, toggle] = useToggle(true);
const onLabel = computed(() => (read(on) ? "Pause" : "Resume"));
const counter = useCounter(10, { min: 0, max: 50, step: 10 });
const query = signal("");
const [delayed] = useDebounce(query, 400);
const echo = computed(() => read(delayed) || "(type something)");

document.body.append(
  <main>
    <p>
      <button onClick={toggle}>{onLabel}</button>
    </p>
    <If when={on}>
      <section style={{ padding: 12, border: "1px solid #d8dae5", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>useCounter — clamped 0–50, step 10</h3>
        <p style={{ fontSize: 18, fontWeight: 700 }}>{counter.count}</p>
        <button onClick={() => counter.dec()}>−10</button>
        <button className="primary" onClick={() => counter.inc()}>+10</button>
      </section>
    </If>
    <h3>useDebounce (400ms)</h3>
    <input placeholder="Type…" onInput={(e) => (query.value = e.target.value)} />
    <p>Echo: <strong>{echo}</strong></p>
  </main>
);`,
  },
  {
    id: "diff-shuffle",
    title: "Keyed diff on shuffle",
    description: "A signal cell feeds For directly; udomdiff moves the existing keyed nodes instead of rebuilding them.",
    code: `import { h, For } from "uele";
import { useUdomdiff } from "uele/diffs/udomdiff";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUdomdiff();
useUlive();

const cards = signal([1, 2, 3, 4, 5, 6].map((n) => ({ id: n })));

document.body.append(
  <main>
    <h3>udomdiff keyed list</h3>
    <ul>
      <For each={cards} key={(card) => card.id} fallback={<p>empty</p>}>
        {(card) => <li key={card.id}>card {card.id}</li>}
      </For>
    </ul>
    <button onClick={() => (cards.value = [...cards.value].reverse())}>
      Reverse
    </button>
    <button
      onClick={() =>
        (cards.value = [...cards.value].sort(() => Math.random() - 0.5))
      }
    >
      Shuffle
    </button>
    <button onClick={() => (cards.value = cards.value.slice(1))}>
      Remove first
    </button>
  </main>
);`,
  },
];
