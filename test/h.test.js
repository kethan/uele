/**
 * @vitest-environment jsdom
 */
import { expect, test, vi } from 'vitest';
import { signal, effect, computed } from 'ulive'; // Adjust based on your signal library
import { h, r, api, add, props, For, map, useLive } from '../src/index.js';

// Set up API as per your code
api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;

test('simple', () => {
  expect(h('h1').outerHTML).toBe('<h1></h1>');
  expect(h('h1', 'hello world').outerHTML).toBe('<h1>hello world</h1>');
});

test('nested', () => {
  expect(
    h('div', h('h1', 'Title'), h('p', 'Paragraph')).outerHTML
  ).toBe('<div><h1>Title</h1><p>Paragraph</p></div>');
});

test('arrays for nesting is ok', () => {
  expect(
    h('div', [h('h1', 'Title'), h('p', 'Paragraph')]).outerHTML
  ).toBe('<div><h1>Title</h1><p>Paragraph</p></div>');
});

test('can use namespace in name', () => {
  expect(h('myns:mytag').outerHTML).toBe('<myns:mytag></myns:mytag>');
});

test('can set properties', () => {
  let a = h('a', { href: 'http://google.com' });
  expect(a.href).toBe('http://google.com/');
  let checkbox = h('input', { name: 'yes', type: 'checkbox' });
  expect(checkbox.outerHTML).toBe('<input name="yes" type="checkbox">');
});

test('(un)registers an event handler', () => {
  const click = vi.fn();
  const btn = h('button', { onclick: click }, 'something');
  document.body.appendChild(btn);

  btn.click();
  expect(click).toHaveBeenCalledTimes(1);

  // Unregister event handler (optional)
  // h(btn, { onclick: false });
  // btn.click();
  // expect(click).toHaveBeenCalledTimes(1);  // Uncomment if you want to test unregistration

  // btn.remove();
});

test('sets styles', () => {
  let div = h('div', { style: { color: 'red' } });
  expect(div.style.color).toBe('red');
});

test('sets styles as text', () => {
  let div = h('div', { style: 'color: red' });
  expect(div.style.color).toBe('red');
});

test('sets attributes', () => {
  let div = h('div', { checked: true });
  expect(div.hasAttribute('checked')).toBe(true);
});

test('sets data attributes', () => {
  let div = h('div', { 'data-value': 5 });
  expect(div.getAttribute('data-value')).toBe('5');
});

test('sets aria attributes', () => {
  let div = h('div', { 'aria-hidden': true });
  expect(div.getAttribute('aria-hidden')).toBe('');
});

test('sets refs', () => {
  let ref;
  let div = h('div', { ref: (el) => (ref = el) });
  expect(div).toBe(ref);
});

test("boolean, number, get to-string'ed", () => {
  let e = h('p', true, false, 4);
  expect(e.outerHTML).toMatch(/<p><!--true--><!--false-->4<\/p>/);
});

test('can use fragments', () => {
  const insertCat = () => 'cat';
  let frag = h('div', [h('div', 'First'), insertCat, h('div', 'Last')]);

  const div = document.createElement('div');
  div.appendChild(frag);

  expect(div.innerHTML).toBe('<div><div>First</div>cat<div>Last</div></div>');
});

test('can use components', () => {
  const insertCat = ({ id, drink }) => h('div', { id, textContent: drink });

  let frag = h('div', [
    h('div', 'First'),
    h(insertCat, { id: 'cat', drink: 'milk' }),
    h('div', 'Last')
  ]);

  const div = document.createElement('div');
  div.appendChild(frag);
  expect(div.innerHTML).toBe('<div><div>First</div><div id="cat">milk</div><div>Last</div></div>');
});

test('h function creates elements from string tags', () => {
  const element = h('div', { id: 'test-div', className: 'test-class' }, 'Hello World');

  expect(element.tagName.toLowerCase()).toBe('div');
  expect(element.id).toBe('test-div');
  expect(element.className).toBe('test-class');
  expect(element.textContent).toBe('Hello World');
});

test('h function handles function components', () => {
  const MyComponent = () => h('span', null, 'My Component');
  const element = h(MyComponent, null);

  expect(element.tagName.toLowerCase()).toBe('span');
  expect(element.textContent).toBe('My Component');
});

test('h function creates SVG elements with correct namespace', () => {
  const svgElement = h('svg', { width: 100, height: 100 }, h('circle', { cx: 50, cy: 50, r: 40 }));

  expect(svgElement.namespaceURI).toBe('http://www.w3.org/2000/svg');
  const circle = svgElement.firstChild;
  expect(circle.tagName).toBe('circle');
  expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');
});

