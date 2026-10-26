export const title = "Hello World";

export const markdown = `
This page walks through the three ways to write uele elements: the
\`h()\` hyperscript function, tagged templates via \`f()\`, and JSX. All three
produce the exact same DOM.

## 1. The h() function

\`h(tag, props, ...children)\` creates a real element. Children can be
strings, numbers, nodes, arrays or anything reactive.

\`\`\`jsx live
import { h } from "uele";

document.body.append(
  h("main", { class: "app" },
    h("h1", null, "Hello, uele!"),
    h("p", null, "I was built with ", h("code", null, "h()")),
    h("button", {
      onClick: () => alert("hi from uele 👋"),
    }, "Say hello")
  )
);
\`\`\`

Notice there is no \`render()\` call and no virtual DOM: \`h("h1", ...)\`
returns an \`HTMLHeadingElement\` that you can append anywhere with the normal
DOM API.

## 2. The f() shorthand

\`f(h)\` returns a proxy where every property is an element factory, so you
can write elements as plain function calls without tag strings.

\`\`\`jsx live
import { h, f, useLive } from "uele";

const { main, h1, button, strong } = f(h);
const [count, setCount] = useLive(0);

document.body.append(
  main(
    [
      h1("Clicked ", strong(count), " times"),
      button({ onClick: () => setCount((c) => c + 1) }, "Click me"),
    ]
  )
);
\`\`\`

Pass children as an array and props as the first argument — custom elements
work too: \`f(h)["my-widget"]({ id: "x" })\`.

## 3. JSX

With the automatic JSX runtime configured (see **Installation**), JSX just
works. There is no \`h\` import and no compiler plugin beyond the standard
React JSX transform.

\`\`\`jsx live
import { h, useLive } from "uele";

const [name, setName] = useLive("stranger");

const App = () => (
  <main>
    <h1>Hello, {name}!</h1>
    <input
      placeholder="Type your name"
      onInput={(e) => setName(e.target.value || "stranger")}
    />
  </main>
);

document.body.append(<App />);
\`\`\`

Fragments are built in: \`<></>\` **is** the \`h\` function itself
(\`Fragment === h\`), so a fragment simply returns its children with no
wrapper element.

\`\`\`jsx live
import { h } from "uele";

document.body.append(
  <ul>
    <>
      <li>one</li>
      <li>two</li>
      <li>three</li>
    </>
  </ul>
);
\`\`\`

> **Tip:** every example in these docs is editable. Select the code, change
> it, and the preview re-runs automatically — try turning the heading above
> into an \`h2\`, or adding another input.

## Mounting

uele has no bespoke mount API. Because components return real nodes, you mount
them with the platform:

\`\`\`js
document.body.append(<App />);
document.querySelector("#root").replaceChildren(<App />);
\`\`\`

Up next: how to compose **components** and pass props.
`;
