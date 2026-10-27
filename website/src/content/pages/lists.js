export const title = "Lists & Keys";

export const markdown = `
Rendering collections has two entry points: the \`<For>\` control-flow
component (JSX) and the \`map()\` function (hyperscript). Both share the same
keyed diffing engine: a node is reused while its key is present, and nodes
whose keys disappear are released immediately.

## For

Pass an iterable as \`each\`, a render function as the sole child, and an
optional \`fallback\` for empty collections.

\`\`\`jsx live
import { h, For } from "uele";

const fruits = [
  { id: 1, name: "apple" },
  { id: 2, name: "banana" },
  { id: 3, name: "cherry" },
];

document.body.append(
  <main>
    <h3>Fruit bowl</h3>
    <ul>
      <For each={fruits} fallback={<li>The bowl is empty</li>}>
        {(fruit, i) => (
          <li key={fruit.id}>
            {i + 1}. {fruit.name}
          </li>
        )}
      </For>
    </ul>
  </main>
);
\`\`\`

## Keys and node reuse

By default items are keyed by identity (\`key = (v) => v\`). Give \`For\` a
\`key\` function when items are objects that can be replaced with new
versions of themselves — a pure reorder then only **moves** existing nodes,
and filtering never leaks them.

\`\`\`jsx live
import { h, For } from "uele";

const users = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Lin" },
  { id: 3, name: "Grace" },
];

document.body.append(
  <table>
    <thead>
      <tr><th>id</th><th>name</th></tr>
    </thead>
    <tbody>
      <For each={users} key={(user) => user.id}>
        {(user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.name}</td>
          </tr>
        )}
      </For>
    </tbody>
  </table>
);
\`\`\`

## The map() function

\`map(items, callback, fallback, key)\` is the same engine without JSX — handy
inside \`h()\` calls and utility code.

\`\`\`jsx live
import { h, map } from "uele";

const tags = ["jsx", "signals", "tiny", "dom"];

document.body.append(
  h(
    "main",
    null,
    h("h3", null, "Tags"),
    h(
      "p",
      null,
      map(
        tags,
        (tag) => h("span", {
          style: {
            display: "inline-block",
            padding: "3px 10px",
            margin: "0 6px 6px 0",
            borderRadius: 999,
            background: "#eeedff",
            color: "#4a42e0",
            fontSize: 13,
          },
        }, "#" + tag),
        "no tags",
        (tag) => tag
      )
    )
  )
);
\`\`\`

## Interactive lists

For lists that change, hold the data in a signal cell and hand it straight to
\`For\`. Update the cell immutably (\`map\`, \`filter\`, spread) — the keyed
reconciler then moves, adds or removes only the rows whose keys changed, and
the render callback never re-runs for a row whose node was reused:

\`\`\`jsx live
import { h, For } from "uele";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUlive();

const nextId = signal(3);
const tasks = signal([
  { id: 1, text: "Learn h()" },
  { id: 2, text: "Write some JSX" },
]);

document.body.append(
  <main>
    <div>
      <h3>Tasks {() => "(" + tasks.value.length + ")"}</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <For each={tasks} key={(task) => task.id}>
          {(task) => (
            <li
              key={task.id}
              style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}
            >
              <span style={{ flex: 1 }}>{task.text}</span>
              <button
                onClick={() =>
                  (tasks.value = tasks.value.filter((t) => t.id !== task.id))
                }
              >
                Delete
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
    <button
      className="primary"
      onClick={() => {
        const id = nextId.value++;
        tasks.value = [...tasks.value, { id, text: "Task " + id }];
      }}
    >
      Add task
    </button>
  </main>
);
\`\`\`

> **Why not a \`useLive\` region with \`.map()\`?** Rebuilding the whole list
> hands the differ a fresh array of brand-new nodes reconciled by position,
> so every row is touched even when only one changed. A persistent keyed
> \`For\` over a signal cell reuses the existing row nodes instead — this is
> the pattern used by the repository's own example apps
> (\`examples/todos/ulive.jsx\`, \`examples/dashboard.jsx\`).

> **Tip:** any iterable works — arrays, \`Set\`, generators and \`NodeList\`.
> Duplicate keys are safe: a node is reused at most once per render, so
> \`[1, 1, 2]\` renders three elements.
`;
