/**
 * @vitest-environment jsdom
 */

import { r, api, get } from '../src/index.js';
import { expect, test } from 'vitest';

// Mini signal implementation
let v =
  (val, cb = []) =>
    (c) =>
      c === void 0
        ? val
        : c.call
          ? cb.splice.bind(cb, cb.push(c) - 1, 1, 0)
          : ((val = c), cb.map((f) => f && f(val)));

// Set up `api` for testing
// api.is = (v) => v?.call; // Check if the value is a signal
// api.get = (v) => v?.(); // Get the value from a signal
// api.effect = undefined; // Unused in this case
api.any = (target) => (next, _, cleanup) => {
  if (target?.call) next(target?.()); // Initial value
  const unsub = target?.(next); // Subscribe to changes
  return () => { unsub?.(); cleanup?.(); }; // Cleanup on unsubscribe
}

test('r handles non-reactive values', () => {
  let result;

  r(42, (value) => {
    result = value;
  });

  expect(result).toBe(42);
});

test('r handles reactive values', () => {
  const reactive = v(10);
  let result;

  r(reactive, (value) => {
    result = value;
  });

  expect(result).toBe(10);

  // Update reactive value
  reactive(20);
  expect(result).toBe(20);
});

test('r handles reactive values and unsubscribes correctly', () => {
  const reactive = v(30);
  let result;
  let unsubscribed = false;

  const unsubscribe = r(reactive, (value) => {
    result = value;
  });

  expect(result).toBe(30);

  // Simulate unsubscribe
  unsubscribe();
  unsubscribed = true;

  // Update reactive value
  reactive(40);
  expect(result).toBe(30); // Should not update
  expect(unsubscribed).toBe(true);
});

test('r handles arrays as reactive values', () => {
  const reactive = v([1, 2, 3]);
  let result;

  r(reactive, (value) => {
    result = value;
  });

  expect(result).toEqual([1, 2, 3]);

  // Update reactive value
  reactive([4, 5, 6]);
  expect(result).toEqual([4, 5, 6]);
});

test('r handles boolean reactive values', () => {
  const reactive = v(true);
  let result;

  r(reactive, (value) => {
    result = value;
  });

  expect(result).toBe(true);

  // Update reactive value
  reactive(false);
  expect(result).toBe(false);
});

test('r handles nested reactivity', () => {
  const outer = v(5);
  const inner = v(10);
  let result;

  r(outer, (outerValue) => {
    r(inner, (innerValue) => {
      result = outerValue + innerValue;
    });
  });

  expect(result).toBe(15);

  // Update outer signal
  outer(6);
  expect(result).toBe(16);

  // Update inner signal
  inner(20);
  expect(result).toBe(26);
});

test('r calls cleanup function correctly', () => {
  const reactive = v(0);
  let cleanupCalled = false;

  const unsubscribe = r(
    reactive,
    () => { },
    undefined,
    () => {
      cleanupCalled = true;
    }
  );

  unsubscribe();
  expect(cleanupCalled).toBe(true);
});

test('r handles non-reactive values with correct flags', () => {
  let valueResult, reactiveFlag;

  r(100, (value, isReactive) => {
    valueResult = value;
    reactiveFlag = isReactive;
  });

  expect(valueResult).toBe(100);
  expect(reactiveFlag).toBe(false);
});

test('r handles reactive values with correct flags', () => {
  const reactive = v(50);
  let valueResult, reactiveFlag;

  r(reactive, (value, isReactive) => {
    valueResult = value;
    reactiveFlag = isReactive;
  });

  expect(valueResult).toBe(50);
  expect(reactiveFlag).toBe(true);
});


test('r handles null and undefined values', () => {
  let result;

  r(null, (value) => {
    result = value;
  });
  expect(result).toBe(null);

  r(undefined, (value) => {
    result = value;
  });
  expect(result).toBe(undefined);
});

test('r handles reactive signals with null and undefined values', () => {
  const reactiveNull = v(null);
  const reactiveUndefined = v(undefined);
  let result;

  r(reactiveNull, (value) => {
    result = value;
  });
  expect(result).toBe(null);

  r(reactiveUndefined, (value) => {
    result = value;
  });
  expect(result).toBe(undefined);

  // Update reactive values
  reactiveNull(10);
  expect(result).toBe(10);

  reactiveUndefined('text');
  expect(result).toBe('text');
});

