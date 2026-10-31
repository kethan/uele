# uele presets

Exactly **19 signal presets** and **13 diff presets** are available.
Commands below use the compatible package ranges declared by this repository.
Install only the preset dependencies you choose, not the entire catalog.

Signal presets connect a library; diff presets choose DOM reconciliation.
Install one of each at startup, before creating cells or rendering.
Omit a diff preset to keep the renderer default.

Examples are ordinary JavaScript modules with a bundler and browser DOM.
They use the portable `uele/reactive` API so the counter code is identical
across libraries. Native library APIs remain available too.

Full `uele` defaults to compact `swapdom/deflate`; core/tiny and lite use
basic marker replacement. The explicit swapdom preset selects inflate.
`builtinDiff()` resets any configured entry to basic replacement.

Signal/diff installers accept an optional target, such as `lite.api`.
`uele/reactive` and the examples below follow the main entry; for lite,
use native signal APIs or its configured hooks. Bare tiny needs explicit
renderer source integration, not just a signal installer. See [API.md](API.md).

## Signal presets

### `uele/signals/alien-signals` - `alienSignals()`

Wire uele to `alien-signals` - plain-function signals: read `s()`, write
`s(v)`.

```sh
npm install uele "alien-signals@^3.2.1"
```

```js
import { h } from 'uele';
import { alienSignals } from 'uele/signals/alien-signals';
import { signal, read, write } from 'uele/reactive';

alienSignals();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/anod` - `anod()`

Wire uele to `anod`. Install before creating reactive content.

```sh
npm install uele "anod@^0.9.1"
```

```js
import { h } from 'uele';
import { anod } from 'uele/signals/anod';
import { signal, read, write } from 'uele/reactive';

anod();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/lite-signal` - `liteSignal()`

Wire uele to `@zakkster/lite-signal`. Install before creating reactive
content.

```sh
npm install uele "@zakkster/lite-signal@^1.5.2"
```

```js
import { h } from 'uele';
import { liteSignal } from 'uele/signals/lite-signal';
import { signal, read, write } from 'uele/reactive';

liteSignal();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/maverick` - `maverick()`

Wire uele to `@maverick-js/signals`. Install before creating reactive
content.

```sh
npm install uele "@maverick-js/signals@^6.0.0"
```

```js
import { h } from 'uele';
import { maverick } from 'uele/signals/maverick';
import { signal, read, write } from 'uele/reactive';

maverick();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/mobx` - `mobx()`

Wire uele to `mobx` - boxed observables and computed values.

```sh
npm install uele "mobx@^7.0.6"
```

```js
import { h } from 'uele';
import { mobx } from 'uele/signals/mobx';
import { signal, read, write } from 'uele/reactive';

mobx();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/nanostores` - `nanostores()`

Wire uele to `nanostores` - atoms driven through `.subscribe()`; no
effect runner.

```sh
npm install uele "nanostores@^1.5.5"
```

```js
import { h } from 'uele';
import { nanostores } from 'uele/signals/nanostores';
import { signal, read, write } from 'uele/reactive';

nanostores();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

Subscribe-only: direct cell bindings work. Arbitrary derived thunks,
`computed()` and automatic `effect()` tracking are not provided.

### `uele/signals/oby` - `oby()`

Wire uele to `oby`. Install before creating reactive content.

```sh
npm install uele "oby@^15.1.2"
```

```js
import { h } from 'uele';
import { oby } from 'uele/signals/oby';
import { signal, read, write } from 'uele/reactive';

oby();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/preact` - `preactSignals()`

Wire uele to `@preact/signals-core` - `Signal` instances; since 1.13
they also expose `.subscribe()`.

```sh
npm install uele "@preact/signals-core@^1.14.4"
```

```js
import { h } from 'uele';
import { preactSignals } from 'uele/signals/preact';
import { signal, read, write } from 'uele/reactive';

preactSignals();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/reactively` - `reactively()`

Wire uele to `@reactively/core`. Install before creating reactive
content.

```sh
npm install uele "@reactively/core@^0.0.8"
```

```js
import { h } from 'uele';
import { reactively } from 'uele/signals/reactively';
import { signal, read, write } from 'uele/reactive';

reactively();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/reflex` - `reflex()`

Wire uele to `@volynets/reflex`. Install before creating reactive
content.

```sh
npm install uele "@volynets/reflex@^3.0.2"
```

```js
import { h } from 'uele';
import { reflex } from 'uele/signals/reflex';
import { signal, read, write } from 'uele/reactive';

