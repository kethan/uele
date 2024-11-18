/**
 * @vitest-environment jsdom
 */

import { add, api } from '../src/index.js'; // Adjust the path as per your project structure
import { expect, test } from 'vitest';
import { signal, effect } from 'ulive'; // Adjust based on your signal library

// Set up API as per your code
api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

const node = (...nodes) => {
  const result = document.createElement('div');
  result.append(...add(...nodes))
  return result.childNodes;
}


test('add handles plain text nodes', () => {
  const result = add('Hello, World!');
  expect(result.length).toBe(1);
  expect(result[0].nodeType).toBe(Node.TEXT_NODE);
  expect(result[0].nodeValue).toBe('Hello, World!');
});

test('add handles multiple plain text nodes', () => {
  const result = add('Hello', 'World');
  expect(result.length).toBe(2);
  expect(result[0].nodeType).toBe(Node.TEXT_NODE);
  expect(result[0].nodeValue).toBe('Hello');
  expect(result[1].nodeValue).toBe('World');
});

test('add handles nested arrays of children', () => {
  const result = add(['Hello', ['World', ['!']]]);
  expect(result.length).toBe(3);
  expect(result[0].nodeValue).toBe('Hello');
  expect(result[1].nodeValue).toBe('World');
  expect(result[2].nodeValue).toBe('!');
});

test('add handles DOM nodes', () => {
  const div = document.createElement('div');
  const span = document.createElement('span');

  const result = add(div, span);
  expect(result.length).toBe(2);
  expect(result[0]).toBe(div);
  expect(result[1]).toBe(span);
});

test('add handles signals (reactive values)', async () => {
  const textSignal = signal('Dynamic Text');
  const result = node(add(textSignal));

  expect(result.length).toBeGreaterThanOrEqual(3);

  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('Dynamic Text');

  // Update signal value
  textSignal.value = 'Updated Text';
  expect(result[1].nodeValue).toBe('Updated Text');
});

test('add handles mixed DOM nodes and plain text', () => {
  const div = document.createElement('div');
  const result = node(...add(div, 'Hello'))

  expect(result.length).toBe(2);
  expect(result[0]).toBe(div);
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('Hello');
});

test('add handles boolean values by converting them to comments', () => {
  const result = node(add(true, false));
  expect(result.length).toBe(2);
  expect(result[0].nodeType).toBe(Node.COMMENT_NODE);
  expect(result[0].nodeValue).toBe('true');
  expect(result[1].nodeType).toBe(Node.COMMENT_NODE);
  expect(result[1].nodeValue).toBe('false');
});

test('add handles null and undefined values by skipping them', () => {
  const result = node(add(null, undefined, 'Valid Node'));
  expect(result.length).toBe(3);
  expect(result[2].nodeValue).toBe('Valid Node');
});

test('add handles reactive arrays', () => {
  const items = signal(['Item 1', 'Item 2']);
  const result = node(add(items));

  expect(result.length).toBe(4);
  expect(result[1].nodeValue).toBe('Item 1');
  expect(result[2].nodeValue).toBe('Item 2');

  // Update the reactive array
  items.value = ['Updated Item 1', 'Updated Item 2', 'Item 3'];
  expect(result.length).toBe(5);
  expect(result[1].nodeValue).toBe('Updated Item 1');
  expect(result[2].nodeValue).toBe('Updated Item 2');
  expect(result[3].nodeValue).toBe('Item 3');
});

test('add handles nested signals', () => {
  const nestedSignal = signal(signal('Nested Signal'));
  const result = node(add(nestedSignal));

  expect(result.length).toBe(3);
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('Nested Signal');

  // Update inner signal
  nestedSignal.value.value = 'Updated Nested Signal';
  expect(result[1].nodeValue).toBe('Updated Nested Signal');
});

test('add handles multiple signals as children', () => {
  const signal1 = signal('First');
  const signal2 = signal('Second');
  const result = node(add(signal1, signal2));

  expect(result.length).toBe(6);
  expect(result[1].nodeValue).toBe('First');
  expect(result[4].nodeValue).toBe('Second');

  // Update signals
  signal1.value = 'Updated First';
  signal2.value = 'Updated Second';

  expect(result[1].nodeValue).toBe('Updated First');
  expect(result[4].nodeValue).toBe('Updated Second');
});

