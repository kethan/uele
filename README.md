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
-   **Reactive Methods** (isR, unR, toR)
-   **Reactive Subscribe and UnSubscribe**

### Example

```jsx
import { h, r, effect, Fragment, lazy } from "uele";

const count = r(0);
const inc = () => count.value++;
const dec = () => count.value--;

const Counter = () => {
	effect(() => console.log("count", count.value));
	const mul = effect(() => count.value * 2);
	return (
		<div>
			<div>
				Count: {counter} {mul}
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