reflex();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/rescript-signals` - `rescriptSignals()`

Wire uele to `rescript-signals`. Install before creating reactive
content.

```sh
npm install uele "rescript-signals@^3.2.0" "@rescript/runtime@^12.3.1"
```

```js
import { h } from 'uele';
import { rescriptSignals } from 'uele/signals/rescript-signals';
import { signal, read, write } from 'uele/reactive';

rescriptSignals();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/rxjs` - `rxjs()`

Wire uele to `rxjs` - driven through `.subscribe()`; no effect runner,
so no computed values.

```sh
npm install uele "rxjs@^7.8.2"
```

```js
import { h } from 'uele';
import { rxjs } from 'uele/signals/rxjs';
import { signal, read, write } from 'uele/reactive';

rxjs();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

Subscribe-only: direct cell bindings work. Arbitrary derived thunks,
`computed()` and automatic `effect()` tracking are not provided.

### `uele/signals/signals` - `signals()`

Wire uele to `@webreflection/signals` - `Signal` instances with a
Preact-like API.

```sh
npm install uele "@webreflection/signals@^0.2.8"
```

```js
import { h } from 'uele';
import { signals } from 'uele/signals/signals';
import { signal, read, write } from 'uele/reactive';

signals();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/sjs` - `sjs()`

Wire uele to `s-js` - data nodes are read/written by calling them.

```sh
npm install uele "s-js@^0.4.9"
```

```js
import { h } from 'uele';
import { sjs } from 'uele/signals/sjs';
import { signal, read, write } from 'uele/reactive';

sjs();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/solid` - `solid()`

Wire uele to `solid-js` - accessors (signals and memos alike) from the
CLIENT build.

```sh
npm install uele "solid-js@^1.9.17"
```

```js
import { h } from 'uele';
import { solid } from 'uele/signals/solid';
import { signal, read, write } from 'uele/reactive';

solid();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/tanstack` - `tanstackStore()`

Wire uele to `@tanstack/store` - `Store` with `.state`/`.setState()`;
`subscribe()` is not synchronous.

```sh
npm install uele "@tanstack/store@^0.11.2"
```

```js
import { h } from 'uele';
import { tanstackStore } from 'uele/signals/tanstack';
import { signal, read, write } from 'uele/reactive';

tanstackStore();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

Subscribe-only: direct cell bindings work. Arbitrary derived thunks,
`computed()` and automatic `effect()` tracking are not provided.

### `uele/signals/ulive` - `ulive()`

Wire uele to `ulive` - signals with `peek`/`value`.

```sh
npm install uele "ulive@^1.0.7"
```

```js
import { h } from 'uele';
import { ulive } from 'uele/signals/ulive';
import { signal, read, write } from 'uele/reactive';

ulive();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/usignal` - `usignal()`

Wire uele to `usignal` - `Signal` instances; a read is attributed to
every enclosing effect.

```sh
npm install uele "usignal@^0.10.0"
```

```js
import { h } from 'uele';
import { usignal } from 'uele/signals/usignal';
import { signal, read, write } from 'uele/reactive';

usignal();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

### `uele/signals/vue` - `vue()`

Wire uele to `@vue/reactivity` - `ref()`/`computed()` values.

```sh
npm install uele "@vue/reactivity@^3.5.44"
```

```js
import { h } from 'uele';
import { vue } from 'uele/signals/vue';
import { signal, read, write } from 'uele/reactive';

vue();
const count = signal(0);
const increment = () => write(count, read(count) + 1);

const button = h('button', { onclick: increment }, count);
document.body.append(button);
```

Use `canEffect()` / `canCompute()` from `uele/reactive` to feature-detect
capabilities. Do not switch libraries while existing cells/views are live.

## Diff engine presets

All 13 installers share `api.diff(parent, oldNodes, newNodes, end)`.
The example reorders the same two DOM nodes inside an owned live region.

