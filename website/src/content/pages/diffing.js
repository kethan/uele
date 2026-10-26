export const title = "List Diffing";

export const markdown = `
When a live region swaps its contents, uele calls \`api.diff(parent,
oldNodes, newNodes, end)\` if one is installed; otherwise it falls back to a
marker walk — remove every node between the region's markers and insert the
new ones. The \`uele/diffs/*\` presets plug alternative diffing engines into
that single seam, and they compose with any signal preset.

## The smallest possible differ

\`uele/diffs/rebuild\` has **zero dependencies** and is barely a dozen lines:
remove the old nodes, insert the new ones. It is the easiest way to understand
the \`api.diff\` contract and a fine baseline for tiny lists.

\`\`\`js
// the whole preset, conceptually:
import { api } from "uele";

const useRebuild = () => {
  api.diff = (parent, oldNodes, newNodes, end) => {
    oldNodes.forEach((node) => parent.removeChild(node));
    newNodes.forEach((node) => parent.insertBefore(node, end || null));
  };
};
\`\`\`

Here it is driving a region whose list is reversed, shuffled, grown and
trimmed:

\`\`\`jsx live
import { h, useLive, map } from "uele";
import { useRebuild } from "uele/diffs/rebuild";

useRebuild();

let items = [1, 2, 3, 4, 5];
const [region, setRegion] = useLive("");

const render = () =>
  setRegion(
    map(
      items,
      (n) => <li key={n}>item {n}</li>,
      <li>empty</li>,
      (n) => n
    )
  );
render();

const mutate = (fn) => {
  fn();
  render();
};

document.body.append(
  <main>
    <h3>useRebuild — zero-dependency differ</h3>
    <ul>{region}</ul>
    <button onClick={() => mutate(() => (items = [...items].reverse()))}>
      Reverse
    </button>
    <button
      onClick={() =>
        mutate(() => (items = [...items].sort(() => Math.random() - 0.5)))
      }
    >
      Shuffle
    </button>
    <button onClick={() => mutate(() => (items = [...items, items.length + 1]))}>
      Add
    </button>
    <button onClick={() => mutate(() => (items = items.slice(1)))}>
      Remove first
    </button>
  </main>
);
\`\`\`

## A real keyed DOM differ

\`udomdiff\` is a small (~3 KB) keyed DOM reconciliation library. The preset
hands uele its diff function and an identity getter through \`api.udom\`, so
reorders move existing nodes instead of rebuilding them.

\`\`\`jsx live
import { h, useLive, For } from "uele";
import { useUdomdiff } from "uele/diffs/udomdiff";

useUdomdiff();

let rows = [
  { id: 1, label: "one" },
  { id: 2, label: "two" },
  { id: 3, label: "three" },
  { id: 4, label: "four" },
];
const [region, setRegion] = useLive("");

const render = () =>
  setRegion(
    <For each={rows} key={(row) => row.id} fallback={<p>no rows</p>}>
      {(row) => (
        <li key={row.id}>
          {row.id}: {row.label}
        </li>
      )}
    </For>
  );
render();

const mutate = (fn) => {
  fn();
  render();
};

document.body.append(
  <main>
    <h3>useUdomdiff — keyed moves</h3>
    <ul>{region}</ul>
    <button onClick={() => mutate(() => (rows = [...rows].reverse()))}>
      Reverse
    </button>
    <button
      onClick={() =>
        mutate(() => (rows = [...rows].sort(() => Math.random() - 0.5)))
      }
    >
      Shuffle
    </button>
    <button
      onClick={() =>
        mutate(() =>
          (rows = [...rows, { id: Math.max(...rows.map((r) => r.id)) + 1, label: "new" }])
        )
      }
    >
      Add row
    </button>
    <button onClick={() => mutate(() => (rows = rows.slice(1)))}>
      Remove first
    </button>
  </main>
);
\`\`\`

## Bundled diff presets

| Preset | Engine | Notes |
| --- | --- | --- |
| \`uele/diffs/rebuild\` | built-in | Smallest differ, no dependency |
| \`uele/diffs/builtin\` | built-in | Restore the default marker walk |
| \`uele/diffs/udomdiff\` | [udomdiff](https://www.npmjs.com/package/udomdiff) | Tiny keyed DOM reconciliation |
| \`uele/diffs/domdiff\` | domdiff | Options-based diffing with an end marker |
| \`uele/diffs/morphdom\` | morphdom | Morphs old DOM toward the new tree |
| \`uele/diffs/nanomorph\` | nanomorph | Fast DOM morphing |
| \`uele/diffs/swapdom\` | swapdom | Small swap-based differ |
| \`uele/diffs/fast-array-diff\` | fast-array-diff | LCS patches decide the ordering |

> **Note:** diff presets and signal presets are orthogonal. A call such as
> \`usePreactSignals()\` configures reactivity while \`useUdomdiff()\`
> configures region swaps — the same components work with any combination.
> Each playground iframe is isolated, so installing a differ only affects
> the example you are looking at.
`;