test('add handles empty input gracefully', () => {
  const result = add();
  expect(result.length).toBe(0);
});

test('add handles deeply nested children with signals', () => {
  const items = signal(['Item A', ['Item B', signal('Item C')]]);
  const result = node(add(items));

  expect(result.length).toBe(7);
  expect(result[1].nodeValue).toBe('Item A');
  expect(result[2].nodeValue).toBe('Item B');
  expect(result[4].nodeValue).toBe('Item C');

  // Update nested signal
  items.value[1][1].value = 'Updated Item C';
  expect(result[4].nodeValue).toBe('Updated Item C');
});

test('add handles mixed static text and reactive signals', async () => {
  const staticText = 'Static Text';
  const signalText = signal('Reactive Text');
  const result = node(add(staticText, signalText));

  expect(result.length).toBe(4);
  expect(result[0].nodeValue).toBe('Static Text');
  expect(result[2].nodeValue).toBe('Reactive Text');

  // Update the reactive signal
  signalText.value = 'Updated Reactive Text';

  expect(result[2].nodeValue).toBe('Updated Reactive Text');
});


test('add handles empty arrays as children', () => {
  const result = node(add([])); // Empty array
  expect(result.length).toBe(0); // Should be an empty NodeList
});

test('add handles arrays of text mixed with DOM nodes', () => {
  const div = document.createElement('div');
  const textArray = ['Text 1', 'Text 2'];
  const result = node(add(div, textArray));

  expect(result.length).toBe(3); // One DOM node and two text nodes
  expect(result[0]).toBe(div);
  expect(result[1].nodeValue).toBe('Text 1');
  expect(result[2].nodeValue).toBe('Text 2');
});

test('add handles boolean, null, and undefined values in a mixed input', () => {
  const div = document.createElement('div');
  const result = node(add(div, true, null, undefined, 'Text Node'));

  expect(result.length).toBe(5); // One DOM node and one text node
  expect(result[0]).toBe(div);
  expect(result[1].nodeType).toBe(Node.COMMENT_NODE); // True becomes a comment
  expect(result[1].nodeValue).toBe('true');
  expect(result[2].nodeType).toBe(Node.COMMENT_NODE); // True becomes a comment
  expect(result[2].nodeValue).toBe('null');
  expect(result[3].nodeType).toBe(Node.COMMENT_NODE); // True becomes a comment
  expect(result[3].nodeValue).toBe('undefined');
  expect(result[4].nodeType).toBe(Node.TEXT_NODE); // Should be the text node
  expect(result[4].nodeValue).toBe('Text Node');
});


test('add handles DOM nodes inside arrays', () => {
  const div = document.createElement('div');
  const span = document.createElement('span');
  const result = node(add([div, [span]])); // Nested DOM nodes in array

  expect(result.length).toBe(2);
  expect(result[0]).toBe(div);
  expect(result[1]).toBe(span);
});

// test('add handles circular references in arrays gracefully', () => {
//   const arr = [];
//   arr.push(arr); // Circular reference

//   const result = node(add(arr));
//   expect(result.length).toBe(0); // Should return nothing, as circular arrays can't be processed
// });

test('add handles signals with mixed type arrays', async () => {
  const mixedSignal = signal(['Hello', 42, document.createElement('div')]);
  const result = node(add(mixedSignal));

  expect(result.length).toBe(5);
  expect(result[1].nodeValue).toBe('Hello');
  expect(result[2].nodeValue).toBe('42');
  expect(result[3].nodeName).toBe('DIV');

  // Update signal
  mixedSignal.value = ['Updated Text', 100];
  await new Promise(resolve => setImmediate(resolve));

  expect(result[1].nodeValue).toBe('Updated Text');
  expect(result[2].nodeValue).toBe('100');
});

test('add handles large number of nodes', () => {
  const nodes = Array(1000).fill('Test').map(() => document.createElement('div'));
  const result = node(add(...nodes));
  expect(result.length).toBe(1000); // Should return 1000 div elements
});

test('add handles multiple interdependent signals', async () => {
  const signal1 = signal('First');
  const signal2 = signal(signal1);
  const result = node(add(signal2));

  expect(result.length).toBe(3);
  expect(result[1].nodeValue).toBe('First');

  // Update signal1
  signal1.value = 'Updated First';

  expect(result[1].nodeValue).toBe('Updated First');
});

