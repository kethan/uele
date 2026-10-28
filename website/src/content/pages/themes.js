export const title = "Themes";

export const markdown = `## uele/themes — design tokens and ThemeProvider

uele/themes is **Radix Themes-style**: CSS custom properties, accent colors, a \`cva\)-style \`variants\) helper, and a \`ThemeProvider\) that applies tokens to a wrapper element. uele/ui primitives read \`--uele-*\) variables with light-theme fallbacks, so swapping themes restyles everything instantly.

## API

| Export | Signature | Description |
| --- | --- | --- |
| \`accents\) | \`{ slate, blue, emerald, rose, amber, violet, cyan, pink, orange, teal, neutral }\) | Accent color scales |
| \`createTheme\) | \`(options)\) → theme\) | Create a theme object |
| \`lightTheme\) / \`darkTheme\) | \`theme\) | Built-in light and dark themes |
| \`ThemeProvider\) | \`{ theme, children, style, ...props }\) | Applies \`--uele-*\) CSS variables |
| \`ThemeStyle\) | \`{ theme, selector }\) | Renders tokens as \`<style>\) text |
| \`useTheme\) | \`(initial)\) → { scheme, dark, toggle, setScheme }\) | Reactive theme hook |
| \`cx\) | \`(...parts)\) → string\) | Class-name merger (cva-style) |
| \`variants\) | \`(config)\) → fn\) | CVA-style variant helper |
| \`styled\) | \`(tag, config)\) → component\) | Styled component factory |

## Usage

\`\`\`jsx live
import { h, For } from "uele";
import { signal, computed, effect, write, read } from "uelethemes/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Button, Badge, StatusDot, Spinner, Toggle,
  SegmentedControl, Stack, Row, Text,
} from "uele/ui";

const notify = signal(false);
const view = signal("grid");

document.body.append(
  <ThemeProvider theme="light">
    <Stack>
      <Row>
        <Button variant="solid">Solid</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="solid" size="sm">Small</Button>
        <Button variant="solid" size="lg">Large</Button>
        <Button variant="solid" disabled>Disabled</Button>
      </Row>
      <Row>
        <Badge tone="success"><StatusDot /> Active</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="danger">Failed</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="neutral">Neutral</Badge>
      </Row>
      <Row>
        <Spinner label="Saving" />
        <Text>Saving your changes…</Text>
        <Toggle model={notify}>Notify by email</Toggle>
        <span>Toggle is {() => (read(notify) ? "on" : "off")}.</span>
      </Row>
      <Row>
        <Tooltip label="Switch the layout density">
          <SegmentedControl
            model={view}
            onChange={(v) => write(view, v)}
          >
            {("grid" === read(view) ? <button>Grid</button> : <button>List</button>)}
            {("list" === read(view) ? <button>List</button> : <button>Grid</button>)}
          </SegmentedControl>
        </Tooltip>
      </Row>
    </Stack>
  </ThemeProvider>
);
\`\`\`

## Dark mode

\`\`\`js
import { useTheme } from "uele/themes";

const { scheme, dark, toggle } = useTheme("light");
\`\`\`

\`useTheme\) reads \`prefers-color-scheme\), remembers an explicit override in localStorage (key \`uele-scheme\)), and returns \`scheme\) / \`dark\) cells plus a \`toggle()\) function.

---

> Next: [**Router**](#/router) — client-side routing for uele apps.
`;
