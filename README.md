# uEle

```jsx
import { h, r, effect } from "uele";

const counter = r(0);
const inc = () => counter.value++;
const dec = () => counter.value++;

const Counter = () => {
	effect(() => {
		console.log("counter", counter.value);
	});
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
