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

For lists that change, keep the data in a variable and render the rows through
a \`useLive\` region — adding, removing and reordering all rebuild against the
same builder:

\`\`\`jsx live
import { h, useLive } from "uele";

let nextId = 3;
let tasks = [
  { id: 1, text: "Learn h()" },
  { id: 2, text: "Write some JSX" },
];

const [list, setList] = useLive("");

const render = () =>
  setList(
    <div>
      <h3>Tasks ({tasks.length})</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0" }}
          >
            <span style={{ flex: 1 }}>{task.text}</span>
            <button
              onClick={() => {
                tasks = tasks.filter((t) => t.id !== task.id);
                render();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
render();

document.body.append(
  <main>
    {list}
    <button
      className="primary"
      onClick={() => {
        tasks = [...tasks, { id: ++nextId, text: "Task " + nextId }];
        render();
      }}
    >
      Add task
    </button>
  </main>
);
\`\`\`

> **Tip:** any iterable works — arrays, \`Set\`, generators and \`NodeList\`.
> Duplicate keys are safe: a node is reused at most once per render, so
> \`[1, 1, 2]\` renders three elements.
`;
