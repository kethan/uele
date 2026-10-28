export const title = "Themes";

export const markdown = `# uele/themes — design tokens and ThemeProvider

uele/themes is **Radix Themes-style**: CSS custom properties, accent colors, a \`cva\`-style \`variants\` helper, and a \`ThemeProvider\` that applies tokens to a wrapper element. uele/ui primitives read \`--uele-*\` variables with light-theme fallbacks, so swapping themes restyles everything instantly.

## How theming works

uele injects CSS custom properties onto a wrapper element (usually \`<body>\`) via \`ThemeProvider\`. Every uele/ui component references those variables, so changing a theme variable restyles all components at once — no rebuild needed.

## 1. Wrap your app in ThemeProvider

\`\`\`jsx
import { ThemeProvider } from "uele/themes";
import { lightTheme, darkTheme } from "uele/themes";

// Apply a theme to the whole page
document.body.append(
  <ThemeProvider theme={lightTheme}>
    <YourApp />
  </ThemeProvider>
);
\`\`\`

Or use the \`selector\` prop to scope tokens to a specific element instead of \`:root\`:

\`\`\`jsx
<ThemeProvider theme={lightTheme} selector="#app">
  <YourApp />
</ThemeProvider>
\`\`\`

## 2. Switch themes at runtime

\`\`\`jsx
import { useTheme } from "uele/themes";
import { lightTheme, darkTheme } from "uele/themes";

const { scheme, dark, toggle, setScheme } = useTheme("light");

// scheme is "light" or "dark"
// dark is a boolean cell
// toggle() flips between light and dark
// setScheme("dark") forces a specific theme
\`\`\`

\`useTheme\` reads \`prefers-color-scheme\`, remembers an explicit override in localStorage (key \`uele-scheme\`), and returns reactive cells. Your UI updates automatically when the user changes their OS preference.

## 3. Colors — accents and tones

### Accents

\`accents\` exports 11 color scales:

\`\`\`js
import { accents } from "uele/themes";

accents.slate   // neutral grays
accents.blue
accents.emerald
accents.rose
accents.amber
accents.violet
accents.cyan
accents.pink
accents.orange
accents.teal
accents.neutral
\`\`\`

Each accent has light and dark variants. Components use the accent for \`--uele-accent\), \`--uele-accent-contrast\`, etc.

### Tones

Tones map to accent colors for status semantics:

| Tone | Accent | Use |
| --- | --- | --- |
| \`success\` | emerald | Confirmation, completed actions |
| \`warning\` | amber | Caution, attention needed |
| \`danger\` | rose | Errors, destructive actions |
| \`info\` | blue | Informational messages |
| \`neutral\` | slate | Muted, secondary UI |

Use \`tone\` on \`Badge\`, \`StatusDot\`, \`Button\` etc.:

\`\`\`jsx
import { Badge, Button } from "uele/ui";

<Badge tone="success">Active</Badge>
<Badge tone="danger">Failed</Badge>
<Button variant="solid" tone="danger">Delete</Button>
\`\`\`

## 4. Component sizing and variants

### Button sizes

\`variant\` and \`size\` are props on most components:

| Prop | Values | Default |
| --- | --- | --- |
| \`variant\` | \`solid\`, \`outline\`, \`ghost\` | \`solid\` |
| \`size\` | \`sm\`, \`md\`, \`lg\` | \`md\` |

\`\`\`jsx
import { Button } from "uele/ui";

<Button variant="solid" size="sm">Small solid</Button>
<Button variant="outline" size="md">Outline medium</Button>
<Button variant="ghost" size="lg">Ghost large</Button>
\`\`\`

### Making components look good

1. **Pick one accent** for your brand (e.g. \`accents.indigo\` or \`accents.blue\`)
2. **Set it once** via \`createTheme\` or \`ThemeProvider theme={...}\`
3. **Use tones consistently** — \`success\` for positive, \`danger\` for destructive
4. **Mix sizes** — \`sm\` for toolbars, \`lg\` for primary calls-to-action
5. **Let uele/ui handle focus, hover, active states** — all components ship with keyboard navigation and ARIA built in

## 5. Create a custom theme

\`\`\`js
import { createTheme } from "uele/themes";

const myTheme = createTheme({
  accent: accents.blue,
  scaling: 100,          // base font-size multiplier (100 = 16px)
  radius: 8,             // border-radius in px
  gray: accents.slate,   // neutral scale
});

// Use it:
<ThemeProvider theme={myTheme}>
  <YourApp />
</ThemeProvider>
\`\`\`

\`createTheme\` accepts:

| Option | Type | Description |
| --- | --- | --- |
| \`accent\` | accent object | Primary brand color scale |
| \`gray\` | accent object | Neutral/gray color scale |
| \`scaling\` | number | Base font-size percentage (default 100) |
| \`radius\` | number | Border-radius in px (default 6) |

## 6. Theming primitives for your own components

Use \`cssVars\` to read theme tokens in your own CSS-in-JS or styled components:

\`\`\`js
import { cssVars } from "uele/themes";

const vars = cssVars(lightTheme);
// vars = { "--uele-accent": "#2563eb", "--uele-accent-contrast": "#ffffff", ... }
\`\`\`

Or use \`ThemeStyle\` to render tokens as a \`<style>\` block:

\`\`\`jsx
import { ThemeStyle } from "uele/themes";

<ThemeStyle theme={myTheme} />
\`\`\`

## 7. Built-in themes

\`lightTheme\` and \`darkTheme\` are ready to use:

\`\`\`jsx
import { ThemeProvider, lightTheme, darkTheme } from "uele/themes";

const [isDark, setIsDark] = useLive(false);

<ThemeProvider theme={isDark ? darkTheme : lightTheme}>
  <YourApp />
</ThemeProvider>
\`\`\`

---

> **This site is built with uele** — it uses uele/ui components, uele/themes for light/dark mode, and uele/router for client-side navigation.

---

> Next: [**Router**](#/router) — client-side routing for uele apps.
`;
