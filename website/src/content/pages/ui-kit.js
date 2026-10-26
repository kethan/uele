// UI Kit: complete catalog of uele/ui (all 129 exports) with live, editable
// examples. Every fence is a standalone app: preset first, then themed via
// uele/themes, then components bound through `model` cells.
import { UI_GROUPS, UI_COMPONENT_COUNT } from "../ui-catalog.js";

const tableFor = (group) => {
  const rows = group.components
    .map(
      (c) =>
        `| \`${c.name}\` | ${c.alias ? "_Alias_ — " : ""}${c.desc} |`
    )
    .join("\n");
  return `### ${group.group}\n\n| Component | Purpose |\n| --- | --- |\n${rows}`;
};

const catalog = UI_GROUPS.map(tableFor).join("\n\n");
const fence = (code) => "```jsx live\n" + code.trim() + "\n```";

/* ------------------------------------------------------------- fences */

const buttons = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Button, Badge, StatusDot, Spinner, Toggle,
  SegmentedControl, Tooltip, Stack, Row, Text,
} from "uele/ui";

const notify = signal(false);
const view = signal("grid");

const App = () => (
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
            options={[
              { value: "list", label: "List" },
              { value: "grid", label: "Grid" },
            ]}
          />
        </Tooltip>
        <span>Selected view: {() => read(view)}</span>
      </Row>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const form = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read, write } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Form, Field, FieldHint, FieldError, Input, Textarea, Select,
  Checkbox, Switch, Slider, Rating, Button, Stack, Card,
} from "uele/ui";

const name = signal("Ada Lovelace");
const role = signal("engineer");
const bio = signal("");
const updates = signal(true);
const dark = signal(false);
const volume = signal(40);
const stars = signal(4);
const done = signal(null);

const App = () => (
  <ThemeProvider theme="light">
    <Card style={{ maxWidth: "28rem" }}>
      <Form onSubmit={() => write(done, { who: read(name), what: read(role) })}>
        <Stack>
          <Field label="Full name">
            <Input model={name} placeholder="Your name" />
            <FieldHint>Shown on your public profile.</FieldHint>
          </Field>
          <Field label="Role">
            <Select
              model={role}
              options={[
                { value: "engineer", label: "Engineer" },
                { value: "designer", label: "Designer" },
                { value: "pm", label: "Product manager" },
              ]}
            />
          </Field>
          <Field label="Bio">
            <Textarea model={bio} rows={3} placeholder="Tell us about yourself" />
          </Field>
          <Checkbox model={updates}>Send product updates</Checkbox>
          <Switch model={dark} label="Dark mode" />
          <Field label="Volume">
            <Slider model={volume} min={0} max={100} />
            <span>{() => read(volume)}%</span>
          </Field>
          <Field label="How do you rate uele?">
            <Rating model={stars} />
          </Field>
          <Button variant="solid" type="submit">Sign up</Button>
          {() =>
            read(done)
              ? <FieldError>Signed up {read(done).who} as {read(done).what}.</FieldError>
              : <span />
          }
        </Stack>
      </Form>
    </Card>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const advancedInputs = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read, write } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Field, NumberInput, SearchInput, TagInput,
  PasswordInput, ColorPicker, RadioGroup, OTPInput,
  InputGroup, Input, Dropzone, Text,
} from "uele/ui";

const seats = signal(2);
const query = signal("");
const tags = signal(["react", "uele"]);
const secret = signal("");
const color = signal("#2563eb");
const plan = signal("pro");
const code = signal("");
const handle = signal("");
const picked = signal(0);

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Row>
        <Field label="Seats"><NumberInput model={seats} min={1} max={20} /></Field>
        <Field label="Search"><SearchInput model={query} placeholder="Components…" /></Field>
        <Field label="Handle">
          <InputGroup prefix="@">
            <Input model={handle} placeholder="your-handle" />
          </InputGroup>
        </Field>
      </Row>
      <Field label="Tags">
        <TagInput model={tags} placeholder="Type and press Enter" />
      </Field>
      <Row>
        <Field label="Password">
          <PasswordInput model={secret} showStrength />
        </Field>
        <Field label="Accent">
          <ColorPicker model={color} />
        </Field>
      </Row>
      <RadioGroup
        model={plan}
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "team", label: "Team" },
        ]}
      />
      <Field label="One-time code">
        <OTPInput length={6} model={code} onComplete={(v) => write(code, v)} />
      </Field>
      <Dropzone onFiles={(files) => write(picked, files.length)}>
        Drop files here, or click to browse
      </Dropzone>
      <Text>
        Picked {() => read(picked)} file(s) · plan: {() => read(plan)} ·
        accent {() => read(color)}
      </Text>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const pickers = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Field, Listbox, Combobox, MultiSelect,
  Calendar, DatePicker, Editable, Text,
} from "uele/ui";

