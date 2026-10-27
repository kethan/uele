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

Here it is driving a reactive region whose list is reversed, shuffled, grown
and trimmed. A ulive cell holds the data; the thunk child re-runs when it
changes and each swap goes through \`api.diff\` — which, under useRebuild,
removes and re-inserts every node:

\`\`\`jsx live
import { h, map } from "uele";
import { useRebuild } from "uele/diffs/rebuild";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useRebuild();
useUlive();

const items = signal([1, 2, 3, 4, 5]);

document.body.append(
  <main>
    <h3>useRebuild — zero-dependency differ</h3>
    <ul>
      {() =>
        map(
          items.value,
          (n) => <li key={n}>item {n}</li>,
          <li>empty</li>,
          (n) => n
        )
      }
    </ul>
    <button onClick={() => (items.value = [...items.value].reverse())}>
      Reverse
    </button>
    <button
      onClick={() =>
        (items.value = [...items.value].sort(() => Math.random() - 0.5))
      }
    >
      Shuffle
    </button>
    <button
      onClick={() => (items.value = [...items.value, items.value.length + 1])}
    >
      Add
    </button>
    <button onClick={() => (items.value = items.value.slice(1))}>
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
import { h, For } from "uele";
import { useUdomdiff } from "uele/diffs/udomdiff";
import { useUlive } from "uele/adapters/ulive";
import { signal } from "ulive";

useUdomdiff();
useUlive();

const rows = signal([
  { id: 1, label: "one" },
  { id: 2, label: "two" },
  { id: 3, label: "three" },
  { id: 4, label: "four" },
]);

document.body.append(
  <main>
    <h3>useUdomdiff — keyed moves</h3>
    <ul>
      <For each={rows} key={(row) => row.id} fallback={<p>no rows</p>}>
        {(row) => (
          <li key={row.id}>
            {row.id}: {row.label}
          </li>
        )}
      </For>
    </ul>
    <button onClick={() => (rows.value = [...rows.value].reverse())}>
      Reverse
    </button>
    <button
      onClick={() =>
        (rows.value = [...rows.value].sort(() => Math.random() - 0.5))
      }
    >
      Shuffle
    </button>
    <button
      onClick={() =>
        (rows.value = [
          ...rows.value,
          { id: Math.max(...rows.value.map((r) => r.id)) + 1, label: "new" },
        ])
      }
    >
      Add row
    </button>
    <button onClick={() => (rows.value = rows.value.slice(1))}>
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