Spect, Snabbdom, Heckel, list-difference and Stage0 are dependency-free
node-identity algorithms inspired by
[js-diff-benchmark](https://github.com/luwes/js-diff-benchmark), not framework wrappers.

### `uele/diffs/builtin` - `builtinDiff()`

Select basic marker replacement (core/lite default): no `api.diff`, no
dependency.

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { builtinDiff } from 'uele/diffs/builtin';

builtinDiff();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/domdiff` - `domdiff()`

`domdiff` - takes an options object instead of a node (`{ before: end
}`).

```sh
npm install uele "domdiff@^2.2.2"
```

```js
import { h, useLive } from 'uele';
import { domdiff } from 'uele/diffs/domdiff';

domdiff();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/fast-array-diff` - `fastArrayDiff()`

`fast-array-diff` - its LCS patch decides the ordering, the preset
performs the DOM moves.

```sh
npm install uele "fast-array-diff@^1.1.0"
```

```js
import { h, useLive } from 'uele';
import { fastArrayDiff } from 'uele/diffs/fast-array-diff';

fastArrayDiff();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/heckel` - `heckel()`

Heckel-style unique-token matching, independently implemented for uele.
Algorithm family: https://github.com/luwes/js-diff-benchmark Map keys
preserve node identity (unlike string-keyed symbol tables). DOM lists
contain each node at most once, so shared tokens are unique matches.

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { heckel } from 'uele/diffs/heckel';

heckel();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/list-difference` - `listDifference()`

Map-based list-difference reconciliation, independently implemented for
uele. Algorithm family: https://github.com/luwes/js-diff-benchmark Keys
are DOM node identities; caller-owned arrays are never modified.

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { listDifference } from 'uele/diffs/list-difference';

listDifference();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/morphdom` - `morphdom()`

`morphdom` - updates nodes in place; the shared adapter handles pairing
and ordering.

```sh
npm install uele "morphdom@^2.7.8"
```

```js
import { h, useLive } from 'uele';
import { morphdom } from 'uele/diffs/morphdom';

morphdom();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/nanomorph` - `nanomorph()`

`nanomorph` - updates nodes in place; the shared adapter handles pairing
and ordering.

```sh
npm install uele "nanomorph@^5.4.3"
```

```js
import { h, useLive } from 'uele';
import { nanomorph } from 'uele/diffs/nanomorph';

nanomorph();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/rebuild` - `rebuild()`

The smallest conforming differ: drop everything, insert everything. Fine
for tiny lists and a useful baseline in tests.

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { rebuild } from 'uele/diffs/rebuild';

rebuild();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/snabbdom` - `snabbdom()`

Snabbdom-style node-identity reconciliation, independently implemented
for uele's bounded live regions. Inspired by the algorithm family
compared at https://github.com/luwes/js-diff-benchmark (not a wrapper
for the framework).

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { snabbdom } from 'uele/diffs/snabbdom';

snabbdom();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/spect` - `spect()`

Spect-style node-identity reconciliation, independently implemented for
uele's bounded live regions. Inspired by the algorithm family compared
at https://github.com/luwes/js-diff-benchmark (not a wrapper for the
framework).

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { spect } from 'uele/diffs/spect';

spect();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/stage0` - `stage0()`

Stage0-style node-identity reconciliation, independently implemented for
uele's bounded live regions. Inspired by the algorithm family compared
at https://github.com/luwes/js-diff-benchmark (not a wrapper for the
framework).

```sh
npm install uele
```

```js
import { h, useLive } from 'uele';
import { stage0 } from 'uele/diffs/stage0';

stage0();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/swapdom` - `swapdom()`

`swapdom` - a keyed differ written for exactly uele's `api.diff`
signature.

```sh
npm install uele "swapdom@^1.2.1"
```

```js
import { h, useLive } from 'uele';
import { swapdom } from 'uele/diffs/swapdom';

swapdom();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

### `uele/diffs/udomdiff` - `udomdiff()`

`udomdiff` - takes `(parent, a, b, get, before)`; the adapter supplies
the identity callback and forwards the end marker as `before`. Core
always uses four arguments.

```sh
npm install uele "udomdiff@^1.1.2"
```

```js
import { h, useLive } from 'uele';
import { udomdiff } from 'uele/diffs/udomdiff';

udomdiff();
const first = h('li', null, 'First');
const second = h('li', null, 'Second');
const [nodes, replace] = useLive([first, second]);

document.body.append(h('ul', null, nodes));
replace([second, first]);
```

## Complete example apps

[The todos](../examples/todos/) include twelve signal-library versions
and a callback-only State example. See [all examples](../examples/README.md).
[The UStor cart](../examples/ustor/README.md) demonstrates nested writes,
computed totals, keyed rows and explicit teardown without a named region helper.

For custom adapters, use [the authoring guide](AUTHORING.md) and
[the integration contract](ADAPTERS.md).
