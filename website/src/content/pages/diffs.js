export const title = "Diff Engine";

export const markdown = `## uele/diffs — list reconciliation engines

The \`<For\) component and \`map()\) helper use a diff engine to reconcile lists while reusing unchanged DOM nodes. uele ships **nine diff engines** plus a built-in default, and you can plug in any diff library via \`api.diff\).

## Built-in engines

| Engine | File | Description |
| --- | --- | --- |
| \`builtin\) | \`diffs/builtin\) | Default marker-walk engine, zero dependencies |
| \`swapdom\) | \`diffs/swapdom\) | Swapdom signature: \`(parent, oldNodes, newNodes, end)\) |
| \`udomdiff\) | \`diffs/udomdiff\) | udomdiff signature: \`(parent, oldNodes, newNodes, api.udom, end)\) |
| \`domdiff\) | \`diffs/domdiff\) | domdiff engine |
| \`morphdom\) | \`diffs/morphdom\) | morphdom engine |
| \`nanomorph\) | \`diffs/nanomorph\) | nanomorph engine |
| \`rebuild\) | \`diffs/rebuild\) | Full-rebuild engine (simplest) |
| \`fast-array-diff\) | \`diffs/fast-array-diff\) | Fast array diff engine |

## Using a diff engine

\`\`\`js
import { api } from "uele";
import swapdom from "swapdom";

api.diff = swapdom;
\`\`\`

Or set \`api.udom\) to use the udomdiff signature:

\`\`\`js
import { api } from "uele";
import udomdiff from "udomdiff"

api.diff = udomdiff;
api.udom = true;
\`\`\`

The diff function receives \`(parent, oldNodes, newNodes, end)\) and must place \`newNodes\) before the \`end\) marker node.

## Custom diff engines

Any library matching the swapdom signature works. Set \`api.diff\) to your diff function — it receives \`(parentElement, oldNodesArray, newNodesArray, endMarkerNode)\) and should insert \`newNodes\) before \`endMarkerNode\) while removing nodes no longer in \`newNodes\).

---

> **Tip:** Keep the built-in diff engine unless you have a concrete reason (long keyed lists, or DOM state you must preserve). It has no dependencies and is the engine the conformance suite is written around.

---

> Next: [**Themes**](#/themes) — design tokens and \`ThemeProvider\)).
`;
