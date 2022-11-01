# UEle

A Reactive frontend library.

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uele)
[![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=brotli&label=brotli&style=flat-square)](https://unpkg.com/uele)
[![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uele)

**yarn**: `yarn add uele`

**npm**: `npm i uele`

**cdn**: https://unpkg.com/uele

**module**: https://unpkg.com/uele?module

- **Small** 1KB gzip.
- **Simple API**
- **Fast**
- **JSX**
- **Fragment**
- **Components**
- **SVG**
- **Refs**
- **Style Maps**
- **Lazy Components**
- **Promise**
- **AscynIterable**
- **Rxjs Subscribe**
- **Reactive Subscribe**
- **Control Flow Components** - If, For
- **Extend with any reactive library** - effect, memo, is, get

### h

```js
let frag = (
	<>
		{rxSubject} or {asyncIterable} or {promise} or {any html node or component}
	</>
);
```

### lazy

Load a component lazily with a optional fallback

```js
const LazyComp = lazy(() => import("./SomeComp"), <div>Failed</div>);
```

### Example

```jsx
import { h, Fragment, lazy, api, If, For } from "uele";
import { o, effect, memo } from "ulive";

api.effect = effect;
api.memo = memo;
api.is = (v) => v.$o;
api.get = (v) => v();

const LazyComp = lazy(() => import("./lazy"));

// Async Component
const TodoItem = async ({ id }) => {
  let api = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  let todo = await api.json();

  return (
    <li>
      <span>{todo.title}</span>
      <input type="checkbox" checked={todo.completed} />
    </li>
  );
};

const count = o(0);
const inc = () => count(count() + 1);
const dec = () => count(count() - 1);

const Counter = () => {
  let square = memo(() => count() * count());
  let cube = memo(() => square() * count());
  effect(() => console.log(count(), square(), cube()));
  return (
    <div>
      <div>
        Count: {count} {square} {cube}
      </div>
      <button onclick={inc}>+</button>
      <button onclick={dec}>-</button>
    </div>
  );
};

// AsyncIterator

const asyncIterable = {
  [Symbol.asyncIterator]() {
    return {
      i: 0,
      next() {
        if (this.i < 200)
          return new Promise((ok) =>
            setTimeout(
              () =>
                ok({
                  value: <div>{this.i++}</div>,
                  done: false,
                }),
              10
            )
          );
        return new Promise((ok) => ok({ done: true }));
      },
    };
  },
};

const App = () => (
  <main>
    <Counter />
    <LazyComp />
    <TodoItem />
    {asyncIterable}
    <svg>...</svg>
  </main>
);

document.body.append(<App />);
```

## Thanks and Inspiration

- **[bruh](https://github.com/Technical-Source/bruh)**
- **[dy](https://github.com/dy)**

## License

MIT
