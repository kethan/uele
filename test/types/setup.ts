import * as main from 'uele';
import * as lite from 'uele/lite';
import { configure } from 'uele/setup';
import { preactSignals } from 'uele/signals/preact';
import { vue } from 'uele/signals/vue';
import { stage0 } from 'uele/diffs/stage0';
import { appProps } from 'uele/props';

const renderer: typeof main = configure({ signals: preactSignals, diff: stage0, props: [appProps] });
const small: typeof lite = configure({ signals: vue, diff: stage0, props: [appProps] }, lite);
configure();
configure({}, small);
// @ts-expect-error installers are functions, not configuration strings
configure({ signals: 'preact' });
// @ts-expect-error prop packs are an ordered list
configure({ props: appProps });
// @ts-expect-error a renderer needs api, props and r
configure({}, { api: {} });
void renderer;

// @ts-expect-error implementation helpers are not public package subpaths
import { install } from 'uele/signals/internal';
// @ts-expect-error old adapter paths are removed
import { usePreactSignals } from 'uele/adapters/preact';
// @ts-expect-error there is only one canonical installer name
import { useVue } from 'uele/signals/vue';