const framework = signal("svelte");
const combo = signal("");
const chosen = signal(["vue"]);
const iso = signal("2026-11-02");
const title = signal("Untitled document");

const options = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "solid", label: "Solid" },
];

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Row style={{ alignItems: "flex-start" }}>
        <Field label="Listbox">
          <Listbox model={framework} options={options} />
        </Field>
        <Field label="Combobox">
          <Combobox model={combo} options={options} placeholder="Pick one…" />
        </Field>
        <Field label="Multi-select">
          <MultiSelect model={chosen} options={options} />
        </Field>
      </Row>
      <Row style={{ alignItems: "flex-start" }}>
        <Field label="Calendar (uncontrolled)">
          <Calendar defaultValue={new Date(2026, 10, 2)} />
        </Field>
        <Field label="Date picker">
          <DatePicker model={iso} />
        </Field>
        <Stack>
          <Text as="span">Inline edit:</Text>
          <Editable model={title} placeholder="Click to edit" />
        </Stack>
      </Row>
      <Text>
        Framework: {() => read(framework)} · Date: {() => read(iso)} ·
        Title: {() => read(title)}
      </Text>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const layout = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Grid, Card, Separator, AspectRatio, ScrollArea,
  SplitPane, Heading, Text, Link, Kbd, Code, Blockquote,
  List, ListItem, Avatar, AvatarGroup, Skeleton,
  VisuallyHidden, SkipLink,
} from "uele/ui";

