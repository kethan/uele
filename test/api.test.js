/**
 * @vitest-environment jsdom
 */
import { api } from '../src/index.js';
import { expect, test } from 'vitest';


test('api.effect can be reassigned to undefined', () => {
  api.effect = undefined;

  let triggered = false;
  try {
    api.effect(() => {
      triggered = true;
    });
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
  }

  expect(triggered).toBe(false);
});

test('api.effect should throw if not a function', () => {
  api.effect = true; // Invalid assignment

  let triggered = false;
  try {
    api.effect(() => {
      triggered = true;
    });
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toMatch(/not a function/);
  }

  expect(triggered).toBe(false);
});

test('api.is can be reassigned to always return true', () => {
  api.is = () => true; // Override with a custom function

  expect(api.is({})).toBe(true);
  expect(api.is(null)).toBe(true);
  expect(api.is(undefined)).toBe(true);
});

test('api.is should throw if not a function', () => {
  api.is = true; // Invalid assignment

  try {
    api.is({});
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toMatch(/not a function/);
  }
});

test('api.get can be reassigned to return a constant value', () => {
  api.get = () => 42; // Override with a custom function

  expect(api.get({})).toBe(42);
  expect(api.get(null)).toBe(42);
  expect(api.get(undefined)).toBe(42);
});

test('api.get should throw if not a function', () => {
  api.get = true; // Invalid assignment

  try {
    api.get({});
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toMatch(/not a function/);
  }
});

test('api properties retain original functionality after valid reassignment', () => {
  // Reassign api.is to a custom function
  api.is = (v) => v !== null && v !== undefined;

  expect(api.is(0)).toBe(true); // Non-null/undefined value
  expect(api.is(null)).toBe(false); // Null value
  expect(api.is(undefined)).toBe(false); // Undefined value

  // Reassign api.get to a custom function
  api.get = (v) => v * 2;

  expect(api.get(2)).toBe(4);
  expect(api.get(5)).toBe(10);
});

test('api properties can be restored after invalid assignments', () => {
  // Backup original functionality
  const originalEffect = api.effect;
  const originalIs = api.is;
  const originalGet = api.get;

  // Assign invalid values
  api.effect = undefined;
  api.is = true;
  api.get = null;

  // Restore original functionality
  api.effect = originalEffect;
  api.is = originalIs;
  api.get = originalGet;

  expect(api.effect).toBe(originalEffect);
  expect(api.is).toBe(originalIs);
  expect(api.get).toBe(originalGet);
});

test('api.effect gracefully handles missing function definition', () => {
  api.effect = undefined;

  let result = false;
  try {
    api.effect(() => (result = true));
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
  }

  expect(result).toBe(false);
});

test('api.is gracefully handles missing function definition', () => {
  api.is = undefined;

  let result = false;
  try {
    result = api.is({});
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
  }

  expect(result).toBe(false);
});

test('api.get gracefully handles missing function definition', () => {
  api.get = undefined;

  let result = null;
  try {
    result = api.get(42);
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
  }

  expect(result).toBe(null);
});