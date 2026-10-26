export const title = "Async & Lazy";

export const markdown = `
uele treats asynchronous values as first-class children. A promise, an async
iterable or an observable dropped into JSX becomes a **live region** that
updates itself when values arrive — no \`useEffect\`, no loading-state
boilerplate.

## Promises as children

A promise renders nothing until it resolves, then swaps in its value. Rejections
are left for you to handle (\`.catch\`), so rejected promises never crash the
tree:

\`\`\`jsx live
import { h } from "uele";

const delayed = new Promise((resolve) =>
  setTimeout(
    () => resolve(<p style={{ fontWeight: 700, color: "#17a673" }}>Loaded after 1.5 seconds 🎉</p>),
    1500
  )
);

document.body.append(
  <main>
    <h3>Promises render themselves</h3>
    <p style={{ color: "#6b6f7c" }}>Waiting for the promise…</p>
    {delayed}
  </main>
);
\`\`\`

## Async components

Because a component can return a promise, an \`async\` function is a valid
component — fetching data inside it is plain \`await\`:

\`\`\`jsx live
import { h } from "uele";

const loadUser = (id) =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve({ id, name: "Ada Lovelace", email: "ada@example.dev" }),
      1000
    )
  );

const UserCard = async ({ id }) => {
  const user = await loadUser(id);
  return (
    <article style={{ border: "1px solid #d8dae5", borderRadius: 10, padding: 16 }}>
      <h3 style={{ margin: 0 }}>{user.name}</h3>
      <p style={{ margin: "4px 0 0", color: "#6b6f7c" }}>{user.email}</p>
    </article>
  );
};

document.body.append(
  <main>
    <p>Fetching user…</p>
    <UserCard id={7} />
  </main>
);
\`\`\`

## Async iterables

An object implementing \`Symbol.asyncIterator\` streams a sequence of values
into the same region — each \`next()\` replaces the previous one:

\`\`\`jsx live
import { h } from "uele";

const ticker = {
  [Symbol.asyncIterator]() {
    let i = 1;
    return {
      next: () =>
        new Promise((done) =>
          setTimeout(
            () => done({ value: <p>Tick {i} of 5</p>, done: i++ > 5 }),
            600
          )
        ),
    };
  },
};

document.body.append(
  <main>
    <h3>AsyncIterable as a child</h3>
    {ticker}
  </main>
);
\`\`\`

## Observables

Anything with a \`subscribe\` method or \`Symbol.observable\` is recognised too.
Each emitted value replaces the region, and the subscription is disposed
automatically when the region is removed from the DOM.

\`\`\`jsx live
import { h } from "uele";

// a minimal observable: emits 0..4 on a timer, then completes
const clock = {
  subscribe(emit) {
    let n = 0;
    const id = setInterval(() => {
      emit(n++);
      if (n > 4) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  },
};

document.body.append(
  <main>
    <h3>Observable as a child</h3>
    <p>Seconds: {clock}</p>
  </main>
);
\`\`\`

## Lazy components

\`lazy(loader, fallback)\` defers loading a component until it is rendered. The
loader returns a promise of a module with a \`default\` export — exactly the
shape of dynamic \`import()\`. The fallback shows while loading or if the load
fails.

\`\`\`jsx live
import { h, lazy } from "uele";

// in a real app: lazy(() => import("./Greeter.jsx"), <p>Loading…</p>)
const loadGreeter = () =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve({
        default: ({ name }) => (
          <p style={{ fontWeight: 700, color: "#635bff" }}>
            Hello from a lazy component, {name} 👋
          </p>
        ),
      }),
      1200
    )
  );

const Greeter = lazy(loadGreeter, <p>Loading component…</p>);

document.body.append(
  <main>
    <h3>Lazy loading</h3>
    <Greeter name="world" />
  </main>
);
\`\`\`

## Cleanup is automatic

Every reactive child registers its subscription against the marker nodes of
its region. When a region replaces or discards nodes — a list filter, a route
change, an \`If\` flipping branches — uele runs the disposers of the removed
subtree. Removed content simply stops reacting; there is nothing to unsubscribe
by hand.
`;
