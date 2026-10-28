# Optional app props

```js
import { useProps } from 'uele/props';
useProps(); // before creating elements; requires no extra dependency
// For lite: import * as lite from 'uele/lite'; useProps(lite);
```

Install your signal adapter first. The installer adds handlers to the target renderer's
`props` map and returns that target. Reinstallation overwrites these names; unrelated
custom handlers are preserved. Nothing is installed by importing the module alone.

| Prop | Value | Behavior |
| --- | --- | --- |
| `show` | boolean or reactive boolean | Sets `hidden` to the inverse; preserves the node and its state |
| `text` | string/number/null or reactive value | Safe `textContent`, never HTML; null clears |
| `data` | object of values/reactive values | `userId` becomes `data-user-id`; null removes |
| `aria` | object of values/reactive values | `busy` becomes `aria-busy`; false is the string `"false"`, null removes |
| `bindValue` | `[source, write]` | Source → value; input → `write(string, event)`; ignores IME composing events |
| `bindChecked` | `[source, write]` | Source → checked; change → `write(boolean, event)` |
| `listen` | event map | Function/object listener, or `[listener, options]`; preserves event-name case |
| `use` | action or action array | Calls each `(node) => cleanup`; cleanup is optional |

`data` and `aria` objects are static shapes whose individual values can be reactive.
Do not include the `data-`/`aria-` prefix in their keys. `listen` and `use` are setup-time
configuration, not reactive maps. Listener options support capture, passive, once and signal.
`bindValue` is intended for input/textarea and uses strings (number parsing belongs in your
writer); use `bindSelect` for selects. Never bind a file input's value.

Use `text` only on a leaf without children: it owns and replaces the entire content.
Do not combine `show` with a separate `hidden` binding, or model props with another binding
for the same DOM property. `show` relies on the browser's hidden styling; do not override it
with CSS that forces display. It is not an authorization boundary.

Subscriptions, listeners and action disposers are cleaned up when a uele live region
removes the element or an ancestor. Reusing/moving a surviving node does not dispose it.
Manual `element.remove()` does not invoke uele's teardown registry. Actions should return
cleanup for timers, observers, document listeners and WebSocket subscriptions they own.

See [the live composer example](../examples/live-props.jsx) for bindings, presence,
connection status and a disposable heartbeat. It simulates a connection; it does not
open a real server connection.

Custom `props` handlers can now return a cleanup function; the renderer registers it
with the same region teardown mechanism. Existing handlers returning nothing still work.

## Selects and tri-state checkboxes

- `bindSelect={[source, write]}` listens to `change`. A single select reads/writes a
  string; a `multiple` select reads an array and writes string arrays in option order.
  Numeric source entries are converted to strings to match native option values.
  Null clears a single selection to `''` (or no selection if there is no empty option).
- `multiple` is a static mode; set it on creation, not reactively. Options must exist
  when the binding runs. Dynamically replacing options does not automatically reapply
  an unchanged source; update the source after changing options or recreate the select.
- `indeterminate` is a boolean/reactive boolean DOM property, independent of `checked`.
  Combine it with `bindChecked` for select-all tables. Native clicks clear indeterminate;
  your derived source should update as the selection changes.

See [SelectionForm](../examples/selection-props.jsx) for both select modes and a
working select-all checkbox.

## Chat auto-scroll action

```jsx
import { autoScroll } from 'uele/props';

<div style={{ maxHeight: '20rem', overflowY: 'auto' }} use={autoScroll({ threshold: 48 })}>
  {messages}
</div>
```

The action starts following on mount. A scroll event pauses following when the reader
is more than `threshold` pixels from the bottom; scrolling near the bottom resumes it.
It observes child/text mutations and viewport resize, and handles descendant image load
events. Updates are coalesced in a microtask and canceled on disposal. No smooth scrolling
or forced focus changes. Requires a browser with MutationObserver; ResizeObserver is optional.
Changes to content height caused only by CSS/fonts are not observed automatically.

The [live composer](../examples/live-props.jsx) includes a bounded message preview using
this action. As with all `use` actions, remove it through a uele region to trigger cleanup.
