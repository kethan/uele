# Runnable application size proofs

These examples demonstrate the complete JavaScript payload of the **current
working-tree build**. They are not measurements of an already-published npm
release, nor claims that every entry, signal library or application has the same size.

| Example | Public entry | State mechanism | Minified B | Gzip B | Brotli B | Strict gzip limit |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| [Hello World](hello.js) | `uele/tiny` | static | 1855 | **966** | 868 | <1000 B |
| [Stateful component](counter.js) | `uele/tiny` | `useLive` | 2033 | **1051** | 945 | <1400 B |
| [Signal component](signal-counter.js) | `uele/tiny` | ulive signal/effect | 2457 | **1248** | 1131 | <1400 B |
| [Signal todo](todo.js) | `uele/tiny` | ulive + cached rows | 2906 | **1473** | 1321 | <1800 B |

Here **1 kB = 1000 bytes**, not 1024. “1.4b” is interpreted as 1.4 kB.
Node's default gzip level and explicit level 9 currently produce the same byte
counts for these examples; **both** must pass the strict limits.

## What is included?

- Every byte of the self-contained executable application JavaScript.
- The real built renderer selected by package.json's public import exports.
- App/component code and event handlers.
- ulive 1.0.7, plus all explicit renderer-hook integration code, in the signal
  counter and todo. No signal code is provided by a global or another request.
- Todo form submission, blank-input rejection, stable IDs, completion toggles and
  deletion. Each todo object caches its own row node, preserving DOM identity for
  retained items. User input is rendered as text. This tiny example uses native
  Array.map, not the full entry's map/For helpers; those are tested separately.

The explicit tiny integrations support the cell/thunk shapes demonstrated here;
they do not include all of full's source-handling features.
The batteries-included `uele` entry (usub, namespaces, default swapdom) is **not**
used or claimed to be under these app budgets. All four examples use `uele/tiny`.
There are only three renderer variants: core/tiny, lite and full (`uele`).

Not included: the HTML shell, transport headers, TLS, browser/platform code,
CSS or images (these examples load none), source maps, tooling, or polyfills.
A server must enable gzip or serve the precompressed artifact with the correct
Content-Encoding for these to be compressed network payload sizes. The test
static server serves the JavaScript uncompressed; the compressed proof is
verified independently by byte count and exact gzip round-trip.

## Reproduce

From the repository root, using the locked dependencies:

```sh
npm ci
npm run build
npm run size:apps
npm run test:flow
npm run test:browser
```

On Linux containers missing Chromium's system libraries, provide
`UELE_CHROMIUM_LIBS=/path/to/libs` for the browser command. A local system Chromium
may be selected using `PLAYWRIGHT_EXECUTABLE_PATH`.

The size checker:

1. Resolves the examples' uele import using the package's actual public import
   export, pointing to the freshly built artifact—not a test renderer or facade.
2. Rollup-bundles the entire application and all dependencies into one ESM chunk.
3. Rejects external imports and dynamic-import chunks.
4. Terser-minifies with module/mangle enabled, three safe compression passes.
5. Measures minified bytes, gzip level 9, Node's default gzip, and Brotli quality 11.
6. Fails if either gzip measurement is **greater than or equal to** its limit.
7. Writes generated JS and .js.gz files under ignored `dist/`, and a small
   [results.json](results.json) with tool versions and exact SHA-256 bundle hashes.

Open `hello.html`, `counter.html`, `signal-counter.html`, or `todo.html` through
a static server rooted at this repository after building. Each HTML file loads
exactly one corresponding measured bundle; do not open the JS modules as file://.

## Browser verification and continuous enforcement

`test/browser/size-proof.pw.mjs` checks hashes, gzip round-trips and strict byte
limits, then runs the exact measured JS in Chromium. It records JavaScript
requests and asserts that no additional scripts load. It tests both counters
through positive/negative updates, and todo blank-input rejection, add/toggle/
delete, empty-list recovery, literal HTML-like user text, and retained-row identity.

`size:apps` is enforced in CI and prepublish. Browser runs regenerate proof
artifacts first. CI publishes the executable bundles, .gz files and JSON report
as the `runnable-app-size-proofs` artifact. Sources stay readable and generated
bundles remain outside Git.
