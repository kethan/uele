import { h, Fragment, effect, o } from './src';
const React = {
    createElement: h,
    Fragment
};
const count = o(0);
const inc = () => count(count() + 1);
const dec = () => count(count() - 1);

const Counter = () => {
    effect(() => console.log("count", count()));
    const square = effect(() => count() * count());
    const cube = effect(() => square() * count());
    return (
        <div>
            <div>Count: {count} {square} {cube}</div>
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