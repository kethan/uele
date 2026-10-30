# Production-readiness review — 2026-10-30

This is working-tree validation, not a publication or deployment. Run on Node 22.

## Public modules retained

| Area | Review / purpose |
| --- | --- |
| `src`, `core`, `tiny`, `lite`, `utils` | One renderer, exactly three variants; core/tiny are aliases. Shared helpers, independent full/lite configuration. |
| `signals` | All 19 supported signal integrations retained, including declarations and generated CJS builds. |
| `diffs` | All 13 documented engines retained. Internal `util.js` remains necessary for morphing adapters, but is blocked as a public entry. |
| `reactive`, `flow` | Signal-agnostic authoring facade and all control-flow components retained; full keeps map, f, lazy and r. |
| `router`, `hooks`, `ui`, `themes` | Public APIs preserved; exercised by behavioral, ownership and browser suites. |
| `props`, `setup`, JSX runtimes | Application props, teardown helpers, installer and automatic JSX paths retained. |
| `examples` | Existing examples preserved; added the no-preset State todo with a runnable HTML entry. |
| `test`, `scripts`, CI | Coverage, typed consumers, clean installation, full ESM/CJS behavior, strict size gates and Chromium checks retained/strengthened. |
| `docs`, `benchmarks` | Current guidance distinguished from historical evidence. Guarded renderer experiments, Vue-RC checks, generators and the usub regression reproducer are still useful; not deleted merely because they are opt-in. |

## Evidence-based cleanup

- Removed unused router imports (`add`, `read`) and unused `scoped` imports in four presets.
- Removed unused automatic-JSX `h` imports from two examples and an unused pack-script variable.
- Removed private `core/utils.js`, which only re-exported the real shared helpers; tests now import `utils/index.js` directly. That compatibility path was not a public export.
- Removed the redundant object-spread allocation before `Object.assign` in preset installation; semantics and full coverage preserved.
- Fixed stale lite terminology in the documentation generator and a stale router return-shape comment.
- Kept generated CommonJS distribution entries and public features; lack of internal callers is not proof an exported API is dead.

`npm run audit:release` inventories repository files (excluding dependency/build/cache trees), verifies local import paths and concrete public targets, checks wildcard exports across **all** conditions, respects blocked helpers, and checks unused private runtime bindings. Its tests prove missing wildcard types, unresolved imports and unused locals fail. This is not a claim that static analysis proves every possible dynamic path or code branch useful.

## State demonstration

- [`State` and the example-only bridge](../examples/state/state.js)
- [Todo application](../examples/todos/state.js)
- [Runnable page](../examples/state/index.html)
- [Usage, limitations and owned teardown](../examples/README.md#todos--your-dead-simple-state-no-signal-package)

The original State semantics are preserved. Full uele consumes the bridge's `.subscribe()` without a preset or global API changes. No new public state primitive, signal adapter or renderer variant was added. Chromium verifies that the page loads no signal package/preset, safely renders text, toggles strike-through, retains keyed rows, deletes and unmounts. The demo server also refuses dotfiles, including `.git/config`; it is development-only, not a production server.

## Release verification

```sh
npm ci
npm run test:release
# Arena's extracted Chromium libraries, if needed:
# UELE_CHROMIUM_LIBS=/tmp/uele-chromium-deps/lib npm run test:release
```

The release command runs build, 100%-coverage source/core suites, built ESM/CJS suites, type tests, static audit, unchanged library/app size gates, a packed clean consumer, and Chromium. It is also the `prepublishOnly` gate. CI explicitly includes core coverage, core size and static audit.

### Final clean-install results

`npm ci` and `npm run test:release` both completed successfully:

| Check | Result |
| --- | --- |
| Source suite | **2,560 tests**, 71 files; **100%** statements/branches/functions/lines |
| Production-core suite | **2,560 tests**, 71 files; **100%** statements/branches/functions/lines |
| Built ESM suite | **1,781 tests**, 33 files (including the State example) |
| Built CJS suite | **1,446 tests**, 23 files (including the State example) |
| Chromium | **14 tests**, including the no-preset State page |
| Source/packed-consumer types | Pass |
| Clean installed consumer | ESM/CJS exports pass, including all 19 signal and 13 diff integrations; rejected private entries remain rejected |
| Static audit | 335 repository files inventoried, 289 code files, 56 runtime sources, 197 local imports and 141 concrete public targets checked |
| Existing library and complete-app size gates | Pass; no budget raised |

Complete tiny app gzip sizes remain **966 / 1,051 / 1,248 / 1,473 bytes** for
hello, counter, ulive counter and ulive todo respectively. These are not size
claims for the new **full-renderer** State demo. Core remains 975 B gzip, lite
1,359 B gzip and full 1,881 B gzip for their previously documented artifact formats.
The unminified full ESM artifact is 9,401 B / 3,480 B gzip. All byte counts exclude
HTML/transport headers; see the [size methodology](../examples/size-proof/README.md).

`git diff --check` is clean. There is no claim that passing tests guarantees a
bug-free deployment; the known toolchain advisory and release-version decision
below are still explicit follow-ups.

### Security review

- `npm audit --omit=dev`: **zero reported advisories** in the installed runtime dependency graph.
- Updated the lockfile's build-only `serialize-javascript` from 7.1.2 to **7.1.4**, fixing its reported advisory.
- Full `npm audit` still reports **two low-severity entries for one dependency chain**: `@rollup/plugin-node-resolve → deepmerge` ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)). There is no upstream patched version as of this review; the latest resolver also depends on the affected deepmerge range. The current resolver's only merge call copies its hardcoded defaults, not application data. This is build-only, not shipped renderer code.
- Did not run `npm audit fix --force`, downgrade the resolver several majors, add an unmaintained fork, suppress the advisory or claim the entire toolchain is warning-free. Track the upstream fix and reassess the build-tool dependency before the eventual publication.

Choose a release version for the breaking API migration and review the Unreleased changelog before publishing. No commit, push or publish was performed in this task.
