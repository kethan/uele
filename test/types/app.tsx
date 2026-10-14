/**
 * Type level contract of the public API. Compiled by `npm run test:types`.
 * (The published tarball types are verified separately by `npm run test:pack`.)
 */
import { h, f, r, is, get, sub, add, api, props, useLive, map, For, If, Show, Match, Switch, Dynamic, lazy } from 'uele';
import type { Child, Element, Factory, Fragment, Component, Props } from 'uele';
import { h as liteH, add as liteAdd, useLive as liteUseLive } from 'uele/lite';

// ---------------------------------------------------------------- h / elements
const div: HTMLDivElement = h('div', { id: 'a' }, 'text');
const input: HTMLInputElement = h('input', { type: 'text', value: 'v' });
const generic: HTMLElement = h('my-tag', { 'data-x': 1 });
const frag: Child = h(({ children }: Props) => children, { children: 'x' });
const nodeChild: Node = document.createElement('div');
const withNode: HTMLDivElement = h('div', nodeChild, [nodeChild, 'text'], 1, true, null, undefined);

// ------------------------------------------------------------------ components
const Card = ({ id, children }: { id: string; children: Child }) => h('div', { id }, children);
const card: Child = h(Card, { id: 'c' }, 'body');
const factory: Factory<{ id: string }> = ({ id }) => h('div', { id });
const FactoryCard: Component<{ id: string }> = factory;

// tag factories
const { div: divTag, button } = f(h);
const madeByF: HTMLElement = divTag({ id: 'a' }, 'x');
const madeButton: HTMLElement = button('go');

// ---------------------------------------------------------------- control flow
const cond: boolean = true;
const ifNode: Child = If({ when: cond, fallback: h('i', null, 'no'), children: [h('b', null, 'yes')] });
const showNode: Child = Show({ when: cond, children: [() => h('b', null, 'yes')] });
const matchNode: Child = Match({ when: cond, children: ['x'] });
const switchNode: Child = Switch({ fallback: 'none', children: [If({ when: cond, children: ['a'] })] });
const forNode: Child = For({ each: [1, 2, 3], key: (v: number, i: number) => i, children: [(v, i) => h('li', null, v + i)] });
const mapNode: Child = map([1, 2], (v, i) => h('li', null, v + i), h('li', null, 'none'), (v) => v);
const dynNode: Child = Dynamic({ component: Card, id: 'd', children: 'k' });
const lazyNode: Child = lazy(() => Promise.resolve({ default: () => h('b', null, 'lazy') }), 'loading')({});

// --------------------------------------------------------------- dom utilities
const nodes: Node[] = add('a', 1, [div], nodeChild, Promise.resolve('p'));
const [live, setLive] = useLive(0);
const liveNodes: Node[] = live;
setLive(1);
setLive((prev: number) => prev + 1);
const liteNode: HTMLElement = liteH('div', { id: 'l' }, 'lite');
const liteNodes: Node[] = liteAdd('x');
const [liteLive] = liteUseLive('a');

// ------------------------------------------------------------------- reactivity
props.set('upper', (node, value, name, attrs) => { node; value; name; attrs; });
const off = r(0, (value, reactive) => { value; reactive; });
const off2: void | (() => void) = r(0, () => { }, (err) => err);
const unsub = sub({}, () => { }, (err) => err, () => { });
const reactive: boolean = is({});
const value: number = get(1);
api.effect = (fn) => fn();
api.cleanup = (fn) => fn();
api.any = (target) => (next) => { target; next; return () => { }; };
api.is = (v) => !!v;
api.get = (v) => v;
api.diff = (parent, oldNodes, newNodes, getOrEnd, before) => { parent; oldNodes; newNodes; getOrEnd; before; };
api.udom = (node, index, end) => { node; index; end; return node; };

// ------------------------------------------------------------------------ jsx
const jsxNode = <div id="jsx" style={{ color: 'red' }} class={{ on: cond }}>{liveNodes}<span>x</span></div>;
const jsxComponent = <Card id="c">body</Card>;
const jsxFragment = <><i>1</i><b>2</b></>;
const jsxList = <ul>{[1, 2].map((i) => <li key={i}>{i}</li>)}</ul>;
const jsxControl = (
	<main>
		<If when={cond} fallback={<b>no</b>}><i>yes</i></If>
		<For each={[1, 2]}>{(item: number) => <li>{item}</li>}</For>
		{map([1], (v: number) => <li>{v}</li>)}
		<Dynamic component={Card} id="d">child</Dynamic>
	</main>
);
const jsxSvgs = <svg width={10}><circle cx={1} /></svg>;
const refCb = (node: Element<Child> | Node) => node;

export {
	div, input, generic, frag, withNode, card, FactoryCard, madeByF, madeButton, ifNode, showNode, matchNode,
	switchNode, forNode, mapNode, dynNode, lazyNode, nodes, liveNodes, liteNode, liteNodes, liteLive, off, off2,
	unsub, reactive, value, jsxNode, jsxComponent, jsxFragment, jsxList, jsxControl, jsxSvgs, refCb
};