test('h function creates MathML elements with correct namespace', () => {
  const mathElement = h('math', null, h('mi', null, 'x'), h('mo', null, '+'), h('mi', null, 'y'));

  expect(mathElement.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
  const miElements = mathElement.getElementsByTagName('mi');
  expect(miElements.length).toBe(2);
  expect(miElements[0].textContent).toBe('x');
  expect(miElements[0].namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
});

test('h function sets standard attributes', () => {
  const inputElement = h('input', { type: 'text', value: 'test value', disabled: true });

  expect(inputElement.tagName.toLowerCase()).toBe('input');
  expect(inputElement.type).toBe('text');
  expect(inputElement.value).toBe('test value');
  expect(inputElement.disabled).toBe(true);
});

test('h function attaches event handlers', () => {
  const clicked = signal(false);
  const button = h('button', { onclick: () => { clicked.value = true; } }, 'Click Me');

  // Simulate click event
  button.click()

  expect(clicked.value).toBe(true);
});

test('add function processes simple children', () => {
  const element = h('div', null, 'Hello', ' ', 'World');

  expect(element.textContent).toBe('Hello World');
});

test('handles undefined and null as children', () => {
  const result = h('div', null, undefined, 'valid child');
  expect(result.outerHTML).toBe('<div><!--undefined-->valid child</div>');
});

test('handles empty string as child', () => {
  const result = h('div', '', 'valid child');
  expect(result.outerHTML).toBe('<div>valid child</div>');
});

test('handles a large number of children', () => {
  const children = Array(1000).fill(null).map(() => h('span', 'Item'));
  const result = h('div', children);  
  expect(result.childNodes.length).toBe(1000);
});

test('handles function as child', () => {
  const fn = () => 'dynamic text';
  const result = h('div', fn);
  expect(result.outerHTML).toBe('<div>dynamic text</div>');
});

test('handles promises as children', async () => {
  const promise = new Promise(resolve => resolve('Promise Text'));
  const result = h('div', promise);
  await promise; // Ensure promise resolves before testing
  expect(result.outerHTML).toBe('<div>Promise Text</div>');
});

test('dynamically updates content of elements', () => {
  let dynamicContent = 'Initial Text';
  const result = h('div', dynamicContent);
  dynamicContent = 'Updated Text';
  const updatedResult = h('div', dynamicContent);
  expect(updatedResult.outerHTML).toBe('<div>Updated Text</div>');
});

test('handles nested components with props', () => {
  const Cat = ({ name }) => h('div', { id: name }, name);
  const result = h('div', [
    h(Cat, { name: 'Whiskers' }),
    h(Cat, { name: 'Fluffy' })
  ]);
  expect(result.outerHTML).toBe('<div><div id="Whiskers">Whiskers</div><div id="Fluffy">Fluffy</div></div>');
});

test('handles nested fragments', () => {
  const frag1 = h('div', 'First');
  const frag2 = h('div', 'Second');
  const frag3 = h('div', 'Third');
  const result = h('div', [frag1, frag2, frag3]);
  expect(result.outerHTML).toBe('<div><div>First</div><div>Second</div><div>Third</div></div>');
});

test('handles text with special characters', () => {
  const result = h('div', '<div>', 'Text & More', '<span>');
  expect(result.outerHTML).toBe('<div>&lt;div&gt;Text &amp; More&lt;span&gt;</div>');
});

test('handles self-closing tags', () => {
  const img = h('img', { src: 'image.jpg', alt: 'An image' });
  expect(img.outerHTML).toBe('<img src="image.jpg" alt="An image">');
  
  const br = h('br');
  expect(br.outerHTML).toBe('<br>');
});

test('handles multiple root elements gracefully', () => {
  const result = h('div', h('h1', 'Title'), h('p', 'Paragraph'));
  // Expect a single parent element wrapping the others
  expect(result.outerHTML).toBe('<div><h1>Title</h1><p>Paragraph</p></div>');
});

test('handles invalid tag names gracefully', () => {
  expect(() => h('invalid-tag')).not.toThrow();
  expect(h('invalid-tag').outerHTML).toBe('<invalid-tag></invalid-tag>');
});

test('handles functions passed without arguments', () => {
  const result = h('div', () => 'No arguments passed');
  expect(result.outerHTML).toBe('<div>No arguments passed</div>');
});

test('handles asynchronous content rendering', async () => {
  const asyncContent = () => new Promise(resolve => setTimeout(() => resolve('Async Text'), 100));
  const result = h('div', asyncContent());
  await asyncContent(); // Ensure promise resolves before testing
  expect(result.outerHTML).toBe('<div>Async Text</div>');
});

test('handles deeply nested structures', () => {
  const nested = h('div', h('div', h('div', 'Deep content')));
  expect(nested.outerHTML).toBe('<div><div><div>Deep content</div></div></div>');
});

test('add function processes nested arrays', () => {
  const element = h('div', null, ['Hello', [' ', 'World']]);
  expect(element.textContent).toBe('Hello World');
});

test('add function processes signals as children', () => {
  const textSignal = signal('Dynamic Text');
  const element = h('div', null, textSignal);

  expect(element.textContent).toBe('Dynamic Text');

  // Update the signal
  textSignal.value = 'Updated Text';

  // Assuming the DOM updates automatically due to reactivity
  expect(element.textContent).toBe('Updated Text');
});

test('useLive function updates live nodes', () => {
  const numberSignal = signal(1);
  const [liveNodes, setLive] = useLive(numberSignal);

  const root = document.createElement('div');
  root.append(...liveNodes)

  expect(root.textContent).toBe('1');

  // Update the signal
  numberSignal.value = 2;

  // Assuming the DOM updates automatically due to reactivity
  expect(root.textContent).toBe('2');

  // Use setLive to update
  setLive(3);

  expect(root.textContent).toBe('3');
});

test('For component renders a list', () => {
  const itemsSignal = signal([1, 2, 3]);
  const list = h(For, { each: itemsSignal }, (item) => h('div', null, item));

  const root = document.createElement('div');
  add(list).forEach(node => root.appendChild(node));

  expect(root.textContent).toBe('123');

  // Update the items
  itemsSignal.value = [1, 2, 3, 4];

  // Assuming reactive update
  expect(root.textContent).toBe('1234');
});

test('For component displays fallback when list is empty', () => {
  const itemsSignal = signal([]);
  const list = h(For, { each: itemsSignal, fallback: h('div', null, 'No items') }, (item) => h('div', null, item));

  const root = document.createElement('div');
  add(list).forEach(node => root.appendChild(node));

  expect(root.textContent).toBe('No items');
});


test('signals update the DOM when value changes', () => {
  const count = signal(0);
  const divElement = h('div', null, count);

  const root = document.createElement('div');
  root.appendChild(divElement);

  expect(root.textContent).toBe('0');

  count.value = 1;

  // Assuming reactive update
  expect(root.textContent).toBe('1');
});

test('computed values update when dependencies change', () => {
  const count = signal(0);
  const doubleCount = computed(() => count.value * 2);

  const divElement = h('div', null, doubleCount);

  const root = document.createElement('div');
  root.appendChild(divElement);

  expect(root.textContent).toBe('0');

  count.value = 2;

  // Assuming reactive update
  expect(root.textContent).toBe('4');
});

test('onclick event handler increments count', () => {
  const count = signal(0);
  const button = h('button', { onclick: () => { count.value++; } }, 'Increment');

  const root = document.createElement('div');
  root.appendChild(button);

  // Simulate click event
  button.click();

  expect(count.value).toBe(1);
});

test('r function updates reactive attributes', () => {
  const isDisabled = signal(false);
  const button = h('button', { disabled: isDisabled }, 'Submit');

  const root = document.createElement('div');
  root.appendChild(button);

  expect(button.disabled).toBe(false);

  isDisabled.value = true;

  // Assuming reactive update
  expect(button.disabled).toBe(true);
});

test('Async component displays data after promise resolves', async () => {
  const fetchData = () => Promise.resolve('Async Data');

  async function AsyncComponent() {
    const data = await fetchData();
    return h('div', null, data);
  }

  const elementPromise = AsyncComponent();

  expect(elementPromise instanceof Promise).toBe(true);

  const element = await elementPromise;

  expect(element.textContent).toBe('Async Data');
});

test('Function returning JSX is correctly rendered', () => {
  const element = h('div', null, () => h('span', null, 'Nested'));

  const root = document.createElement('div');
  root.appendChild(element);

  const span = root.querySelector('span');
  expect(span).not.toBeNull();
  expect(span.textContent).toBe('Nested');
});

test('Static styles are correctly applied', () => {
  const div = h('div', { style: { color: 'red' } }, 'Red Text');

  document.body.appendChild(div);

  expect(div.style.color).toBe('red');

  document.body.removeChild(div);
});

test('Reactive styles update when signal changes', () => {
  const color = signal('blue');
  const div = h('div', { style: { color } }, 'Dynamic Color');

  document.body.appendChild(div);

  expect(div.style.color).toBe('blue');

  color.value = 'green';

  // Assuming reactive update
  expect(div.style.color).toBe('green');

  document.body.removeChild(div);
});

test('ClassName is correctly applied', () => {
  const div = h('div', { className: 'test-class' }, 'Class Test');

  expect(div.className).toBe('test-class');
});

test('Reactive class updates when signal changes', () => {
  const isActive = signal(false);
  const div = h('div', { class: { active: isActive } }, 'Class Test');

  const root = document.createElement('div');
  root.appendChild(div);

  expect(div.classList.contains('active')).toBe(false);

  isActive.value = true;

  // Assuming reactive update
  expect(div.classList.contains('active')).toBe(true);
});

test('r function binds reactive attribute and updates when signal changes', async () => {
  const isChecked = signal(false);
  const input = h('input', { type: 'checkbox', checked: isChecked });

  expect(input.checked).toBe(false);

  // Update the signal
  isChecked.value = true;

  // Wait for the reactive update
  await Promise.resolve();

  expect(input.checked).toBe(true);
});

test('r function binds reactive style and updates when signal changes', async () => {
  const bgColor = signal('red');
  const div = h('div', { style: { backgroundColor: bgColor } }, 'Colored Div');

  document.body.appendChild(div);

  expect(div.style.backgroundColor).toBe('red');

  // Update the signal
  bgColor.value = 'blue';

  // Wait for the reactive update
  await Promise.resolve();

  expect(div.style.backgroundColor).toBe('blue');

  document.body.removeChild(div);
});

test('map function renders list from reactive data and updates on change', async () => {
  const items = signal(['Item 1', 'Item 2']);
  const list = map(items, (item) => h('li', null, item));

  const ul = h('ul', null, list);

  expect(ul.textContent).toBe('Item 1Item 2');

  // Update the items
  items.value = [...items.value, 'Item 3'];

  // Wait for the reactive update
  await Promise.resolve();

  expect(ul.textContent).toBe('Item 1Item 2Item 3');

  // Remove an item
  items.value = items.value.filter((item) => item !== 'Item 2');

  // Wait for the reactive update
  await Promise.resolve();

  expect(ul.textContent).toBe('Item 1Item 3');
});


test('custom prop applies behavior to element', () => {

  // Example custom prop
  props.set('uppercase', (el, value) => {
    r(value, (v) => {
      if (v) {
        el.style.textTransform = 'uppercase';
      } else {
        el.style.textTransform = '';
      }
    })
  });

  const isUppercase = signal(true);
  const div = h('div', { uppercase: isUppercase }, 'Test Text');

  document.body.appendChild(div);

  expect(div.style.textTransform).toBe('uppercase');

  // Update the signal
  isUppercase.value = false;

  // Wait for the reactive update
  setTimeout(() => {
    expect(div.style.textTransform).toBe('');
    document.body.removeChild(div);
  }, 0);
});

test('map function handles nested reactive data structures', async () => {
  const data = signal([
    { id: 1, name: signal('Alice') },
    { id: 2, name: signal('Bob') },
  ]);

  const list = map(data, (item) =>
    h('div', null, 'ID: ', item.id, ', Name: ', item.name)
  );

  const root = document.createElement('div');
  add(list).forEach((node) => root.appendChild(node));

  expect(root.textContent).toBe('ID: 1, Name: AliceID: 2, Name: Bob');

  // Update a nested signal
  data.value[0].name.value = 'Anna';

  // Wait for the reactive update
  await Promise.resolve();

  expect(root.textContent).toBe('ID: 1, Name: AnnaID: 2, Name: Bob');

  // Add a new item
  data.value = [
    ...data.value,
    { id: 3, name: signal('Charlie') },
  ];

  // Wait for the reactive update
  await Promise.resolve();

  expect(root.textContent).toBe('ID: 1, Name: AnnaID: 2, Name: BobID: 3, Name: Charlie');
});

test('r function binds reactive event listeners', () => {
  const clickCount = signal(0);
  let handleClick = () => {
    clickCount.value++;
  };

  const button = h('button', { onclick: handleClick }, 'Click Me');

  expect(clickCount.value).toBe(0);

  // Simulate click
  button.click();

  expect(clickCount.value).toBe(1);

  // Simulate click
  button.click();

  expect(clickCount.value).toBe(2);
});

