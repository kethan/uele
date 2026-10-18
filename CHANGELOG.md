# Changelog

All notable changes to `uele` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[semver](https://semver.org/): minor releases add features, patches fix bugs.

## 0.11.0 — 2026-10-16

The UI release: `uele/ui` grows from a dozen wrappers into a full
Radix-style component catalogue, joined by two new subpaths — `uele/hooks`
and `uele/themes` — all built on `uele/reactive`, so everything runs on
every signal preset (ulive, preact, vue, usignal, alien-signals, s-js, mobx,
solid, and the subscribe-only rxjs/nanostores/tanstack where applicable).

### Fixed

- **`Toggle` in group mode reported the inverted value to `onChange`:** the scalar
  (`selected` + `value`) click handler wrote the new selection and then re-read it to
  build the `onChange` payload, so listeners received the previous state. It now
  computes the next value once, writes it, and reports that. (Found by the new
  coverage-driven edge tests in `test/edge-cases.test.jsx`.)
- **Components crashed with no signal preset installed:** `uele/ui`'s internal
  `own()` fallback cell was a plain object, but the placeholder `api.get` reads
  cells by calling them (`v => v()`), so the first `read()` inside e.g. `Toggle`
  threw `v is not a function`. The fallback is now a callable cell with
  `.write`/`.value`/`.subscribe`, so uncontrolled components mount and toggle
  standalone (bindings still paint once, like the subscribe-only presets).
  Covered by `test/no-preset.test.jsx`.
- **Uncontrolled `Dialog` never restored the body scroll lock:** `applyLock`
  only ran from the open-state subscription, which exists only when a signal
  preset is installed and the open state is cell-backed — the trigger/close
  paths mutated the internal cell directly, so closing an uncontrolled dialog
  left `document.body.style.overflow: 'hidden'` behind. Open and close now
  apply the lock explicitly on every path.
- **`useFetch(url, options)` silently dropped the hook-level options:** `run`
  replaced them with `{ ...opts, signal }` instead of merging, so headers or
  other `RequestInit` fields passed to the hook never reached `fetch`. Per-run
  options now merge over the hook options, and the abort signal always wins.
- **`useColorScheme` could throw during subscription:** the `matchMedia`
  listener registration was unguarded, so an environment whose `matchMedia`
  throws (or is missing) broke the hook instead of degrading to the system
  default. It is now wrapped like the initial read.
- **`SkipLink` and `BreadcrumbSeparator` never rendered their default text
  under JSX:** both used `children ?? '…'`, but JSX hands `[]` (not
  `undefined`) for no children, so the fallback was unreachable and the
  elements rendered empty. They now use the same `kidsOf()` emptiness check
  as the rest of the catalogue.
- **`DatePicker` displayed `NaN-NaN-NaN` for an invalid `Date` value:** the
  input formatter called `toISODate` on any `Date` instance without the
  validity check `parseDateValue` already performs. Invalid dates now render
  as an empty input.
- **Discarded regions never disposed their effects:** the core subscribed a
  region's content through `usub` and threw away the returned disposer, so
  when a region replaced its content (conditional renders, `For`/`map` rows,
  router outlets, view switches) the removed subtree kept reacting — a
  removed `Title` left `document.title` stale *and* kept writing to it. The
  core (and `lite`) now registers each region's disposer under its start
  marker and runs it for discarded nodes; moved/reused nodes (keyed lists,
  differ output) keep their effects. `Title`'s restore is also guarded so it
  never clobbers a newer title. Cost: +131 B minified (+55 B gzip),
  documented in `scripts/check-size.mjs`.
- **Bindings, list sources and component resources leaked the same way:**
  attribute/property/style/class bindings on a discarded element kept their
  subscriptions, a discarded `map`/`For` kept rebuilding rows, and several
  components never released what they created — `Dialog`/`CommandPalette`/
  `ContextMenu`/`Lightbox` document listeners lived forever, a dead `Dialog`
  could re-lock the body scroll from its stale subscription, a dead `Toast`
  still fired `onClose`, `TimeAgo`/`CountdownTimer` intervals and
  `InfiniteScroll`'s observer never stopped. Bindings and the list source
  now join the same core teardown registry, and components register a
  teardown (document listener removal, interval/observer stop, source
  unsubscribe) that runs when their subtree is discarded. Cost: +91 B
  minified (+43 B gzip), also documented in `scripts/check-size.mjs`.
- **Exports condition order:** in the `.`, `./lite`, `./jsx-runtime` and
  `./jsx-dev-runtime` entries, `default` was listed before `require`, so
  `require('uele')` resolved the ESM build instead of the CJS one. On Node 18
  and Node < 20.19 that throws `ERR_REQUIRE_ESM` (despite `engines: >=18`);
  elsewhere it silently loaded a second module instance, so presets installed
  through one entry did not apply to the other. `require` now precedes
  `default`, matching the subpath entries (`uele/ui`, `uele/hooks`, …) that
  were already correct. The pack smoke test now asserts the resolved filename
  so this cannot regress behind Node ≥ 22's `require(esm)` support. Also
  added: a `LICENSE` file, and `prepack`/`prepublishOnly` scripts so a publish
  can never ship a stale or missing `dist`.
- **`Checkbox` silently dropped its label text:** children (and the `label`
  prop a test already passed) were destructured and discarded, so
  `<Checkbox>Accept terms</Checkbox>` rendered a bare, unlabelled input and
  the text vanished. It now follows `Radio`'s contract: label text wraps the
  input in a `<label>`; without text it stays a bare input. (Found by the new
  axe suite, `test/a11y.test.jsx`.)
- **`Textarea` silently dropped its children:** string children are a
  textarea's initial value in HTML, but they were ignored entirely. They now
  seed the value (explicit `value`/`model` still win, non-string children
  still ignored). (Also found by the axe suite.)
- **`useThrottleFn` fired its trailing call with stale arguments:** calls
  inside the throttle window were dropped, and the trailing edge used the
  first delayed call's arguments (the test suite even pinned this). It now
  matches `useThrottle`: one trailing edge, at the original deadline, with
  the most recent call's arguments; `cancel()` drops it.
- **`AlertDialog`/`CommandPalette` ignored a plain-boolean `open`:** only a
  cell-valued `open`/`model` was honored, so `open={true}` rendered nothing.
  A boolean now seeds the open state (a cell stays fully controlled, and
  Cancel/Confirm/Escape close a boolean-opened dialog as usual).
- **`VirtualList` rendered nothing for string heights:** the documented
  `height: "100px"` form was divided raw (`"100px" / 32` is `NaN`), emptying
  the window. The px value is now parsed for the windowing math (unparseable
  strings fall back to the 320 default); the container keeps the CSS height.

### Added

- **Real-browser test pass (`npm run test:browser`):** Playwright + axe-core
  (`test/browser/`) boot the built bundles in a pinned Chromium
  (`@sparticuz/chromium`, same binary locally and in CI), assert a clean
  console, drive Switch/Accordion/Tabs/Dialog with real input, verify
  Title-region teardown restores `document.title`, exercise router link
  interception and history, and require zero wcag2a/wcag2aa violations.
  The jsdom suites remain the coverage gate; this pass proves the shipped
  artifacts in an actual browser engine. The same axe rule set (minus colour
  contrast, which needs rendered pixels) also runs in jsdom on every
  `npm test` via `test/a11y.test.jsx`, so a11y regressions fail locally
  without a browser — it immediately caught the `Checkbox`/`Textarea`
  labelling fixes above.
- **`uele/adapters/signals` — `@webreflection/signals` is the twelfth signal
  preset:** `useSignals()` wires WebReflection's Preact-like `Signal`
  implementation (same author as `usignal`). The adapter swallows effect
  return values, which that library would otherwise invoke as cleanups (uele
  callbacks may return nodes). Ships with types, optional-peer wiring, a
  todos example, and full matrix coverage (preset conformance, `uele/reactive`
  authoring, and the sample pages on all nine effect-capable presets).
- **`examples/pages/` (repository examples, not shipped in the tarball)** — seven
  self-contained sample pages (login, dashboard, tables, website, settings, shop, chat)
  written once against the unified layer (`uele/reactive` + `uele/hooks` + `uele/ui` +
  `uele/themes`); no page imports a signal library, so any effect-capable preset runs
  them unchanged. Covered by `test/pages.test.jsx`: a source guard enforces the unified
  imports, and every page's interactive flows are driven through the DOM on all eight
  effect-capable presets, plus first paint on the three subscribe-only presets.
- **`uele/ui` — 45+ new primitives (85 exports):**
  `Radio`/`RadioGroup`, `Switch`, `Slider`, `Rating`, `NumberInput`,
  `SearchInput`, `OTPInput` (+`PinInput`/`OTP`), `TagInput`, `FileInput`,
  `Dropzone`, `Combobox`, `Grid`, `Container`, `Center`, `Spacer`,
  `Separator`, `AspectRatio`, `ScrollArea`, `Heading`, `Text`, `Link`, `Kbd`,
  `Code`, `Blockquote`, `List`/`ListItem`, `Badge`, `Avatar`, `Skeleton`,
  `Spinner`, `Alert`, `Progress`, `Stat`, `Empty`, the `Table` family,
  `Breadcrumb`, `Pagination` (+ pure `paginationRange`), `Tabs`/`TabList`/
  `Tab`/`TabPanel`, `Accordion`, `Collapsible`, `Dialog`, `Drawer`,
  `Popover`, `Tooltip`, `Menu`/`DropdownMenu`, `Toast`/`Toaster`, `Stepper`,
  `Carousel`, `FieldHint`, `FieldError`. All controlled/uncontrolled in the
  Radix pattern (`model`/`defaultValue`/`onChange`), with roles, `aria-*`,
  keyboard support, `data-state` hooks and `--uele-*` theme variables.
- **`uele/ui` — real-world wave (129 exports):** `Toggle`/`ToggleGroup`,
  `SegmentedControl`, `MultiSelect`, `Listbox`, `PasswordInput`,
  `ColorPicker`, `Calendar`, `DatePicker`, `CommandPalette` (+`Command`),
  `DataTable` (sortable, pageable), `Tree`/`TreeView`, `VirtualList`,
  `InfiniteScroll`, `ContextMenu`, `NavigationMenu`, `HoverCard`,
  `AlertDialog`/`ConfirmDialog`, `Sheet`, `SplitPane`/`Resizable`,
  `Editable`, `CopyButton`, `Lightbox`/`Gallery`, `FileList`, `Wizard`,
  `TimeAgo`/`RelativeTime`, `CountdownTimer`, `AvatarGroup`, `InputGroup`,
  `StatusDot`, `Toolbar`, `Navbar`, `AppShell`, `Timeline`,
  `VisuallyHidden`, `SkipLink`.
- **`uele/hooks` (new subpath):** `useToggle`, `useDisclosure`, `useCounter`,
  `useControllable`, `usePrevious`, `useList`, `useHistory`, `useAsync`,
  `useDebounce`/`useDebounceFn`, `useThrottle`/`useThrottleFn`, `useInterval`,
  `useTimeout`, `useCountdown`, `useStopwatch`, `useNow`/`useClock`,
  `useLocalStorage`, `useSessionStorage`, `useMediaQuery`, `useOnline`,
  `useWindowSize`, `useEventListener`, `useKeyPress`, `useHotkey`,
  `useClickOutside`, `useHover`, `useFocus`, `useClipboard`, `useFetch`,
  `useWebSocket`, `useEventSource`, `useBroadcastChannel`, `useGeolocation`,
  `useDocumentVisibility`, `useWindowFocus`, `useScrollPosition`,
  `useScrollLock`, `useFocusTrap`, `useFullscreen`, `useBreakpoint`,
  `useColorScheme`/`useDarkMode`, `useQueryParam`, `useCookie`, `useIdle`,
  `useLongPress`, `useSwipe`, `useAnimationFrame`, `useInView`, `useTitle`,
  `useLatest`, `useIsMounted`, `useId`, `usePagination`, `useOTP`,
  `useForm`, `useSignal`, `useComputed`, `useEffect`.
- **`uele/themes` (new subpath):** `createTheme`/`defineTheme`, preset
  `themes` (light, dark, midnight, forest, sunset, ocean, highContrast) and
  eleven accent scales, `cssVars`/`stylesheet`, reactive `ThemeProvider`
  and `ThemeStyle`, `useTheme`, `applyTheme`, `prefersColorScheme`, and
  `cx` + `cva`-style `variants`/`styled`. Density (`compact`/`comfortable`)
  and spacing/type scales are emitted as CSS variables.
- `examples/dashboard.jsx`: the catalogue composed into a themed admin
  screen (AppShell, Stat cards, searchable DataTable, Dialog,
  CommandPalette), driven by the test suite.
- Type declarations for every new export; CJS twins for `uele/hooks` and
  `uele/themes` in the build; both subpaths covered by the pack smoke test.

### Fixed

- `Drawer` (and its new alias `Sheet`) is now actually anchored to its edge
  with side-appropriate geometry instead of rendering a centred dialog.
- `Dialog` locks body scroll while open, closes on a global Escape and
  moves focus into the panel when opened.
- `useThrottle`'s trailing edge now publishes the latest value instead of
  the first delayed one.

## 0.10.3 and earlier

Releases before this changelog was introduced — see the git history and
tags on GitHub for details. Highlights of the 0.10 line: the eleven signal
presets (`uele/adapters/*`), eight diff engines (`uele/diffs/*`), the
`uele/reactive` authoring layer, `uele/flow` and `uele/router`, and the
keyed-diff conformance suite (42 250 list transitions).
