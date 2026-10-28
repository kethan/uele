export const title = "UI Components";

export const markdown = `## uele/ui — 129 headless UI primitives

uele/ui ships **129 headless UI primitives** — Radix-style components that handle behavior, accessibility and keyboard, but carry no CSS of their own. They read the \`--uele-*\` CSS variables from [uele/themes](#themes) (with light-theme fallbacks), so a theme swap restyles everything with one reactive write.

Every prop is **live**: pass a signal cell, a thunk or a plain value anywhere a value is expected and it updates on change. Form controls take \`model\` for two-way binding — pass the cell as \`value\` / \`checked\` instead and it becomes the model automatically.

State components (Tabs, Dialog, Pagination, OTP…) follow the Radix controlled/uncontrolled pattern: pass \`model\` (or \`value\` / \`open\`) to control them, \`defaultValue\` / \`defaultOpen\` to seed them, \`onChange\` to listen.

## By category

### Forms

| Component | Props | Description |
| --- | --- | --- |
| \`Button\` | \`variant?, size?, disabled?, ...\` | Solid / outline / ghost buttons |
| \`Input\` | \`model?, value?, onInput?, ...\` | Text input with two-way \`model\` binding |
| \`Textarea\` | \`model?, value?, onInput?, ...\` | Multi-line text input |
| \`Checkbox\` | \`model?, checked?, label?, ...\` | Checkbox with label |
| \`Select\` | \`model?, options?, value?, ...\` | Native select with option children |
| \`Radio\` / \`RadioGroup\` | \`model?, value?, name?, ...\` | Radio buttons |
| \`Switch\` | \`model?, checked?, label?, ...\` | Toggle switch |
| \`Slider\` | \`model?, min?, max?, step?, ...\` | Range slider |
| \`Rating\` | \`model?, max?, onChange?, ...\` | Star rating |
| \`NumberInput\` | \`model?, min?, max?, step?, ...\` | Numeric spinner |
| \`SearchInput\` | \`model?, placeholder?, onSearch?, ...\` | Search with submit |
| \`OTPInput\` / \`PinInput\` | \`length?, model?, onComplete?, ...\` | One-time password input |
| \`TagInput\` | \`model?, placeholder?, onChange?, ...\` | Comma-separated tags |
| \`FileInput\` | \`onFiles?, accept?, multiple?, ...\` | File picker |
| \`Dropzone\` | \`onFiles?, accept?, multiple?, ...\` | Drag-and-drop drop zone |
| \`Combobox\` | \`model?, options?, placeholder?, ...\` | Searchable dropdown |

### Layout

| Component | Props | Description |
| --- | --- | --- |
| \`Stack\` | \`children\` | Vertical stack |
| \`Row\` | \`children\` | Horizontal row |
| \`Grid\` | \`columns?, gap?, children\` | CSS grid |
| \`Container\` | \`maxWidth?, children\` | Constrained-width container |
| \`Center\` | \`children\` | Flex center |
| \`Spacer\` | \`size\` | Empty spacer |
| \`Separator\` | \`orientation?, decorative?, ...\` | Divider line |
| \`AspectRatio\` | \`ratio?, children\` | Fixed aspect-ratio box |
| \`ScrollArea\` | \`maxHeight?, children\` | Scrollable region |

### Typography

| Component | Props | Description |
| --- | --- | --- |
| \`Heading\` | \`level?, children\` | \`<h1>\`–\`<h6>\` |
| \`Text\` | \`as?, children\` | \`<p>\` by default, any element |
| \`Link\` | \`href?, children\` | Anchor with target handling |

### Feedback

| Component | Props | Description |
| --- | --- | --- |
| \`Badge\` | \`tone?, children\` | Colored status badge |
| \`StatusDot\` | \`children\` | Colored dot |
| \`Spinner\` | \`label?, ...\` | Loading spinner |
| \`Text\` | \`as?, children\` | Paragraph text |

### Disclosure

| Component | Props | Description |
| --- | --- | --- |
| \`Tooltip\` | \`label?, children\` | Hover tooltip |
| \`Dialog\` | \`model?, ...\` | Modal dialog |
| \`Drawer\` | \`model?, ...\` | Side drawer |
| \`Palette\` | \`model?, ...\` | Command palette (⌘K) |
| \`Toaster\` | \`...\` | Toast notifications |
| \`Countdown\` | \`seconds?, ...\` | Timer display |

### Navigation

| Component | Props | Description |
| --- | --- | --- |
| \`Tabs\` | \`model?, children\` | Tabbed panels |
| \`Stepper\` | \`model?, ...\` | Multi-step wizard |
| \`Breadcrumb\` | \`...\` | Breadcrumb trail |
| \`Menu\` | \`...\` | Dropdown menu |
| \`Accordion\` | \`...\` | Collapsible sections |
| \`Collapsible\` | \`...\` | Single collapsible |

### Data display

| Component | Props | Description |
| --- | --- | --- |
| \`Table\` | \`...\` | Data table |
| \`VirtualList\` | \`...\` | Windowed long lists |
| \`Tree\` | \`...\` | Tree view |
| \`Timeline\` | \`...\` | Chronological list |
| \`Carousel\` | \`...\` | Image carousel |

### Overlays

| Component | Props | Description |
| --- | --- | --- |
| \`Dialog\` | \`model?, ...\` | Modal |
| \`Drawer\` | \`model?, ...\` | Slide-in panel |
| \`Popover\` | \`...\` | Floating panel |

---

> **Headless means headless.** uele/ui provides behavior and ARIA, not looks. Style the components with your own CSS — or use [uele/themes](#themes) for a ready-made design system.

---

> **This site is built with uele** — it uses uele/ui components, uele/themes for theming, and uele/router for navigation.

---

> Next: [**Reactive**](#/reactive) — signal, computed, effect and the preset system.
`;
