import * as full from 'uele';
import * as lite from 'uele/lite';
import * as tiny from 'uele/tiny';
import { If, For, Switch, Dynamic } from 'uele/flow';
full.lazy(async () => ({ default: () => full.h('b', null, 'loaded') }));
For({ each: [1, 2], children: value => full.h('b', null, value) });
If({ when: true, children: 'yes' });
Switch({ children: [] });
Dynamic({ component: () => full.h('i') });
tiny.api.get(() => 'once');
// @ts-expect-error Controls moved to uele/flow.
full.For({});
// @ts-expect-error lazy stays in full.
lite.lazy(() => Promise.resolve({}));
// @ts-expect-error tiny has no optional list helper.
tiny.map([]);
// @ts-expect-error Use api.get; standalone wrappers were removed.
full.get(1);

// @ts-expect-error Diff engine-specific arguments belong in the adapter.
full.api.udom = (node: Node) => node;

// @ts-expect-error Core no longer dispatches five-argument engine signatures.
full.api.diff = (parent: Node, oldNodes: Node[], newNodes: Node[], get: Function, end: Node) => {};

// @ts-expect-error Only core/tiny, lite and full are public renderer tiers.
import * as removedVariant from 'uele/core/full';

// @ts-expect-error internal diff helpers are not public entry points
import { morphAdapter } from 'uele/diffs/util';
void morphAdapter;
