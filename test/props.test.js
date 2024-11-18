/**
 * @vitest-environment jsdom
 */
import { h, r, api, props } from '../src/index.js';
import { expect, test } from 'vitest';
import { signal, effect } from 'ulive'; // Adjust based on your signal library

// Set up API as per your code
api.effect = effect;
api.is = (v) => v?.peek;
api.get = (v) => v.value;


test('props handles static custom attributes', () => {
  props.set('uppercase', (el, value) => {
    el.style.textTransform = value ? 'uppercase' : '';
  });

  const div = h('div', { uppercase: true });

  expect(div.style.textTransform).toBe('uppercase');
});

test('props handles reactive attributes', () => {
  const isUppercase = signal(true);

  props.set('uppercase', (el, value) => {
    r(value, (v) => {
      el.style.textTransform = v ? 'uppercase' : '';
    })
  });

  const div = h('div', { uppercase: isUppercase });

  expect(div.style.textTransform).toBe('uppercase');

  isUppercase.value = false;
  expect(div.style.textTransform).toBe('');
});

test('props supports adding multiple custom handlers', () => {
  props.set('backgroundColor', (el, value) => {
    el.style.backgroundColor = value || '';
  });

  props.set('fontSize', (el, value) => {
    el.style.fontSize = value ? `${value}px` : '';
  });

  const div = h('div', { backgroundColor: 'red', fontSize: 16 });

  expect(div.style.backgroundColor).toBe('red');
  expect(div.style.fontSize).toBe('16px');
});

test('props gracefully handles missing handler for attributes', () => {
  const div = h('div', { nonExistent: 'someValue' });

  expect(div.getAttribute('nonExistent')).toBe('someValue');
});

test('props supports custom event handlers', () => {
  let clicked = false;

  props.set('onClick', (el, handler) => {
    el.addEventListener('click', handler);
  });

  const div = h('div', { onClick: () => (clicked = true) });

  div.click();
  expect(clicked).toBe(true);
});

test('props supports reactive event handlers', () => {
  const clickCount = signal(0);

  props.set('onClick', (el, handler) => {
    el.addEventListener('click', handler);
  });

  const div = h('div', {
    onClick: () => {
      clickCount.value++;
    },
  });

  div.click();
  expect(clickCount.value).toBe(1);

  div.click();
  expect(clickCount.value).toBe(2);
});

test('props handles dynamic style updates with reactive values', () => {
  const color = signal('red');

  props.set('dynamicStyle', (el, value) => {
    r(value, (v) => {
      el.style.color = v;
    });
  });

  const div = h('div', { dynamicStyle: color });

  expect(div.style.color).toBe('red');

  color.value = 'blue';
  expect(div.style.color).toBe('blue');
});

test('props cleans up reactive handlers on element removal', () => {
  const isVisible = signal(true);

  props.set('visibility', (el, value) => {
    const unsubscribe = r(value, (v) => {
      el.style.display = v ? 'block' : 'none';
    });
    el._unsubscribe = unsubscribe; // Store unsubscribe for cleanup

  });

  const div = h('div', { visibility: isVisible });

  expect(div.style.display).toBe('block');

  isVisible.value = false;
  expect(div.style.display).toBe('none');

  // Simulate element removal and cleanup
  if (div._unsubscribe) div._unsubscribe();
  isVisible.value = true; // Should no longer affect the element
  expect(div.style.display).toBe('none');
});