test('add handles null or undefined signals gracefully', () => {
  const nullSignal = signal(null);
  const undefinedSignal = signal(undefined);
  const result = node(add(nullSignal, undefinedSignal));

  expect(result.length).toBe(6);
});

test('add handles text nodes with special characters', () => {
  const result = node(add('<div>', 'Text & More', '<span>'));

  expect(result.length).toBe(3);
  expect(result[0].nodeValue).toBe('<div>');
  expect(result[1].nodeValue).toBe('Text & More');
  expect(result[2].nodeValue).toBe('<span>');
});

test('add handles dynamically removed nodes from signals', async () => {
  const signalList = signal([document.createElement('div'), document.createElement('span')]);
  const result = node(add(signalList));

  expect(result.length).toBe(4);
  expect(result[1].nodeName).toBe('DIV');
  expect(result[2].nodeName).toBe('SPAN');

  // Update signal (remove div)
  signalList.value = [document.createElement('span')];
  await new Promise(resolve => setImmediate(resolve));

  expect(result.length).toBe(3);
  expect(result[1].nodeName).toBe('SPAN');
});

test('add handles arrays containing reactive signals inside arrays', async () => {
  const nestedSignal = signal(['Item 1', signal('Nested Item')]);
  const result = node(add(nestedSignal));

  expect(result.length).toBe(6);
  expect(result[1].nodeValue).toBe('Item 1');
  expect(result[3].nodeType).toBe(Node.TEXT_NODE);
  expect(result[3].nodeValue).toBe('Nested Item');

  // Update nested signal
  nestedSignal.value[1].value = 'Updated Nested Item';

  expect(result[3].nodeValue).toBe('Updated Nested Item');
});

// test('add handles signals with complex objects (e.g., objects with methods)', async () => {
//   const complexSignal = signal({
//     text: 'Initial Text',
//     method: () => 'Method Call'
//   });

//   const result = node(add(complexSignal));

//   expect(result[1].nodeValue).toBe('Initial Text');

//   // Simulate method call update
//   complexSignal.value.text = complexSignal.value.method();

//   expect(result[1].nodeValue).toBe('Method Call');
// });

test('add handles multiple interdependent signals', async () => {
  const signal1 = signal('Initial Value');
  const signal2 = signal(signal1);
  const signal3 = signal(signal2);

  const result = node(add(signal3));

  expect(result[1].nodeValue).toBe('Initial Value');

  // Update signal1
  signal1.value = 'Updated Value';

  expect(result[1].nodeValue).toBe('Updated Value');
});

test('add handles promises that resolve to text', async () => {
  const promise = Promise.resolve('Resolved Text');
  const result = node(add(promise));

  // Initially, there should be a placeholder comment node
  expect(result.length).toBe(3);

  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('');

  // Wait for the promise to resolve
  await promise;

  // Check that the comment node is replaced by the resolved text
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('Resolved Text');
});

test('add handles promises that resolve to DOM nodes', async () => {
  const div = document.createElement('div');
  div.textContent = 'Promise Content';

  const promise = Promise.resolve(div);
  const result = node(add(promise));

  // Initially, there should be a placeholder comment node
  expect(result.length).toBe(3);
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('');

  // Wait for the promise to resolve
  await promise;

  // Check that the comment node is replaced by the resolved DOM node
  expect(result.length).toBe(3);
  expect(result[1]).toBe(div);
  expect(result[1].textContent).toBe('Promise Content');
});

test('add handles promises that resolve to mixed content', async () => {
  const promise = Promise.resolve(['Text', document.createElement('span')]);
  const result = node(add(promise));

  // Initially, there should be a placeholder comment node
  expect(result.length).toBe(3);
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('');

  // Wait for the promise to resolve
  await promise;

  // Check that the placeholder is replaced by the resolved content
  expect(result.length).toBe(4);
  expect(result[1].nodeType).toBe(Node.TEXT_NODE);
  expect(result[1].nodeValue).toBe('Text');
  expect(result[2].nodeType).toBe(Node.ELEMENT_NODE);
  expect(result[2].tagName).toBe('SPAN');
});