test('r handles reactive objects', () => {
  const reactive = v({ key: 'value' });
  let result;

  r(reactive, (value) => {
    result = value;
  });

  expect(result).toEqual({ key: 'value' });

  // Update reactive object
  reactive({ key: 'newValue', extra: 'field' });
  expect(result).toEqual({ key: 'newValue', extra: 'field' });
});

test('r handles deeply nested reactivity', () => {
  const outer = v(v(v(10)));
  let result;

  r(outer, (value) => {
    r(value, (nestedValue) => {
      r(nestedValue, (deepValue) => {
        result = deepValue;
      });
    });
  });

  expect(result).toBe(10);

  // Update deep value
  outer()(20);
  expect(result).toBe(20);
});

test('r handles mixed reactive and non-reactive inputs', () => {
  const reactive = v(5);
  let result;

  r(reactive, (value) => {
    r(value + 10, (finalValue) => {
      result = finalValue;
    });
  });

  expect(result).toBe(15);

  // Update reactive value
  reactive(20);
  expect(result).toBe(30);
});

test('r allows multiple subscriptions to the same signal', () => {
  const reactive = v(50);
  let result1, result2;

  r(reactive, (value) => {
    result1 = value;
  });

  r(reactive, (value) => {
    result2 = value;
  });

  expect(result1).toBe(50);
  expect(result2).toBe(50);

  // Update reactive value
  reactive(100);
  expect(result1).toBe(100);
  expect(result2).toBe(100);
});

test('r handles reactive values that trigger cleanup', () => {
  const reactive = v(0);
  let cleanupCalled = false;

  const unsubscribe = r(
    reactive,
    () => { },
    undefined,
    () => {
      cleanupCalled = true;
    }
  );

  expect(cleanupCalled).toBe(false);

  // Unsubscribe
  unsubscribe();
  expect(cleanupCalled).toBe(true);
});

test('r does not trigger updates after cleanup', () => {
  const reactive = v(0);
  let result;
  const unsubscribe = r(reactive, (value) => {
    result = value;
  });

  expect(result).toBe(0);

  // Unsubscribe
  unsubscribe();

  // Update reactive value
  reactive(100);
  expect(result).toBe(0); // Should not update
});

test('r handles array-like reactive values', () => {
  const reactive = v(['a', 'b', 'c']);
  let result;

  r(reactive, (value) => {
    result = value.join(', ');
  });

  expect(result).toBe('a, b, c');

  // Update reactive array
  reactive(['x', 'y', 'z']);
  expect(result).toBe('x, y, z');
});

test('r handles reactive values with delayed updates', async () => {
  const reactive = v(1);
  let result;

  r(reactive, (value) => {
    result = value;
  });

  expect(result).toBe(1);

  // Simulate a delayed update
  setTimeout(() => {
    reactive(2);
  }, 50);

  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for the update
  expect(result).toBe(2);
});



test('get returns non-reactive values as is', () => {
  expect(get(42)).toBe(42);
  expect(get('text')).toBe('text');
  expect(get(null)).toBe(null);
  expect(get(undefined)).toBe(undefined);
  expect(get(true)).toBe(true);
  expect(get(false)).toBe(false);
});

test('get retrieves values from reactive signals', () => {
  const reactive = v(100);

  expect(get(reactive)).toBe(100);

  // Update reactive value
  reactive(200);
  expect(get(reactive)).toBe(200);
});

test('get handles reactive objects', () => {
  const reactive = v({ key: 'value' });

  expect(get(reactive)).toEqual({ key: 'value' });

  // Update reactive value
  reactive({ key: 'newValue', extra: 'field' });
  expect(get(reactive)).toEqual({ key: 'newValue', extra: 'field' });
});

test('get handles reactive arrays', () => {
  const reactive = v([1, 2, 3]);

  expect(get(reactive)).toEqual([1, 2, 3]);

  // Update reactive array
  reactive([4, 5, 6]);
  expect(get(reactive)).toEqual([4, 5, 6]);
});

test('get handles deeply nested reactive values', () => {
  const reactive = v(v(10));

  expect(get(get(reactive))).toBe(10);

  // Update nested reactive value
  reactive()(20);
  expect(get(get(reactive))).toBe(20);
});

test('get handles mixed reactive and non-reactive inputs', () => {
  const reactive = v(5);
  const nonReactive = 10;

  expect(get(reactive) + nonReactive).toBe(15);

  // Update reactive value
  reactive(20);
  expect(get(reactive) + nonReactive).toBe(30);
});