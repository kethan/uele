# Advanced authoring

Start with the [README](../README.md) and existing presets. This guide is for
custom prop handlers and renderer integrations, not required app setup.

## Custom prop handlers

`props` is a Map of element-property handlers. A handler receives the raw value
and may return a disposer. The renderer owns that disposer when it removes the
node. Use `r()` to accept a plain value, signal, or another supported source:

```js
import { r, props } from 'uele';

export const tooltip = () => {
  props.set('tooltip', (node, value) =>
    r(value, text => {
      node.title = text == null ? '' : text;
    })
  );
  return () => props.delete('tooltip');
};
```

Install before creating elements. Removing the handler affects future elements;
it does not retroactively dispose existing bindings. Handlers run while the
element is being built, before it is necessarily attached to the document.

[Application prop recipes](PROPS.md) cover bindings, event options and actions.

## Signal adapters

An adapter connects a real library's APIs to uele; it does not implement a new
signal engine. Use [the Preact adapter](../signals/preact.js) as an executable
starting point and [the adapter guide](ADAPTERS.md) for the full contract.

- Native recognition and reads: `is`, `get`.
- Effect ownership: `effect`, `cleanup`.
- Portable authoring: `signal`, `computed`, `set`, `batch`, `untracked`.
- Optional source handling: `any`.

The shipped presets use `scoped`, `install` and `HOOKS` from
[`signals/internal.js`](../signals/internal.js). That is an internal source
helper, **not** an importable `uele/signals/internal` package entry.

Use the library's real constructors and effect runner. Do not copy recipes with
placeholder `Cell` or `myEffect` definitions into an application. Install once
before rendering; existing state is not migrated when you switch libraries.

## Custom diff engines

Diffs operate on an existing bounded region. This minimal implementation removes
old nodes that are not reused, then puts the new nodes before the end marker:

```js
import { api } from 'uele';

export const myDiff = (target = api) => {
  target.diff = (parent, oldNodes, newNodes, end) => {
    const keep = new Set(newNodes);
    oldNodes.forEach(node => {
      if (!keep.has(node) && node.parentNode === parent) {
        parent.removeChild(node);
      }
    });

    let anchor = end;
    for (let i = newNodes.length - 1; i >= 0; i--) {
      const node = newNodes[i];
      if (node.parentNode !== parent || node.nextSibling !== anchor) {
        parent.insertBefore(node, anchor);
      }
      anchor = node;
    }
  };
  return target;
};
```

The renderer calls the same four-argument contract for every engine. Preserve
markers and static siblings, remove discarded nodes, and leave the requested
nodes exactly once, in order, before `end`. The return value is ignored. The
renderer snapshots actual DOM before the next replacement; engines do not need
to write survivors back to an old array.

Internal morphing helpers are not public package entries. See
[the diff adapter contract](ADAPTERS.md#3-a-diff-engine-preset) before writing
an in-place morpher.

## Test an integration

- Add a signal adapter to [the signal matrix](../test/helpers/signal-adapters.js).
- Add a diff adapter to [the diff matrix](../test/helpers/diff-engines.js).
- Run the [authoring contract fixtures](../test/authoring.test.jsx), conformance,
  ownership, transition, and release suites.
- Follow [the adapter checklist](ADAPTERS.md#7-checklist).

For explicit teardown, see [the UStor teardown example](../examples/ustor/README.md#how-unmounting-works)
and [the flow ownership/stress guide](FLOW-TESTING.md). Arbitrary native DOM
removal is not renderer-owned teardown.
