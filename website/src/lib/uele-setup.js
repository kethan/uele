// The docs chrome needs two element props the library leaves to apps:
// `html` (set innerHTML, used by highlighted code blocks) and `dataset`
// (data-* bags). Registering them through uele's own props registry is also
// a live demonstration of the extension point documented on the Events page.
import { props } from "./uele.js";

props.set("html", (el, value) => {
  el.innerHTML = value == null ? "" : String(value);
});

props.set("dataset", (el, value) => {
  if (value && typeof value === "object") Object.assign(el.dataset, value);
});
