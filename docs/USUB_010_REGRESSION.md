> Historical investigation: usub 0.11.0 now fixes these issues and is the declared dependency. See [current verification](USUB_011_VERIFICATION.md).

# Why the usub 0.10.0 memory checks fail

## Conclusion

The observable branch in the published **usub 0.10.0** creates its unsubscribe
wrapper inside `sub()`. That closure shares the scope containing `next` and the
default `emit` callback. The FinalizationRegistry strongly holds the wrapper while
its target (the source) stays alive, retaining the caller callback and its payload.
This is reproducible without uele, jsdom, effects, or coverage instrumentation.

```text
FinalizationRegistry held value
  -> unsubscribe wrapper created inside sub()
  -> shared sub() closure context
  -> next (caller callback)
  -> captured payload
```

`target = 0` does not clear `next`. Explicit unsubscribe sets `error = 0` but
leaves this closure context retained. A live source prevents finalization of the
registry entry even if the caller drops or invokes the unsubscribe handle.

In 0.9.0, `unsubr(unsub, cleanup)` creates the wrapper in a separate helper's scope.
For a source whose returned subscription does not retain its callback, that wrapper
has no path to `next`. This is why the same tests passed before the upgrade.

## Controlled results

Each scenario creates 20 payloads, tracks finalization using numeric IDs only, and
runs 30 explicit GC rounds with event-loop turns. No subscription handle or payload
is retained by the fixture. Sources are deliberately kept alive in the first two
scenarios. The third scenario also drops the source as a collection control.

| Build | Explicitly unsubscribed, source live | Handle dropped, source live | Source dropped |
| --- | ---: | ---: | ---: |
| Published 0.9.0 | 0/20 retained | 0/20 retained | 0/20 retained |
| Published 0.10.0 | 20/20 retained | 20/20 retained | 0/20 retained |
| 0.10.0, clear `next` on unsubscribe only | 0/20 retained | 20/20 retained | 0/20 retained |
| 0.10.0, isolated observable disposer helper | 0/20 retained | 0/20 retained | 0/20 retained |

The source-dropped control rules out the reproduction simply keeping payloads alive
in its own bookkeeping. Clearing `next` on unsubscribe alone does **not** fix the
second case; the registry-held closure must not retain `next` in the first place.

## Reproduce against the published packages

From the repository root:

```sh
work=$(mktemp -d)
npm install --prefix "$work" --no-save --ignore-scripts \
  usub09@npm:usub@0.9.0 usub10@npm:usub@0.10.0
node --expose-gc scripts/repro-usub-retention.mjs \
  "$work/node_modules/usub09/dist/index.es.js"
node --expose-gc scripts/repro-usub-retention.mjs \
  "$work/node_modules/usub10/dist/index.es.js"
```

The existing regression assertions are in `test/memory.test.js`:

- `an explicitly unsubscribed observable releases its callback`
- `an observable whose subscription does not reach the source is released`

Both fail on published 0.10.0 with **20 retained vs an allowed maximum of 4**.
These are intentional ownership tests, not signal-adapter or batching failures.

## Candidate upstream fix

Create the held disposer in an independent helper, not in `sub()` or in a helper
that also captures `emit`. A separate state object can preserve completion cleanup
and idempotent explicit unsubscribe without pulling in the callback's scope:

```js
const makeObservableStop = (subscription, state) => () => {
  if (!subscription) return;
  subscription.call ? subscription() : subscription.unsubscribe?.();
  subscription = 0;
  state.cleanup?.();
};

const subscribeObservable = (source, emit, error, cleanup) => {
  const state = { cleanup };
  const subscription = source.subscribe(emit, error, () => {
    state.cleanup?.();
    state.cleanup = undefined;
  }) || 1;
  return makeObservableStop(subscription, state);
};
```

Replace the observable branch's inline subscribe/wrapper expression with
`subscribeObservable(unsub, emit, error, cleanup)`; keep the other branches intact.
The returned disposer now closes only over the returned subscription and cleanup
state. The completion listener may reference the state, but the returned disposer
has no reverse reference to that listener or its `emit` argument.

This candidate was tested in a temporary installed copy of the **0.10.0 main ESM
build**: all **16 existing uele memory tests passed**. The full suite and upstream
completion/error semantics still need validation before treating it as a release-ready
upstream fix. No tests or coverage thresholds were relaxed.

## Repository state

At the user’s request, the dependency and lockfile now use the published **usub
0.10.0** (`^0.10.0`). The known observable-retention regression remains; the two
memory tests are intentionally kept unchanged. The candidate is not shipped as a
node_modules patch, dependency override, or uele workaround. An upstream fix is
still recommended. This upgrade must not be described as passing all checks.

## Compact fix, minification safety, and size measurements

Further testing found that normal Terser compression can inline the disposer helper
back into `sub()`, reproducing the leak even when the unminified candidate is correct.
Keeping the observable disposer in a separate scope is therefore a build requirement,
not just a source formatting preference. A `/*@__NOINLINE__*/` annotation on the helper
call preserved the fix under the tested Terser configuration and uele's Rollup/Terser
pipeline. Other minifiers/bundlers must be verified separately.

A more compact source-level candidate is provided in
[patches/usub-0.10.0-retention.patch](patches/usub-0.10.0-retention.patch).
It changes only usub's observable subscription path, not uele's renderer or its API.
It shares the cleanup callback through a one-element array so completion can still
clear it without the registry-held disposer retaining the `sub()` closure.
This is a candidate for the upstream usub repository, **not** a patch applied by uele.

Measured against uele's current **0.9.0** dependency, on the same machine and toolchain:

| uele bundle | Current raw/gzip bytes | Compact fixed 0.10.0 raw/gzip bytes | Delta raw/gzip |
| --- | ---: | ---: | ---: |
| Main minified | 3868 / 1936 | 3848 / 1953 | -20 / +17 |
| Main ESM | 9854 / 3520 | 9922 / 3572 | +68 / +52 |
| Main CJS | 10102 / 3579 | 10170 / 3628 | +68 / +49 |
| Lite minified | 2588 / 1356 | 2587 / 1355 | -1 / -1 |

These are upgrade-plus-fix deltas, not a claim that the fix has zero byte cost.
All existing bundle budgets passed without modification. Core source files were
unchanged. The main standalone usub candidate minified to 729 raw / 451 gzip bytes
with the test's Terser options, compared with 698 / 431 for unmodified 0.10.0.

Validation of the compact annotated candidate in a temporary installed 0.10.0 build:

- Full `npm run test:coverage`: **2,353 tests passed**, all configured coverage
  metrics **100%**, unchanged thresholds.
- The standalone retention reproduction against uele's actual minified UMD bundle:
  **0/20 retained in all three scenarios**, including both previously failing cases.
- The same standalone checks pass against separately Terser-minified output with
  the annotation; removing the annotation reproduces both leaks.
- Existing size limits passed. The full package/real-browser/upstream suites were
  not run for this candidate, so this is not a published or fully certified release.

The compact candidate was removed from `node_modules` after testing. The repository
has since been upgraded, at the user’s request, to the unpatched published 0.10.0
dependency. The retention reproduction
script accepts both ESM and CommonJS/UMD builds for future regression checks.
