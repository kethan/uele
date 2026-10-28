import { afterEach, describe, expect, it } from 'vitest';
import * as main from 'uele';
import * as lite from '../lite/index.js';
import { configure } from 'uele/setup';
import { preactSignals } from 'uele/signals/preact';
import { stage0 } from 'uele/diffs/stage0';
import { appProps } from 'uele/props';
import { signal, read } from 'uele/reactive';

const snapshots = [main, lite].map(target => [target, { ...target.api }, new Map(target.props)]);
afterEach(() => {
    for (const [target, api, props] of snapshots) {
        for (const key of Object.keys(target.api)) delete target.api[key];
        Object.assign(target.api, api);
        target.props.clear();
        for (const [key, value] of props) target.props.set(key, value);
    }
});

describe('canonical installers', () => {
    it.each([
        ["alien-signals", "alienSignals", "alienSignals"],
        ["anod", "anod", "anod"],
        ["lite-signal", "liteSignal", "liteSignal"],
        ["maverick", "maverick", "maverick"],
        ["mobx", "mobx", "mobx"],
        ["nanostores", "nanostores", "nanostores"],
        ["oby", "oby", "oby"],
        ["preact", "preactSignals", "preactSignals"],
        ["reactively", "reactively", "reactively"],
        ["reflex", "reflex", "reflex"],
        ["rescript-signals", "rescriptSignals", "rescriptSignals"],
        ["rxjs", "rxjs", "rxjs"],
        ["signals", "signals", "signals"],
        ["sjs", "sjs", "sjs"],
        ["solid", "solid", "solid"],
        ["tanstack", "tanstackStore", "tanstackStore"],
        ["ulive", "ulive", "ulive"],
        ["usignal", "usignal", "usignal"],
        ["vue", "vue", "vue"]
    ])('%s exposes only its canonical installer', async (slug, _old, name) => {
        const mod = await import(`uele/signals/${slug}`);
        expect(Object.keys(mod).sort()).toEqual((slug === 'tanstack' ? ['Cell', name] : [name]).sort());
        expect(typeof mod[name]).toBe('function');
    });
    it.each([
        ["builtin", "builtinDiff", "builtinDiff"],
        ["spect", "spect", "spect"],
        ["domdiff", "domdiff", "domdiff"],
        ["fast-array-diff", "fastArrayDiff", "fastArrayDiff"],
        ["heckel", "heckel", "heckel"],
        ["list-difference", "listDifference", "listDifference"],
        ["morphdom", "morphdom", "morphdom"],
        ["nanomorph", "nanomorph", "nanomorph"],
        ["rebuild", "rebuild", "rebuild"],
        ["snabbdom", "snabbdom", "snabbdom"],
        ["stage0", "stage0", "stage0"],
        ["swapdom", "swapdom", "swapdom"],
        ["udomdiff", "udomdiff", "udomdiff"]
    ])('%s diff exposes its canonical installer', async (slug, _old, name) => {
        const mod = await import(`uele/diffs/${slug}`);
        expect(typeof mod[name]).toBe('function');
        expect(Object.keys(mod).some(key => key.startsWith('use'))).toBe(false);
    });
    it('exports the canonical prop pack', () => {
        expect(typeof appProps).toBe('function');
    });
});

describe('configure', () => {
    it('defaults to main and leaves unspecified configuration alone', () => {
        const before = { ...main.api };
        expect(configure()).toBe(main);
        expect(main.api).toEqual(before);
    });
    it('installs main signals, diff and optional props, with reactive authoring unchanged', () => {
        expect(configure({ signals: preactSignals, diff: stage0, props: [appProps] })).toBe(main);
        const count = signal(1);
        const node = main.h('span', { text: count });
        expect(node.textContent).toBe('1');
        count.value = 2;
        expect(read(count)).toBe(2);
        expect(node.textContent).toBe('2');
    });
    it('uses the same renderer target for lite', () => {
        const before = { ...main.api };
        expect(configure({ signals: preactSignals, diff: stage0, props: [appProps] }, lite)).toBe(lite);
        const count = lite.api.signal(1);
        const node = lite.h('span', { text: count });
        count.value = 2;
        expect(node.textContent).toBe('2');
        expect(main.api).toEqual(before);
    });
    it('applies signals, then diff, then ordered prop packs to the right targets', () => {
        const target = { api: {}, props: new Map(), r: () => {} };
        const calls = [];
        configure({
            signals: api => { expect(api).toBe(target.api); calls.push('signals'); },
            diff: api => { expect(api).toBe(target.api); calls.push('diff'); },
            props: [
                renderer => { expect(renderer).toBe(target); calls.push('props1'); renderer.props.set('x', 1); },
                renderer => { expect(renderer).toBe(target); calls.push('props2'); renderer.props.set('x', 2); }
            ]
        }, target);
        expect(calls).toEqual(['signals', 'diff', 'props1', 'props2']);
        expect(target.props.get('x')).toBe(2);
    });
    it('supports individual categories without clearing the others', () => {
        const target = { api: { existing: true }, props: new Map(), r: () => {} };
        configure({ signals: api => { api.signal = true; } }, target);
        configure({ diff: api => { api.diff = true; } }, target);
        configure({ props: [renderer => renderer.props.set('custom', true)] }, target);
        expect(target.api).toEqual({ existing: true, signal: true, diff: true });
        expect(target.props.get('custom')).toBe(true);
        expect(configure({}, target)).toBe(target);
    });
});
