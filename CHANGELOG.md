# Changelog

All notable changes to `uele` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[semver](https://semver.org/): minor releases add features, patches fix bugs.

## Unreleased

### Added
- `examples/pages/` — seven self-contained sample pages (login, dashboard, tables, website,
  settings, shop, chat) written once against the unified layer (`uele/reactive` + `uele/hooks`
  + `uele/ui` + `uele/themes`); no page imports a signal library, so any effect-capable preset
  runs them unchanged. Covered by `test/pages.test.jsx` (66 tests): a source guard enforces the
  unified imports, and every page's interactive flows are driven through the DOM on all eight
  effect-capable presets, plus first paint on the three subscribe-only presets.

## 0.11.0 — 2026-10-16

The UI release: `uele/ui` grows from a dozen wrappers into a full
Radix-style component catalogue, joined by two new subpaths — `uele/hooks`
and `uele/themes` — all built on `uele/reactive`, so everything runs on
every signal preset (ulive, preact, vue, usignal, alien-signals, s-js, mobx,
solid, and the subscribe-only rxjs/nanostores/tanstack where applicable).

### Added

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
