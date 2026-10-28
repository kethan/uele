/**
 * The authoring layer on one preset (preact) and its failure modes: a missing
 * capability must be reported by name, never silently degraded.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { api } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { rxjs } from 'uele/signals/rxjs';
import { signal, computed, read, write, effect, untracked, isCell, canCompute, canEffect, batch, active } from 'uele/reactive';
import { HOOKS } from '../signals/internal.js';

const empty = { ...HOOKS, is: undefined, get: undefined };
const saved = { ...api };

afterEach(() => Object.assign(api, saved));

describe('uele/reactive on a preset with an effect runner', () => {
	it('creates, derives, reads, writes and runs effects', () => {
		preactSignals();
		expect(canEffect()).toBe(true);
		expect(canCompute()).toBe(true);
		const n = signal(1);
		const d = computed(() => read(n) * 2);
		expect(isCell(n)).toBe(true);
		expect(read(d)).toBe(2);
		write(n, 5);
		expect(read(d)).toBe(10);
		let seen = 0;
		const off = effect(() => {
			read(n);
			seen++;
		});
		write(n, 6);
		expect(seen).toBe(2);
		off();
		write(n, 7);
		expect(seen).toBe(2);
		expect(batch(() => (write(n, 8), read(n)))).toBe(8);
		expect(untracked(() => read(n))).toBe(8);
	});
});

describe('uele/reactive reports what a preset cannot do', () => {
	it('names the missing hook when no preset is installed', () => {
		Object.assign(api, empty);
		expect(() => signal(1)).toThrow(/'signal'/);
		expect(() => computed(() => 1)).toThrow(/'computed'/);
		expect(() => effect(() => {})).toThrow(/'effect'/);
	});

	it('names the capability a subscribe-only preset lacks', () => {
		rxjs();
		expect(canEffect()).toBe(false);
		expect(canCompute()).toBe(false);
		expect(() => computed(() => 1)).toThrow(/'computed'/);
		expect(() => effect(() => {})).toThrow(/'effect'/);
		// the parts that need no effect runner still work
		const cell = signal('a');
		write(cell, 'b');
		expect(read(cell)).toBe('b');
	});

	it('exposes the configured api for advanced use', () => {
		preactSignals();
		expect(active()).toBe(api);
	});
});
