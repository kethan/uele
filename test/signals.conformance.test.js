/**
 * Signal-library conformance suite.
 *
 * The same feature matrix runs against ten reactivity libraries (ulive,
 * @preact/signals-core, @vue/reactivity, usignal, alien-signals, s-js, mobx,
 * rxjs, nanostores, @tanstack/store) for both entry points: the main `src`
 * build and the `lite` build (which uses its own `usub/tiny` api instance).
 *
 * Capabilities the libraries do not have are asserted explicitly instead of
 * being skipped silently, so the matrix itself documents the contract:
 *  - `reactiveThunks: false` (rxjs, nanostores, @tanstack/store) means the
 *    library has no effect runner, so `If`/`Switch`/`Dynamic`/component
 *    children render once and do not re-run on their own.
 *  - `initialEmission: false` (@tanstack/store) means the subscription does not
 *    emit the current value, so `add()`-style children start empty (but
 *    `map`/`For`/`If`, which read synchronously, still render the seed).
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as uele from '../src/index.js';
import * as lite from '../lite/index.js';
import { APIS, DEFAULT_API, ADAPTERS, install } from './helpers/signal-adapters.js';

const LIBS = [];
for (const make of ADAPTERS) LIBS.push(await make());

const host = () => {
	const root = document.createElement('div');
	document.body.append(root);
	return root;
};

/** the initial dom text for an `add()`-style child */
const seeded = (lib, expected) => (lib.initialEmission === false ? '' : expected);


