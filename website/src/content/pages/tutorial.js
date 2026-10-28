export const title = "Tic-Tac-Toe Tutorial";

export const markdown = `# Tic-Tac-Toe Tutorial

Build a complete tic-tac-toe game with uele — signals, components, keyed lists, and conditional rendering — in about 40 lines.

Inspired by [sinuous's getting started guide](https://sinuous.netlify.app/docs/getting-started/).

## Step 1: The board

Start with a 3×3 grid of cells:

\`\`\`jsx live
import { h, For } from "uele";

const EMPTY = null;
const board = [null, null, null, null, null, null, null, null, null];

document.body.append(
  <main>
    <h1>Tic-Tac-Toe</h1>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: 4 }}>
      <For each={board}>
        {(cell, i) => (
          <button
            style={{ height: 80, fontSize: 24 }}
            onClick={() => {}}
          >
            {cell || ""}
          </button>
        )}
      </For>
    </div>
  </main>
);
\`\`\`

\`<For each={board}>\` renders each cell as a button. Static arrays render once — no signals needed yet.

## Step 2: Handle clicks

Make the board reactive with signals, track whose turn it is, and fill cells on click:

\`\`\`jsx live
import { h, For } from "uele";
import { signal, computed, effect, write, read } from "uele/reactive";

const EMPTY = null;
const board = signal(Array(9).fill(EMPTY));
const turn = signal("X");

document.body.append(
  <main>
    <h1>{() => read(turn)}'s turn</h1>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: 4 }}>
      <For each={board} key={(v, i) => i}>
        {(cell, i) => (
          <button
            style={{ height: 80, fontSize: 24 }}
            disabled={cell != null}
            onClick={() => {
              const next = [...read(board)];
              if (next[i] !== EMPTY) return;
              next[i] = read(turn);
              write(board, next);
              write(turn, read(turn) === "X" ? "O" : "X");
            }}
          >
            {cell || ""}
          </button>
        )}
      </For>
    </div>
  </main>
);
\`\`\`

\`key={(v, i) => i}\` tells uele to reuse each button's DOM node instead of rebuilding the row. \`signal()\`, \`read()\` and \`write()\` come from \`uele/reactive\` and work with any preset.

## Step 3: Detect a winner

Add a \`winner\` signal and a \`checkWinner()\` helper:

\`\`\`jsx live
import { h, For } from "uele";
import { signal, computed, effect, write, read } from "uele/reactive";

const EMPTY = null;
const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

const board = signal(Array(9).fill(EMPTY));
const turn = signal("X");
const winner = signal(null);

const checkWinner = () => {
  const b = read(board);
  for (const [a, b2, c] of WINS) {
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
      write(winner, b[a]);
      return;
    }
  }
  if (!b.includes(EMPTY)) write(winner, "draw");
};

document.body.append(
  <main>
    <h1>
      {() => read(winner) ? \`\${read(winner)} wins!\` : \`\${read(turn)}'s turn\`}
    </h1>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: 4 }}>
      <For each={board} key={(v, i) => i}>
        {(cell, i) => (
          <button
            style={{ height: 80, fontSize: 24 }}
            disabled={cell != null || read(winner)}
            onClick={() => {
              if (read(winner) || cell !== EMPTY) return;
              const next = [...read(board)];
              next[i] = read(turn);
              write(board, next);
              checkWinner();
              if (!read(winner)) write(turn, read(turn) === "X" ? "O" : "X");
            }}
          >
            {cell || ""}
          </button>
        )}
      </For>
    </div>
    <button
      onClick={() => {
        write(board, Array(9).fill(EMPTY));
        write(turn, "X");
        write(winner, null);
      }}
    >
      New game
    </button>
  </main>
);
\`\`\`

## Step 4: Polish

Add status messages, disable the board after the game ends, and style it:

\`\`\`jsx live
import { h, For, Switch, Match } from "uele";
import { signal, computed, effect, write, read } from "uele/reactive";

const EMPTY = null;
const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const board = signal(Array(9).fill(EMPTY));
const turn = signal("X");
const winner = signal(null);

const checkWinner = () => {
  const b = read(board);
  for (const [a, b2, c] of WINS) {
    if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
      write(winner, b[a]);
      return;
    }
  }
  if (!b.includes(EMPTY)) write(winner, "draw");
};

document.body.append(
  <main style={{ maxWidth: 320, margin: "40px auto", fontFamily: "system-ui" }}>
    <h1 style={{ textAlign: "center" }}>Tic-Tac-Toe</h1>
    <Switch>
      <Match when={() => read(winner) === "draw"}>
        <p style={{ textAlign: "center", color: "#6b6f7c" }}>It's a draw!</p>
      </Match>
      <Match when={() => read(winner)}>
        <p style={{ textAlign: "center", color: "#635bff", fontWeight: "700" }}>
          {() => \`\${read(winner)} wins!\`}
        </p>
      </Match>
      <Match when={() => true}>
        <p style={{ textAlign: "center", color: "#6b6f7c" }}>
          {() => \`\${read(turn)}'s turn\`}
        </p>
      </Match>
    </Switch>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 80px)",
        gap: 4,
        margin: "20px 0",
      }}
    >
      <For each={board} key={(v, i) => i}>
        {(cell, i) => (
          <button
            style={{
              height: 80,
              fontSize: 24,
              fontWeight: "600",
              color: cell === "X" ? "#635bff" : "#0891b2",
            }}
            disabled={cell != null || read(winner)}
            onClick={() => {
              if (read(winner) || cell !== EMPTY) return;
              const next = [...read(board)];
              next[i] = read(turn);
              write(board, next);
              checkWinner();
              if (!read(winner)) write(turn, read(turn) === "X" ? "O" : "X");
            }}
          >
            {cell || ""}
          </button>
        )}
      </For>
    </div>
    <button
      onClick={() => {
        write(board, Array(9).fill(EMPTY));
        write(turn, "X");
        write(winner, null);
      }}
      style={{
        display: "block",
        margin: "0 auto",
        padding: "8px 16px",
        background: "#635bff",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      New game
    </button>
  </main>
);
\`\`\`

That's it — a complete tic-tac-toe game with:

* **Signals** for board state, turn, and winner
* **\`<For key={...}>\`** for keyed list rendering with node reuse
* **\`<Switch>/<Match>\`** for conditional game states
* **Live props** — \`disabled\`, \`color\` and children all react to signal changes

The compiled game is **~1.1 KB gzip**.

---

> Next: [**UI Components**](#/ui-components) — 129 headless primitives to build your next app.
`;
