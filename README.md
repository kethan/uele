# UEle

A Reactive frontend library.

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uele)

[![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uele)

**yarn**: `yarn add uele`

**npm**: `npm i uele`

**cdn**: https://unpkg.com/uele

**module**: https://unpkg.com/uele?module

-   **Small** less than 1000 bytes gzip.
-   **Fast**
-   **JSX**
-   **Fragment**
-   **Components**
-   **SVG**
-   **Refs**
-   **Style Maps**
-   **Reactive State**
-   **Automatic Derivation**
-   **Simple API**
-   **Lazy Components**
-   **Reactive Methods** (isO, unO, toO)
-   **Reactive Subscribe and UnSubscribe**
### Example

```jsx
import { h, o, effect, Fragment, lazy } from "uele";

const count = o(0);
const inc = () => count(count() + 1);
const dec = () => count(count() - 1);

const Counter = () => {
	let square = () => count() * count();
	let cube = () => square() * count();
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

const App = () => (
	<main>
		<Counter />
	</main>
);

document.body.append(<App />);
```

## Thanks and Inspiration

-   **[yuxinqi-chan](https://github.com/yuxinqi-chan/reactive-jsx-dom)**
-   **[bruh](https://github.com/Technical-Source/bruh)**
-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**

## License

MIT
