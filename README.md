# UEle

A Reactive frontend library.

[![Version](https://img.shields.io/npm/v/uele.svg?color=success&style=flat-square)](https://www.npmjs.com/package/uele)
[![Badge size](https://img.badgesize.io/https://unpkg.com/uele?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/uele)

**yarn**: `yarn add uele`

**npm**: `npm i uele`

**cdn**: https://unpkg.com/uele

**module**: https://unpkg.com/uele?module

-   **Small** 1KB gzip.
-   **Fast**
-   **JSX**
-   **Fragment**
-   **Components**
-   **SVG**
-   **Refs**
-   **Style Maps**
-   **Simple API**
-   **Lazy Components**
-   **Promise**
-   **AscynIterable**
-   **Rxjs Subscribe**
-   **Reactive Subscribe**

### Example

```jsx
import { h, Fragment, lazy } from "uele";

const App = () => <main>{Promise.resolve("App")}</main>;

document.body.append(<App />);
```
## Thanks and Inspiration

-   **[bruh](https://github.com/Technical-Source/bruh)**
-   **[dy](https://github.com/dy)**

## License

MIT
