import { api, h, add, props, r, useLive } from 'uele/core';
import { map } from 'uele';
import { For, If } from 'uele/flow';
import * as core from 'uele/core';
api.is = value => typeof value === 'function';
api.get = value => typeof value === 'function' ? value() : value;
api.sub = (value, next) => { next(api.get(value)); return () => {}; };
api.ns = tag => tag === 'svg' ? 'http://www.w3.org/2000/svg' : null;
h('div', { title: 'hello' }, 'world');
useLive(add('hello'));
r('plain', (value, reactive) => {});
props.set('children', (node, value) => { node.appendChild(document.createTextNode(String(value))); });
For({ each: [1, 2], children: value => h('b', null, value) });
If({ when: true, children: 'yes' });
map([1, 2], value => h('b', null, value));
// @ts-expect-error Standalone wrapper exports were deliberately removed.
core.is(1);
// @ts-expect-error Use api.get rather than a frozen standalone wrapper.
core.get(1);
// @ts-expect-error Subscription installation is optional and lives on api.
core.sub(1, () => {});
