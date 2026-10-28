import { expect, test } from 'vitest';
import * as main from '../src/index.js';
import * as lite from '../lite/index.js';

// isObject rejects all booleans/nullish values, so isNode does not need a
// separate isFalsey check. Keep shorthand-child and attribute dispatch identical.
for (const [name, make] of [
	['undefined', () => undefined], ['null', () => null],
	['false', () => false], ['true', () => true],
	['zero', () => 0], ['number', () => 42], ['bigint', () => 42n],
	['empty string', () => ''], ['string', () => 'hello'],
	['symbol', () => Symbol.for('child')],
	['empty array', () => []], ['nested array', () => ['a', ['b']]],
	['attributes', () => ({ title: 'label', 'data-id': '1' })],
	['null-prototype attributes', () => Object.assign(Object.create(null), { title: 'label' })],
	['element', () => document.createElement('b')],
	['text node', () => document.createTextNode('hello')],
	['comment', () => document.createComment('marker')]
]) {
	test(`lite shorthand dispatch matches main for ${name}`, () => {
		expect(lite.h('div', make()).outerHTML).toBe(main.h('div', make()).outerHTML);
	});
}

test('lite extension props still register and dispatch with the empty Map constructor', () => {
	const name = 'size-test-prop';
	const old = lite.props.get(name);
	try {
		lite.props.set(name, (node, value) => { node.title = value; });
		expect(lite.h('div', { [name]: 'works' }).title).toBe('works');
	} finally {
		if (old) lite.props.set(name, old);
		else lite.props.delete(name);
	}
});
