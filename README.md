# UEle

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive)
![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=gzip&label=gzip&style=flat-square)

**npm**: `npm i uele`

**npm**: `yarn add uele`

**cdn**: https://unpkg.com/uele  

**module**: https://unpkg.com/ulive?module

-   **Small** less than 1KB bytes gzip.
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

### Example
```jsx
import { h, r, effect, Fragment } from "uele";

const counter = r(0);
const inc = () => counter.value++;
const dec = () => counter.value--;

const Counter = () => {
	effect(() => console.log("counter", counter.value));
	return (
		<div>
			<div>Counter: {counter}</div>
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

## Thanks and inspiration

-   **[yuxinqi-chan](https://github.com/yuxinqi-chan/reactive-jsx-dom)**
-   **[bruh](https://github.com/Technical-Source/bruh)**
-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**

## License

MIT
