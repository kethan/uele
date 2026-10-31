# Routing

`uele/router` works with the main renderer's configured signal preset. Its
built-in `createRouter()` needs no additional routing package.

## Basic app

Use an automatic JSX transform with `jsxImportSource: "uele"`:

```jsx
/** @jsxImportSource uele */
import { createRouter, Router, Link } from 'uele/router';
import { preactSignals } from 'uele/signals/preact';

preactSignals();

const Page = ({ title }) => (
  <section>
    <nav>
      <Link to="/">Home</Link>
      {' | '}
      <Link to="/user/42">A user</Link>
    </nav>
    <h1>{title}</h1>
  </section>
);

const routes = createRouter();
routes.get('/', () => <Page title="Home" />);
routes.get('/user/:id', ({ params }) => (
  <Page title={`User ${params.id}`} />
));

document.body.append(
  <Router app={routes} notFound={<p>Page not found</p>} />
);
```

Links are inside the Router's rendered view, so its handlers intercept ordinary
in-app clicks. External links, modifier clicks, and `target="_blank"` retain
normal browser behavior. Serve the app at `/`; configure your deployment's
history fallback so direct requests to nested routes load the app too.

## Route context

Handlers receive `{ params, query, path, url, request }`. Use `params.id` for a
`:id` segment and `query` for parsed query-string values. `createRouter()` also
supports wildcards. A custom router can be used instead if it exposes
`fetch(Request)` and returns a renderable value or a promise of one.

## Programmatic navigation and custom shells

- Module-level `navigate(path)` updates browser history and notifies routers.
- `useRouter(app)` returns **an object**, not an array:
  `{ view, props, navigate, dispose }`.
- Render `view` as a child and spread `props` onto the element containing your
  links. The returned `navigate` resolves that view; it does not push history.
- The hook's `dispose()` is terminal and idempotent. Custom shells must attach
  it to their actual renderer-owned lifecycle. Pending responses cannot overwrite
  newer navigation or update an already-disposed router.
- `<Router>` manages that hook disposal when its enclosing uele region removes
  it. Native `element.remove()` alone is not an ownership/teardown signal.

See [the public types](../router/index.d.ts) and
[the routing behavior tests](../test/flow.test.jsx). For custom lifecycle
integration, read [the props guide](PROPS.md) and
[renderer ownership](../core/README.md) rather than adding a global observer.
