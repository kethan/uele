import {
  h, f, add, useLive, props, api, get, is, sub, r, dispose,
  lazy, If, Show, Match, Switch, Dynamic, For, map,
  type Child,
} from 'uele';
import * as lite from 'uele/lite';
import { jsx, jsxs, jsxDEV, jsxDev, Fragment, createElement } from 'uele/jsx-runtime';
import * as dev from 'uele/jsx-dev-runtime';

const input: HTMLInputElement = h('input', { value: 'hello' });
const svg: SVGSVGElement = h('svg', { viewBox: '0 0 10 10' });
const math: MathMLElement = h('math');
const fragment: Child[] = h(h, null, 'one', input);
h('div', ['shorthand', input]);
h('div', 0);
h('div', false);
h('div', null, () => 'function child');
const component = ({ name, children }: { name: string; children: Child[] }) => h('div', null, name, children);
h(component, { name: 'hello' });
// @ts-expect-error Component requires a name.
h(component, {});

const [nodes, set] = useLive(0);
set(1); set(previous => previous + 1);
// @ts-expect-error Updater must preserve the declared state type.
set('invalid');
const rendered: Node[] = add(nodes, null, false, 1n);
dispose(input);
props.set('validate', (node, value, name, attrs) => { node.setAttribute(name, String(value)); void attrs; });
const count = { value: 1, peek: () => 1 };
api.is = value => value?.peek;
api.get = value => value.value;
api.effect = callback => { callback(); return () => {}; };
api.cleanup = cleanup => cleanup?.();
api.any = () => (next, error, cleanup) => { next(1); void error; return () => cleanup?.(); };
api.diff = (parent, oldNodes, newNodes, end) => { void parent; void oldNodes; void newNodes; void end; };
api.udom = node => node;
const number: number = get(count);
const fnNumber: number = get(() => 3);
r(count, (value, reactive) => { const n: number = value; void n; void reactive; }, console.error, () => {});
sub(Promise.resolve('done'), value => { const s: string = value; void s; });
is(count);

const data = [{ id: 1, text: 'one' }];
map(data, (item, index) => h('li', null, item.text, index), 'empty', item => item.id);
For({ each: data, children: [(item, index) => h('li', null, item.text, index)], key: item => item.id });
const reactiveData = { value: data, peek: () => data };
map(reactiveData, item => item.text);
map(null, () => 'empty');
lazy(() => Promise.resolve({ default: ({ name }: { name: string }) => h('p', name) }))({ name: 'lazy' });
If({ when: true, children: [() => 'yes'] });
Show({ when: count, children: ['yes'] });
Match({ when: false, fallback: 'no', children: ['yes'] });
Switch({ children: [false, () => 'yes'], fallback: 'none' });
Dynamic({ component: ({ title }: { title: string }) => h('p', title), title: 'hello', children: [] });
f(h).button({ onClick() {} }, 'press');

lite.h('div', null, lite.useLive(0)[0]);
lite.add('text'); lite.props.clear(); lite.sub(Promise.resolve(1), () => {});
jsx('div', { children: 'child' }, 'key');
jsxs(Fragment, { children: ['a', 'b'] });
jsxDEV('div', { children: false }, undefined, false, { fileName: 'example.tsx' }, undefined);
jsxDev('div'); dev.jsxDEV('div'); createElement('div', null, 'classic');
const view = <main><input value="hello" /><><span>nested</span>{0}{false}</></main>;
const greeting = <component />; // lowercase custom intrinsic tag
void [input, svg, math, fragment, rendered, number, fnNumber, view, greeting];

// @ts-expect-error No runtime Suspense export exists.
import { Suspense } from 'uele';
// @ts-expect-error Lite has no control flow helpers.
import { For as LiteFor } from 'uele/lite';
// @ts-expect-error JSX runtime does not export the full library API.
import { lazy as jsxLazy } from 'uele/jsx-runtime';
// @ts-expect-error Symbols cannot be converted to DOM text.
add(Symbol('not-renderable'));
