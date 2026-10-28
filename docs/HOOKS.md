# Hooks: state, behavior and explicit ownership

`uele/hooks` contains ordinary setup-time composables, not React hooks. There is
no render-loop call order, implicit component owner or automatic unmount lifecycle.
Configure the main signal integration before calling hooks.

```js
import { preactSignals } from 'uele/signals/preact';
import { signal, computed, read, write } from 'uele/reactive';
import { useCounter, useWindowSize, useLocalStorage } from 'uele/hooks';

preactSignals();
const counter = useCounter(0);
const viewport = useWindowSize();
const preferences = useLocalStorage('preferences', { compact: false });

counter.inc();
console.log(read(counter.count), read(viewport.size));

// Call from your application's actual teardown path.
viewport.dispose();
preferences.dispose(); // stops synchronization; DOES NOT delete persisted data
```

## Naming and returns

- `uele/reactive`: the only home for `signal`, `computed`, `effect`, `read`, `write`,
  batching and capability checks. Hooks do not duplicate or re-export them.
- `uele/hooks`: `useCounter`, `useFetch`, etc. compose state and behavior.
- Pure helpers use ordinary names, e.g. `paginationRange`.
- Multi-value hooks return named objects, not positional tuples.
- A hook that owns listeners, timers, subscriptions, observers, connections or
  pending async state includes `dispose()`.

Canonical names replace aliases: `useToggle`, `useList`, `useNow`,
`useAnimationFrame`, `useOTP`, `useColorScheme`, `useScrollPosition`, and
`useResizeObserver`. There are no `useSignal`/`useComputed`/`useEffect` wrappers,
no `useBoolean`/`useArray`/`useClock`/`useRaf`/`usePinInput`/`useDarkMode`/`useScroll`/
`useElementSize` aliases, and no `useIsMounted` claiming a renderer lifecycle.

## Named shapes

| Hook | Main result fields (plus `dispose` where owned) |
| --- | --- |
| `useToggle` | `value`, `toggle`, `set` |
| `useControllable` | `value`, `set` |
| `usePrevious` | `previous`, `dispose` |
| `useDebounce`, `useThrottle` | `value`, `dispose` |
| `useLocalStorage`, `useSessionStorage` | `value`, `set`, `remove`, `dispose` |
| `useQueryParam` | `value`, `set`, `dispose` |
| `useCookie` | `value`, `set` |
| `useHover`, `useFocus` | `hovered` or `focused`, `props` |
| `useKeyPress` | `pressed`, `dispose` |
| `useMediaQuery` | `matches`, `dispose` |
| `useOnline` | `online`, `dispose` |
| `useWindowSize`, `useResizeObserver` | `size`, `dispose` (observer also has `ref`, `disconnect`) |
| `useDocumentVisibility`, `useWindowFocus` | `visibility` or `focused`, `dispose` |
| `useScrollPosition`, `useBreakpoint`, `useIdle` | `position`, `breakpoint` or `idle`, `dispose` |
| `useNow` | `now`, `dispose` |
| `useLatest` | `latest`, `dispose` |
| `useInView` | `visible`, `dispose` |
| `useTitle`, `useEventListener`, `useHotkey`, `useClickOutside` | `dispose` |
| `useLongPress` | `props`, `dispose` |

State-only hooks such as `useCounter`, `useToggle`, `useList` and `useHistory`
do not invent empty disposers. `useSwipe` returns bind props directly: it installs
no external listener or timer. `useDebounceFn` and `useThrottleFn` intentionally
return callable functions, with `cancel()` and terminal `dispose()` methods;
debounce also has `flush()`.

## Disposal contract

1. `dispose()` is synchronous and idempotent, including if cleanup throws.
2. Disposal is terminal. Resource actions cannot restart/acquire work afterwards.
   Synchronous actions become no-ops; `run` and `copy` return resolved promises
   with `undefined`. Retained long-press bind props cannot schedule work again.
3. State cells remain readable. Read-only status getters remain available.
4. `stop`, `pause`, `disconnect`, `deactivate`, `close` and `cancel` remain
   domain-specific controls. They are not interchangeable with terminal disposal.
5. Storage `remove()` deletes data; storage `dispose()` only removes synchronization.
6. Title disposal first unsubscribes, then restores the original title.
7. Observer `ref(null)` disconnects the previous observation; disposal also rejects
   queued callbacks from an earlier observation. Focus traps deactivate on null refs.

Connect disposal to your real application/DOM ownership path. Calling a hook
inside a component does not by itself register disposal with the renderer.
Hooks still follow the main API; this change does not introduce lite-bound hooks,
a global cleanup registry, a scope framework, or isolated renderer instances.

## Async work

- `useAsync` ignores stale results, exposes `cancel()` to invalidate an in-flight
  result, and invalidates pending state on disposal. Generic promises cannot be
  forcibly cancelled; disposal does not claim to stop arbitrary user work.
- `useFetch` aborts its owned request on disposal and invalidates commits even if
  the fetch implementation ignores abort. Caller-provided abort signals are relayed
  and their listeners are removed after completion or disposal. `abort()` also invalidates its result.
- Clipboard and geolocation callbacks do not publish updates after disposal.
- Forms capture submit values, settle synchronous submit errors through the
  returned promise, and reject stale submitting-state updates after disposal.
- Transports clear event handlers and close their owned connection. A disposed
  WebSocket hook cannot reopen the connection.

## Types

Return types describe named result objects and disposal. State, async arguments,
storage values and form fields preserve useful generics. `Cell<T>` is an opaque,
compile-time handle for an integration-native cell, not a runtime wrapper; use
`read`/`write` for portable access. Common native readable interfaces are also
accepted as hook inputs. Native-library-specific fallback reads remain loosely
typed because one facade cannot infer every third-party cell representation.

Lifecycle regression tests cover cleanup, idempotence, terminal actions, stale
async completions, retained bind callbacks, null refs, SSR and persisted storage.
Core bundle budgets and coverage thresholds are not relaxed.

## Size and verification

Main/lite core artifacts remain byte-for-byte unchanged. Using the same Terser
module minification and gzip settings, the complete optional hooks source grows
from 18,385 / 6,491 to 19,558 / 6,916 bytes (raw / gzip): **+425 gzip bytes** for
cleanup and terminal ownership across the whole module. This is not a per-hook
cost. An isolated Rollup + Terser export of `useCounter` is unchanged at 403 / 274;
`useWindowSize` changes from 587 / 305 to 908 / 486 because it now owns and removes
its resize listener. These illustrative measurements leave uele imports external;
real application totals depend on tree shaking and compression context.

Validation: 2,447 tests passed at unchanged 100% configured coverage, plus ESM/CJS
bundle suites, strict declaration checks and installed-tarball consumer smoke tests.
Browser automation was not rerun for this change; browser APIs are covered by
jsdom/stubbed lifecycle regression tests.


### Connecting a hook to a rendered owner

Calling a hook inside a component does not establish an ambient lifetime. Install
`appProps()` from `uele/props` once and return its disposer from an action:
`<div use={() => resource.dispose}>…</div>`. Uele invokes it when the element is
discarded by its region. Standalone/application-owned hooks still require explicit
`dispose()`. Native DOM removal bypasses region teardown; see [API.md](API.md#component-ownership-is-automatic-at-the-renderer-boundary).
