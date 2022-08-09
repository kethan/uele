import { h, Fragment, effect, r } from './src';
const React = {
    createElement: h,
    Fragment
};
const count = r(0);
const inc = () => count.value++;
const dec = () => count.value--;

const Counter = () => {
    effect(() => console.log("count", count.value));
    const mul = effect(() => count.value * 2);
    return (
        <div>
            <div>Count: {count} {mul}</div>
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

document.body.append(<App />)