const App = () => (
  <ThemeProvider theme="light">
    <SkipLink href="#main">Skip to content</SkipLink>
    <VisuallyHidden>UI kit layout and typography demo</VisuallyHidden>
    <Stack>
      <Heading level={2}>Typography & layout</Heading>
      <Text>
        Components compose with plain flex and grid primitives. Press{" "}
        <Kbd>Tab</Kbd> to reach the skip link, and open the developer console to
        inspect the real <Code>--uele-*</Code> CSS variables.
      </Text>
      <Blockquote>Small enough to read, complete enough to ship.</Blockquote>
      <List>
        <ListItem>Real DOM nodes, no virtual DOM</ListItem>
        <ListItem>Signals and cells for two-way state</ListItem>
        <ListItem>Themes are plain CSS custom properties</ListItem>
      </List>
      <Grid columns={3}>
        <Card><Heading level={4}>Card one</Heading><Text>Grid cell</Text></Card>
        <Card><Heading level={4}>Card two</Heading><Text>Grid cell</Text></Card>
        <Card><Heading level={4}>Card three</Heading><Text>Grid cell</Text></Card>
      </Grid>
      <Separator />
      <Row>
        <AvatarGroup>
          <Avatar name="Ada Lovelace" />
          <Avatar name="Grace Hopper" />
          <Avatar name="Alan Turing" />
        </AvatarGroup>
        <Link href="#">Team members</Link>
        <Skeleton width="8rem" height="2rem" />
      </Row>
      <AspectRatio ratio="16 / 9">
        <div style={{ background: "var(--uele-accent-soft, #eff6ff)", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
          16:9 media slot
        </div>
      </AspectRatio>
      <SplitPane
        first={<Card style={{ height: "10rem" }}>Left pane — drag the divider</Card>}
        second={<Card style={{ height: "10rem" }}>Right pane</Card>}
      />
      <ScrollArea maxHeight="7rem">
        <Stack>
          {Array.from({ length: 6 }, (_, i) => <Text key={i}>Scroll row {i + 1}</Text>)}
        </Stack>
      </ScrollArea>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const feedback = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read, write } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Grid, Alert, Progress, Stat, Empty,
  CopyButton, Button, Badge,
} from "uele/ui";

const progress = signal(12);
setInterval(() => write(progress, (read(progress) + 7) % 101), 500);

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Grid columns={2}>
        <Alert tone="info" title="Note">Preview builds bundle the whole runtime offline.</Alert>
        <Alert tone="success" title="Deployed">Your site went live without a CDN.</Alert>
        <Alert tone="warning" title="Rate limit">You are close to the hourly quota.</Alert>
        <Alert tone="danger" title="Failed">One example did not compile.</Alert>
      </Grid>
      <Progress value={progress} label="Upload progress" />
      <Grid columns={3}>
        <Stat label="Components" value="129" help="named exports in uele/ui" />
        <Stat label="Bundles" value="11" help="offline vendor modules" />
        <Stat label="Uptime" value="99.98%" help="last 30 days" />
      </Grid>
      <Row>
        <CopyButton text="npm install uele" label="Copy install command" />
        <Badge tone="success">All systems operational</Badge>
      </Row>
      <Empty
        title="No notifications"
        description="When something happens, it will show up here."
      >
        <Button variant="outline">Refresh</Button>
      </Empty>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const tables = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { ThemeProvider } from "uele/themes";
import {
  DataTable, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, VirtualList, Stack, Heading, Card,
} from "uele/ui";

const columns = [
  { key: "city", label: "City", sortable: true },
  { key: "country", label: "Country", sortable: true },
  { key: "people", label: "People (millions)", sortable: true },
];

const data = [
  { city: "Tokyo", country: "Japan", people: 37 },
  { city: "Delhi", country: "India", people: 33 },
  { city: "Shanghai", country: "China", people: 29 },
  { city: "São Paulo", country: "Brazil", people: 22 },
  { city: "Mumbai", country: "India", people: 21 },
  { city: "Cairo", country: "Egypt", people: 22 },
];

const rows = Array.from({ length: 200 }, (_, i) => "Row " + (i + 1));

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Heading level={3}>DataTable — click a header to sort</Heading>
      <DataTable columns={columns} data={data} pageSize={4} />
      <Heading level={3}>Composable table (Thead/Tbody aliases work too)</Heading>
      <Card style={{ padding: 0 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Package</TableHeader>
              <TableHeader>Job</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow><TableCell>uele/ui</TableCell><TableCell>Components</TableCell></TableRow>
            <TableRow><TableCell>uele/themes</TableCell><TableCell>Theming</TableCell></TableRow>
            <TableRow><TableCell>uele/router</TableCell><TableCell>Routing</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
      <Heading level={3}>VirtualList — 200 rows, only a slice in the DOM</Heading>
      <VirtualList
        items={rows}
        itemHeight={32}
        height={160}
        renderItem={(item) => <div style={{ padding: "0.375rem 0.5rem" }}>{item}</div>}
      />
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const treeAndTime = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Card, Tree, Timeline, TimeAgo,
  CountdownTimer, Carousel, Heading,
} from "uele/ui";

const treeItems = [
  {
    label: "src", value: "src",
    children: [
      { label: "app.jsx", value: "app" },
      {
        label: "content", value: "content",
        children: [
          { label: "ui-kit.js", value: "ui-kit" },
          { label: "ui-catalog.js", value: "catalog" },
        ],
      },
    ],
  },
  { label: "package.json", value: "pkg" },
];

const events = [
  { title: "v1.0 released", time: "Today", description: "Stable core and signals." },
  { title: "UI kit added", time: "Last week", description: "129 themed components." },
  { title: "First commit", time: "Last month", description: "The h() function." },
];

const slides = [
  <div style={{ background: "#dbeafe", height: "8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>Slide one</div>,
  <div style={{ background: "#dcfce7", height: "8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>Slide two</div>,
  <div style={{ background: "#fef3c7", height: "8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>Slide three</div>,
];

const picked = signal("");

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Row style={{ alignItems: "flex-start" }}>
        <Card style={{ flex: 1 }}>
          <Heading level={4}>Release history</Heading>
          <Timeline items={events} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Heading level={4}>File tree</Heading>
          <Tree items={treeItems} defaultExpanded={["src", "content"]} model={picked} />
          <p>Selected: {() => read(picked) || "nothing yet"}</p>
        </Card>
      </Row>
      <Row>
        <span>Updated <TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} /></span>
        <span>Break in <CountdownTimer seconds={90} onComplete={() => {}} /></span>
      </Row>
      <Carousel items={slides} />
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const navigation = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Card, Breadcrumb, Pagination, Tabs,
  Stepper, NavigationMenu, Heading,
} from "uele/ui";

const page = signal(1);
const tab = signal("overview");
const step = signal(0);

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <NavigationMenu
        items={[
          { label: "Home", href: "#" },
          {
            label: "Products",
            links: [
              { label: "Core library", href: "#" },
              { label: "UI kit", href: "#" },
              { label: "Themes", href: "#" },
            ],
          },
          { label: "Pricing", href: "#" },
        ]}
      />
      <Breadcrumb
        items={[
          { label: "Docs", href: "#" },
          { label: "UI Kit", href: "#" },
          { label: "Navigation", href: "#" },
          { label: "Breadcrumb" },
        ]}
      />
      <Card>
        <Tabs
          model={tab}
          items={[
            { value: "overview", label: "Overview", content: <p>Overview panel</p> },
            { value: "billing", label: "Billing", content: <p>Billing panel</p> },
            { value: "team", label: "Team", content: <p>Team panel</p> },
          ]}
        />
      </Card>
      <Card>
        <Heading level={4}>Checkout progress</Heading>
        <Stepper
          model={step}
          onChange={(i) => { /* model already updated */ }}
          steps={[
            { label: "Account" },
            { label: "Shipping" },
            { label: "Payment" },
          ]}
        />
        <p>Current step: {() => read(step) + 1} of 3</p>
      </Card>
      <Pagination model={page} totalPages={7} />
      <p>Page {() => read(page)}</p>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const disclosure = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Card, Accordion, Collapsible, Wizard, Heading, Text,
} from "uele/ui";

const finished = signal(false);

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Card>
        <Heading level={4}>Frequently asked questions</Heading>
        <Accordion
          items={[
            { value: "offline", title: "Do playgrounds work offline?", content: <Text>Yes — every dependency is an inlined data-URL module.</Text> },
            { value: "vdom", title: "Is there a virtual DOM?", content: <Text>No. h() creates real nodes and signals patch them in place.</Text> },
            { value: "themes", title: "How does theming work?", content: <Text>ThemeProvider writes --uele-* CSS variables for the whole subtree.</Text> },
          ]}
        />
      </Card>
      <Collapsible label="Show advanced details">
        <Text>Collapsible is a single disclosure region; Accordion coordinates many.</Text>
      </Collapsible>
      <Card>
        <Heading level={4}>Setup wizard</Heading>
        <Wizard
          steps={[
            { label: "Profile", content: <Text>Step one: create your profile.</Text> },
            { label: "Workspace", content: <Text>Step two: name your workspace.</Text> },
            { label: "Done", content: <Text>Step three: you are ready.</Text> },
          ]}
          onFinish={() => { finished.value = true; }}
        />
        {() => (read(finished) ? <p>Wizard finished 🎉</p> : <span />)}
      </Card>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const overlays = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import {
  Stack, Row, Button, Dialog, Drawer, AlertDialog,
  Menu, Popover, HoverCard, CommandPalette, Text,
} from "uele/ui";

const chosen = signal("");

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Row>
        <Dialog
          trigger={<Button variant="solid">Open dialog</Button>}
          title="Edit profile"
          description="Dialogs handle Escape, overlay click and scroll lock themselves."
        >
          <Text>Any content can live here — forms, tables, another dialog trigger.</Text>
        </Dialog>
        <Drawer
          trigger={<Button variant="outline">Open drawer</Button>}
          title="Filters"
        >
          <Text>A Drawer (alias: Sheet) slides in from the side.</Text>
        </Drawer>
        <AlertDialog
          trigger={<Button variant="solid">Delete account</Button>}
          title="Delete this account?"
          danger
          confirmLabel="Delete"
          onConfirm={() => { chosen.value = "deleted"; }}
        >
          <Text>This action cannot be undone.</Text>
        </AlertDialog>
      </Row>
      <Row>
        <Menu
          label="Account menu"
          items={[
            { label: "Profile", onSelect: () => { chosen.value = "profile"; } },
            { label: "Billing", onSelect: () => { chosen.value = "billing"; } },
            { label: "Sign out", disabled: true },
          ]}
        />
        <Popover trigger="Open popover" label="Details">
          <Text>Popovers anchor to their trigger and close on Escape.</Text>
        </Popover>
        <HoverCard
          trigger={<Button variant="ghost">Hover me</Button>}
          content={<Text>HoverCards reveal richer content after a short delay.</Text>}
        />
        <CommandPalette
          trigger={<Button variant="outline">Open palette (⌘K)</Button>}
          items={[
            { label: "Go to Introduction", hint: "Docs", keywords: "start home", onSelect: () => { chosen.value = "intro"; } },
            { label: "Open UI Kit", hint: "Components", keywords: "button card", onSelect: () => { chosen.value = "uikit"; } },
            { label: "View examples", hint: "Gallery", keywords: "demo sample", onSelect: () => { chosen.value = "examples"; } },
          ]}
        />
      </Row>
      <Text>Last action: {() => read(chosen) || "none yet"}</Text>
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const toasts = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read, write } from "uele/reactive";
import { ThemeProvider } from "uele/themes";
import { Toaster, Button, Stack, Text } from "uele/ui";

const toasts = signal([]);
let nextId = 1;

const push = (tone) =>
  write(toasts, [
    ...read(toasts),
    {
      id: nextId++,
      title: tone === "danger" ? "Something failed" : "Changes saved",
      description: tone === "danger" ? "The build could not start." : "Your edits are live.",
      duration: 4000,
    },
  ]);

const App = () => (
  <ThemeProvider theme="light">
    <Stack>
      <Text>Toasts render from a single array cell; dismissing removes the item.</Text>
      <div>
        <Button variant="solid" onClick={() => push("success")}>Show toast</Button>{" "}
        <Button variant="outline" onClick={() => push("danger")}>Show error toast</Button>
      </div>
      <Toaster toasts={toasts} />
    </Stack>
  </ThemeProvider>
);

document.body.append(<App />);
`;

const shell = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { signal, read } from "uele/reactive";
import { ThemeProvider, useTheme } from "uele/themes";
import {
  AppShell, Navbar, Button, Stack, Row, Stat, Progress, Badge, Text,
} from "uele/ui";

const theme = useTheme("light");
const quota = signal(62);

const App = () => (
  <ThemeProvider theme={theme.theme}>
    <AppShell
      header={
        <Navbar
          brand="Acme"
          links={[
            { label: "Dashboard", href: "#", current: true },
            { label: "Projects", href: "#" },
            { label: "Team", href: "#" },
          ]}
          actions={
            <Button variant="outline" onClick={theme.toggle}>
              {() => (theme.appearance() === "dark" ? "Switch to light" : "Switch to dark")}
            </Button>
          }
        />
      }
      sidebar={
        <Stack>
          <strong>Workspace</strong>
          <a href="#">Overview</a>
          <a href="#">Deployments</a>
          <a href="#">Analytics</a>
          <a href="#">Settings</a>
        </Stack>
      }
      footer="Acme Inc. — this whole shell is uele components"
      main={
        <Stack>
          <Row>
            <h2 style={{ margin: 0 }}>Dashboard</h2>
            <Badge tone="success">Live</Badge>
          </Row>
          <Row>
            <Stat label="Visitors" value="48.2k" help="+12% this week" />
            <Stat label="Builds" value="319" help="99.4% success" />
            <Stat label="Latency" value="84ms" help="p95 global" />
          </Row>
          <Text>Monthly quota</Text>
          <Progress value={quota} label="Quota used" />
          <Text>Appearance: {() => theme.appearance()}</Text>
        </Stack>
      }
    />
  </ThemeProvider>
);

document.body.append(<App />);
`;

const routing = `
import { usePreactSignals } from "uele/adapters/preact";
usePreactSignals();
import { ThemeProvider } from "uele/themes";
import { Card, Heading, Text, Button } from "uele/ui";
import { createRouter, useRouter, Link } from "uele/router";

const app = createRouter();
app.get("/", () => (
  <Card>
    <Heading level={3}>Home route</Heading>
    <Text>The router matched "/" with no page reload.</Text>
    <Link to="/about">
      <Button variant="outline">Go to /about</Button>
    </Link>
  </Card>
));
app.get("/about", () => (
  <Card>
    <Heading level={3}>About route</Heading>
    <Text>Params, query strings and nested paths match the same way.</Text>
    <Link to="/">
      <Button variant="outline">Back home</Button>
    </Link>
  </Card>
));

const MiniApp = () => {
  // view is a signal cell; linkProps() intercepts in-app anchor clicks
  const [view, linkProps] = useRouter(app, <p>Starting router…</p>);
  return (
    <ThemeProvider theme="light">
      <div {...linkProps()}>{view}</div>
    </ThemeProvider>
  );
};

document.body.append(<MiniApp />);
`;

/* --------------------------------------------------------------- page */

export const title = "UI Kit";

export const markdown = `# UI Kit

uele ships a complete application-grade component library in **uele/ui** — ${UI_COMPONENT_COUNT} named exports covering forms, overlays, data display, navigation and full app chrome — a theming package in **uele/themes**, and a client-side router in **uele/router**. This page lists every export and runs live, editable examples of each family.

## Running a UI example

Every example below is a full mini-app. Three lines of setup are all that is required:

1. **Install a reactive preset** so the component cells work:
   \`\`\`js
   import { usePreactSignals } from "uele/adapters/preact";
   usePreactSignals();
   \`\`\`
2. **Wrap the tree in a \`ThemeProvider\`** from \`uele/themes\`. Components carry inline styles that read \`--uele-*\` CSS variables, so the provider themes the entire subtree — switch \`theme="light"\` to \`theme="dark"\` and every component follows.
3. **Bind state with \`model\`.** Inputs, selects, sliders, dialogs and tables all accept a signal cell as \`model\` for two-way binding; uncontrolled components take \`defaultValue\`/\`defaultOpen\`/\`defaultPage\` plus \`onChange\`.

Tones are always one of \`neutral | info | success | warning | danger\`; buttons use \`variant="solid | outline | ghost"\` and \`size="sm | lg"\`.

## Complete component index (${UI_COMPONENT_COUNT} exports)

Aliases are second names for the exact same component — pick the vocabulary your team uses.

${catalog}

## Live examples

### Buttons, badges & indicators

${fence(buttons)}

### Forms: every input bound to a cell

${fence(form)}

### Advanced inputs

${fence(advancedInputs)}

### Pickers, calendars & inline editing

${fence(pickers)}

### Layout, typography & avatars

${fence(layout)}

### Feedback: alerts, progress, stats, empty states

${fence(feedback)}

### Tables: sortable DataTable, composable Table, virtual list

${fence(tables)}

### Tree, timeline, relative time & carousel

${fence(treeAndTime)}

### Navigation: menus, breadcrumbs, tabs, stepper, pagination

${fence(navigation)}

### Disclosure: accordion, collapsible, wizard

${fence(disclosure)}

### Overlays: dialog, drawer, confirm, menu, popover, command palette

${fence(overlays)}

### Toasts from a single array cell

${fence(toasts)}

### App shell with live light/dark theming

${fence(shell)}

### Client-side routing with uele/router

The third workspace package, **uele/router**, completes the app story:
\`createRouter()\` matches paths (including \`:params\`), \`useRouter()\` returns
a live view cell plus link-interception props, and \`<Link>\` renders ordinary
anchors — so middle-click, open-in-new-tab and no-JS all keep working.

${fence(routing)}
`;