for (const [label, mod, apiTarget] of [
	['main', uele, APIS.main],
	['lite', lite, APIS.lite]
]) {
	const full = label === 'main';

	for (const lib of LIBS) {
		describe(`${label}: ${lib.name}`, () => {
			let root;
			const { h, is, get, sub, useLive, add } = mod;

			beforeEach(() => {
				install(apiTarget, lib);
				root = host();
			});

			afterEach(() => {
				install(apiTarget, { overrides: DEFAULT_API });
				root.remove();
			});

			// ------------------------------------------------------- cells

			test('classifies its own cells as reactive and plain data as not', () => {
				const cell = lib.signal(1);
				expect(is(cell)).toBeTruthy();
				expect(get(cell)).toBe(1);
				expect(is(1)).toBeFalsy();
				expect(is(null)).toBeFalsy();
				expect(is(undefined)).toBeFalsy();
				expect(is('text')).toBeFalsy();
				expect(is(Symbol('s'))).toBeFalsy();
				expect(is(10n)).toBeFalsy();
				expect(get(42)).toBe(42);
				expect(get(() => 'thunk')).toBe('thunk');
			});

			// -------------------------------------------- elements and props

			test('renders and updates a reactive text child', () => {
				const cell = lib.signal('a');
				const el = h('p', null, cell);
				root.append(el);
				expect(el.textContent).toBe(seeded(lib, 'a'));
				lib.set(cell, 'b');
				expect(el.textContent).toBe('b');
				lib.set(cell, 7);
				expect(el.textContent).toBe('7');
			});

			test('renders and updates attributes, properties and removal', () => {
				const cell = lib.signal('a');
				const flag = lib.signal(true);
				const el = h('input', { value: cell, 'aria-label': cell, 'data-x': cell, disabled: flag });
				root.append(el);
				// property: `value` is reflected as a property, not an attribute
				lib.set(cell, 'b');
				expect(el.value).toBe('b');
				expect(el.hasAttribute('value')).toBe(false);
				// plain attributes: set, update and remove
				expect(el.getAttribute('aria-label')).toBe('b');
				expect(el.getAttribute('data-x')).toBe('b');
				lib.set(flag, false);
				expect(el.disabled).toBe(false);
				expect(el.hasAttribute('disabled')).toBe(false);
				lib.set(flag, true);
				expect(el.disabled).toBe(true);
				expect(el.hasAttribute('disabled')).toBe(true);
				lib.set(cell, null);
				expect(el.hasAttribute('aria-label')).toBe(false);
				expect(el.hasAttribute('data-x')).toBe(false);
			});

			test('renders and updates reactive style and class objects', () => {
				const color = lib.signal('red');
				const on = lib.signal(true);
				const el = h('div', { style: { color, '--x': color }, class: { on } });
				root.append(el);
				lib.set(color, 'blue');
				expect(el.style.color).toBe('blue');
				expect(el.style.getPropertyValue('--x')).toBe('blue');
				lib.set(on, false);
				expect(el.classList.contains('on')).toBe(false);
				lib.set(on, true);
				expect(el.classList.contains('on')).toBe(true);
				lib.set(color, null);
				expect(el.style.color).toBe('');
				expect(el.style.getPropertyValue('--x')).toBe('');
			});

			test('mixed plain and reactive children stay in order across updates', () => {
				const cell = lib.signal('X');
				root.append(...add('a', cell, 'c', 'd', cell));
				lib.set(cell, 'B');
				expect(root.textContent).toBe('aBcdB');
				lib.set(cell, 'Z');
				expect(root.textContent).toBe('aZcdZ');
				expect(root.textContent.length).toBe(5);
			});

			// ------------------------------------------------ live regions

			test('useLive renders, updates and supports functional updates', () => {
				const [nodes, set] = useLive(1);
				root.append(...nodes);
				expect(root.textContent).toBe('1');
				set(2);
				expect(root.textContent).toBe('2');
				set((v) => v + 1);
				expect(root.textContent).toBe('3');
				set((v) => v + 1);
				expect(root.textContent).toBe('4');
			});

			test('computed values recompute and propagate into the dom', () => {
				if (!lib.computed) return expect(lib.computed).toBeUndefined();
				const a = lib.signal(1);
				const b = lib.computed(a, (v) => v * 2);
				const el = h('div', null, b);
				root.append(el);
				expect(el.textContent).toBe(seeded(lib, '2'));
				lib.set(a, 5);
				expect(el.textContent).toBe('10');
				lib.set(a, 0);
				expect(el.textContent).toBe('0');
			});

			test('a subscription can be stopped and stops updating the dom', () => {
				const cell = lib.signal('a');
				const target = document.createElement('span');
				root.append(target);
				const stop = sub(cell, (value) => (target.textContent = String(value)));
				expect(target.textContent).toBe(seeded(lib, 'a'));
				lib.set(cell, 'b');
				expect(target.textContent).toBe('b');
				stop && stop();
				lib.set(cell, 'c');
				expect(target.textContent).toBe('b');
			});

			test('the teardown passed to sub() runs on dispose', () => {
				const cell = lib.signal('a');
				let disposed = 0;
				const stop = sub(cell, () => {}, undefined, () => disposed++);
				expect(disposed).toBe(0);
				stop && stop();
				// teardowns can run more than once (usub calls them through
				// api.cleanup *and* from its own disposer): keep them idempotent.
				// The lite core only calls them for api.effect-driven sources - a
				// source consumed through api.any keeps its own teardown.
				if (!full && lib.anyPath) expect(disposed).toBe(0);
				else expect(disposed).toBeGreaterThanOrEqual(1);
			});

			test('api.cleanup is offered the teardown while subscribing', () => {
				// usub prefers a `.subscribe` method when the library has one, and
				// only falls back to api.effect + api.cleanup for hook-based cells
				if (lib.subscribePath) return expect(lib.subscribePath).toBe(true);
				const cell = lib.signal('a');
				const seen = [];
				const previous = apiTarget.cleanup;
				apiTarget.cleanup = (fn) => {
					seen.push(fn);
					return previous?.(fn);
				};
				const stop = sub(cell, () => {});
				apiTarget.cleanup = previous;
				expect(seen).toHaveLength(1);
				stop && stop();
			});

			test('many rapid updates keep the region stable and ordered', () => {
				const cell = lib.signal(0);
				const [nodes] = useLive(cell);
				root.append(...nodes);
				const initial = root.childNodes.length;
				for (let i = 1; i <= 200; i++) lib.set(cell, i);
				expect(root.textContent).toBe('200');
				expect(root.childNodes.length).toBe(initial);
				expect(root.childNodes.length).toBe(initial);
			});

			test('nested live regions update independently', () => {
				const outer = lib.signal('o');
				const inner = lib.signal('i');
				const el = h('div', null, outer, h('span', null, inner));
				root.append(el);
				expect(el.querySelector('span').textContent).toBe(seeded(lib, 'i'));
				lib.set(inner, 'j');
				expect(el.querySelector('span').textContent).toBe('j');
				lib.set(outer, 'p');
				expect(el.textContent).toBe('pj');
				// the region's first child is its start marker, the text follows it
				expect(el.childNodes[1].textContent).toBe('p');
			});

			// ------------------------------------------ thunk components

			test('a thunk re-runs for signals read in its own body, never for its children', () => {
				const cell = lib.signal('a');
				let renders = 0;
				// the read happens in the thunk body, outside any child region
				const Inline = () => (renders++, h('u', null, lib.read(cell)));
				// the read happens inside a child region owned by the cell itself
				const Region = () => (renders++, h('i', null, cell));
				root.append(...add(() => Inline(), () => Region()));
				// inline reads are synchronous, so the value is rendered right away
				expect(root.querySelector('u').textContent).toBe('a');
				lib.set(cell, 'b');
				if (lib.reactiveThunks === false) {
					// no effect runner: neither body re-runs, the inline value stays
					expect(root.querySelector('u').textContent).toBe('a');
					expect(renders).toBe(2);
				} else {
					// only the inline read re-runs the body; the region thunk ran
					// once and its child region updated on its own - except for
					// libraries that attribute nested reads to the outer effect too
					expect(renders).toBe(lib.nestedReads === 'broadcast' ? 4 : 3);
					expect(root.querySelector('u').textContent).toBe('b');
				}
				// the child region is live in every library
				expect(root.querySelector('i').textContent).toBe('b');
			});

			if (full) {
				test('If renders the fallback and only re-runs when the library has effects', () => {
					const on = lib.signal(true);
					root.append(...add(uele.If({ when: on, children: ['yes'], fallback: uele.h('em', null, 'no') })));
					expect(root.textContent).toBe('yes');
					lib.set(on, false);
					expect(root.textContent).toBe(lib.reactiveThunks === false ? 'yes' : 'no');
					lib.set(on, true);
					expect(root.textContent).toBe('yes');
				});

				// ------------------------------------------- control flow

				test('For renders, reorders, grows, shrinks and clears with a reactive list', () => {
					const items = lib.signal(['a', 'b', 'c']);
					root.append(...uele.For({ each: items, children: [(item) => uele.h('i', null, item)] }));
					const html = () => [...root.querySelectorAll('i')].map((n) => n.textContent).join(',');
					expect(html()).toBe('a,b,c');
					lib.set(items, ['c', 'a']);
					expect(html()).toBe('c,a');
					lib.set(items, ['c', 'a', 'd', 'e']);
					expect(html()).toBe('c,a,d,e');
					lib.set(items, ['e']);
					expect(html()).toBe('e');
					lib.set(items, []);
					expect(html()).toBe('');
					lib.set(items, ['x', 'y']);
					expect(html()).toBe('x,y');
					expect(root.querySelectorAll('i').length).toBe(2);
				});

				test('map reuses keyed nodes across updates and falls back when empty', () => {
					const items = lib.signal([{ id: 1 }, { id: 2 }]);
					root.append(
						...uele.map(
							items,
							(item, i) => uele.h('b', { 'data-id': item.id, 'data-i': String(i) }, String(item.id)),
							'empty',
							(item) => item.id
						)
					);
					const first = [...root.querySelectorAll('b')];
					expect(first.map((n) => n.dataset.id)).toEqual(['1', '2']);
					lib.set(items, [{ id: 2 }, { id: 1 }]);
					const second = [...root.querySelectorAll('b')];
					expect(second.map((n) => n.dataset.id)).toEqual(['2', '1']);
					expect(second.filter((n) => first.includes(n)).length).toBe(2);
					lib.set(items, []);
					expect(root.querySelectorAll('b').length).toBe(0);
					expect(root.textContent).toBe('empty');
					lib.set(items, [{ id: 3 }]);
					expect(root.querySelectorAll('b').length).toBe(1);
				});

				test('Switch picks the first truthy branch', () => {
					root.append(...add(uele.Switch({ children: [() => '', () => 'two'], fallback: 'none' })));
					expect(root.textContent).toBe('two');
					root.replaceChildren();
					root.append(...add(uele.Switch({ children: [() => '', () => ''], fallback: 'none' })));
					expect(root.textContent).toBe('none');
				});

				test('Dynamic renders the component and swaps it when the region re-renders', () => {
					const cell = lib.signal('a');
					const A = ({ v }) => uele.h('u', null, v);
					const B = ({ v }) => uele.h('s', null, v);
					const [nodes, set] = uele.useLive(uele.Dynamic({ component: A, v: cell }));
					root.append(...nodes);
					expect(root.querySelector('u')).toBeTruthy();
					lib.set(cell, 'b');
					expect(root.querySelector('u').textContent).toBe('b');
					set(uele.Dynamic({ component: B, v: cell }));
					expect(root.querySelector('s')).toBeTruthy();
					expect(root.querySelector('u')).toBeFalsy();
					// the swapped region is live
					lib.set(cell, 'c');
					expect(root.querySelector('s').textContent).toBe('c');
				});

				test('props extension point receives live values', () => {
					const cell = lib.signal(1);
					const seen = [];
					uele.props.set('data-live', (node, value) => seen.push(value));
					root.append(uele.h('div', { 'data-live': cell }));
					lib.set(cell, 2);
					uele.props.delete('data-live');
					expect(seen.length).toBeGreaterThan(0);
				});
			}
		});
	}
}
