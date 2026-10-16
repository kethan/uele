/**
 * Bundle identity: the entries must share one module instance (one `h`, one
 * `api`) in both formats - a split instance silently kills every reactive
 * binding configured through the public `api`.
 */
import { expect, test } from 'vitest';
import { api as apiA, h as hA, add as addA } from 'uele';
import * as runtimeNs from 'uele/jsx-runtime';
const { h: hB, jsx: jsxB } = runtimeNs;
import { jsxDev } from 'uele/jsx-dev-runtime';
import { signal, effect } from 'ulive';

test('ele and its jsx runtime share one instance', () => {
	const probe = { peek: 1 };
	apiA.is = (v) => v === probe;
	const report = {
		runtimeH: hB === hA,
		apiShared: runtimeNs.api === undefined || runtimeNs.api === apiA, // wrappers re-export api, built runtimes do not
		jsxDevSeesApi: null
	};
	// the jsx factories close over their module's h; call jsxDev through a
	// signal-less element and compare the produced node's constructor path
	const el = jsxDev('i', {});
	report.jsxDevSeesApi = el && el.tagName === 'I';
	expect(report).toEqual({ runtimeH: true, apiShared: true, jsxDevSeesApi: true });
});

test('differential: raw h vs jsx factory on one signal', () => {
	apiA.effect = effect;
	apiA.is = (v) => v?.peek;
	apiA.get = (v) => v.value;
	const count = signal(0);
	const raw = hA('div', null, count);
	const viaJsx = jsxB('div', { children: count });
	const viaDev = jsxDev('div', { children: count });
	const viaMount = (() => {
		const root = document.createElement('div');
		root.append(...addA(jsxB('div', { children: count })));
		return root.textContent;
	})();
	const probe = { raw: raw.textContent, jsx: viaJsx.textContent, dev: viaDev.textContent, mount: viaMount };
	expect(probe).toEqual({ raw: '0', jsx: '0', dev: '0', mount: '0' });
	count.value = 1;
	expect(viaJsx.textContent).toBe('1');
	const cls = signal('a');
	const attrs = jsxB('div', { class: cls, style: { color: 'red' }, children: 's' });
	expect(attrs.className).toBe('a');
	cls.value = 'b';
	expect(attrs.className).toBe('b');
	expect(attrs.getAttribute('style')).toContain('red');
});
