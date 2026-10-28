// `src/` is not published: the shipped types live next to the bundle
// Factory, not Component: `Component` is a union with `Node`, and TypeScript
// rejects a union without call signatures as a JSX element type (TS2604)
import type { Factory } from '../dist/index.d.ts';

type AnyProps = Record<string, unknown> & { children?: unknown };
type ModelProps = AnyProps & { model?: unknown; value?: unknown; onChange?: (value: any) => void };

export declare const Form: Factory<AnyProps & { onSubmit?: (event: Event) => void }>;
export declare const Field: Factory<AnyProps & { label?: unknown }>;
export declare const Label: Factory<AnyProps>;
export declare const FieldHint: Factory<AnyProps>;
export declare const FieldError: Factory<AnyProps>;
export declare const Button: Factory<AnyProps & { variant?: 'solid' | 'outline' | 'ghost' | string; size?: 'sm' | 'md' | 'lg' | string }>;
export declare const Input: Factory<ModelProps & { onInput?: (event: Event) => void }>;
export declare const Textarea: Factory<ModelProps & { onInput?: (event: Event) => void }>;
export declare const Checkbox: Factory<ModelProps & { checked?: unknown; label?: unknown; onChange?: (event: Event) => void }>;
export declare const Option: Factory<AnyProps>;
export declare const Select: Factory<ModelProps & { options?: Array<unknown> }>;
export declare const Radio: Factory<ModelProps & { label?: unknown; name?: string }>;
export declare const RadioGroup: Factory<ModelProps & { name?: string; options?: Array<unknown> }>;
export declare const Switch: Factory<ModelProps & { checked?: unknown; label?: unknown; onCheckedChange?: (value: boolean) => void }>;
export declare const Slider: Factory<ModelProps & { min?: number; max?: number; step?: number }>;
export declare const Rating: Factory<ModelProps & { max?: number; label?: string }>;
export declare const NumberInput: Factory<ModelProps & { min?: number; max?: number; step?: number }>;
export declare const SearchInput: Factory<ModelProps & { onSearch?: (value: string) => void; placeholder?: string }>;
export declare const OTPInput: Factory<ModelProps & { length?: number; onComplete?: (code: string) => void; label?: string }>;
export declare const TagInput: Factory<ModelProps & { placeholder?: string }>;
export declare const FileInput: Factory<AnyProps & { onFiles?: (files: File[]) => void; accept?: string; multiple?: boolean; label?: unknown }>;
export declare const Dropzone: Factory<AnyProps & { onFiles?: (files: File[]) => void; accept?: string; multiple?: boolean }>;
export declare const Combobox: Factory<ModelProps & { options?: Array<unknown>; placeholder?: string; label?: string }>;

export declare const Card: Factory<AnyProps>;
export declare const Stack: Factory<AnyProps>;
export declare const Row: Factory<AnyProps>;
export declare const Grid: Factory<AnyProps & { columns?: number | string; gap?: string }>;
export declare const Container: Factory<AnyProps & { maxWidth?: string }>;
export declare const Center: Factory<AnyProps>;
export declare const Spacer: Factory<AnyProps & { size?: string | number }>;
export declare const Separator: Factory<AnyProps & { orientation?: 'horizontal' | 'vertical'; decorative?: boolean }>;
export declare const AspectRatio: Factory<AnyProps & { ratio?: string | number }>;
export declare const ScrollArea: Factory<AnyProps & { maxHeight?: string }>;

export declare const Heading: Factory<AnyProps & { level?: number }>;
export declare const Text: Factory<AnyProps & { as?: string }>;
export declare const Link: Factory<AnyProps & { href?: string }>;
export declare const Kbd: Factory<AnyProps>;
export declare const Code: Factory<AnyProps>;
export declare const Blockquote: Factory<AnyProps>;
export declare const List: Factory<AnyProps & { ordered?: boolean }>;
export declare const ListItem: Factory<AnyProps>;

export declare const Badge: Factory<AnyProps & { tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | string; variant?: string }>;
export declare const Avatar: Factory<AnyProps & { src?: unknown; alt?: string; name?: unknown; size?: number | string; fallback?: unknown }>;
export declare const Skeleton: Factory<AnyProps & { width?: string; height?: string; circle?: boolean }>;
export declare const Spinner: Factory<AnyProps & { label?: string }>;
export declare const Alert: Factory<AnyProps & { tone?: string; title?: unknown }>;
export declare const Progress: Factory<AnyProps & { value?: unknown; max?: number; label?: string }>;
export declare const Stat: Factory<AnyProps & { label?: unknown; value?: unknown; help?: unknown }>;
export declare const Empty: Factory<AnyProps & { title?: unknown; description?: unknown }>;

export declare const Table: Factory<AnyProps>;
export declare const TableHead: Factory<AnyProps>;
export declare const TableBody: Factory<AnyProps>;
export declare const TableRow: Factory<AnyProps>;
export declare const TableHeader: Factory<AnyProps>;
export declare const TableCell: Factory<AnyProps>;

export declare const Breadcrumb: Factory<AnyProps & { items?: Array<{ label: unknown; href?: string }>; separator?: unknown }>;
export declare const BreadcrumbItem: Factory<AnyProps>;
export declare const BreadcrumbLink: Factory<AnyProps & { href?: string; current?: boolean }>;
export declare const BreadcrumbSeparator: Factory<AnyProps>;
export declare const Pagination: Factory<AnyProps & {
	page?: unknown; defaultPage?: number; totalPages?: unknown; total?: unknown; pageSize?: number;
	siblingCount?: number; onChange?: (page: number) => void;
}>;
export declare function paginationRange(page: number, totalPages: number, siblingCount?: number): Array<number | '…'>;

export declare const TabList: Factory<AnyProps>;
export declare const Tab: Factory<AnyProps & { value?: unknown; selected?: unknown; active?: unknown; onSelect?: (value: any) => void }>;
export declare const TabPanel: Factory<AnyProps & { value?: unknown; selected?: unknown; active?: unknown }>;
export declare const Tabs: Factory<ModelProps & { defaultValue?: unknown; items?: Array<{ value: unknown; label: unknown; content?: unknown; disabled?: boolean }> }>;
export declare const AccordionItem: Factory<AnyProps & { value?: unknown; title?: unknown; header?: unknown; open?: unknown; onToggle?: (value: any) => void }>;
export declare const Accordion: Factory<ModelProps & { items?: Array<{ value: unknown; title: unknown; content?: unknown; disabled?: boolean }>; type?: 'single' | 'multiple'; defaultValue?: unknown; collapsible?: boolean }>;
export declare const Collapsible: Factory<AnyProps & { open?: unknown; defaultOpen?: boolean; trigger?: unknown; label?: unknown; onChange?: (open: boolean) => void }>;
export declare const Dialog: Factory<ModelProps & { open?: unknown; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; title?: unknown; description?: unknown; trigger?: unknown; closeLabel?: string }>;
export declare const Drawer: Factory<Parameters<typeof Dialog>[0] & { side?: 'right' | 'left' | 'top' | 'bottom' }>;
export declare const Popover: Factory<AnyProps & { trigger?: unknown; label?: unknown; open?: unknown; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }>;
export declare const Tooltip: Factory<AnyProps & { label?: unknown; text?: unknown }>;
export declare const MenuItem: Factory<AnyProps & { onSelect?: (event: Event) => void; disabled?: boolean }>;
export declare const Menu: Factory<AnyProps & { label?: unknown; trigger?: unknown; items?: Array<{ label: unknown; onSelect?: (item: any) => void; disabled?: boolean }>; onSelect?: (item: any) => void }>;
export declare const Toast: Factory<AnyProps & { open?: unknown; title?: unknown; description?: unknown; duration?: number; onClose?: () => void; onOpenChange?: (open: boolean) => void; action?: unknown }>;
export declare const Toaster: Factory<AnyProps & { toasts?: unknown }>;
export declare const Stepper: Factory<AnyProps & { steps?: Array<{ label: unknown; description?: unknown }> | number; current?: unknown; onChange?: (index: number) => void }>;
export declare const Carousel: Factory<AnyProps & { items?: unknown; renderItem?: (item: any, index: number) => unknown; index?: unknown; defaultIndex?: number; onChange?: (index: number) => void }>;

export declare const Toggle: Factory<AnyProps & { pressed?: unknown; value?: unknown; selected?: unknown; onPressedChange?: (value: boolean) => void }>;
export declare const ToggleGroup: Factory<ModelProps & { type?: 'single' | 'multiple'; options?: Array<unknown>; defaultValue?: unknown }>;
export declare const SegmentedControl: Factory<ModelProps & { options?: Array<unknown>; defaultValue?: unknown; label?: string }>;
export declare const AlertDialog: Factory<ModelProps & { open?: unknown; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; confirmLabel?: unknown; cancelLabel?: unknown; danger?: boolean; onConfirm?: (event: Event) => void; onCancel?: (event: Event) => void; title?: unknown; description?: unknown; trigger?: unknown }>;

export declare const VisuallyHidden: Factory<AnyProps>;
export declare const SkipLink: Factory<AnyProps & { href?: string }>;
export declare const StatusDot: Factory<AnyProps & { status?: 'online' | 'away' | 'busy' | 'offline' | string; label?: string }>;
export declare const AvatarGroup: Factory<AnyProps & { avatars?: Array<unknown>; max?: number }>;
export declare const InputGroup: Factory<AnyProps & { prefix?: unknown; suffix?: unknown }>;
export declare const PasswordInput: Factory<ModelProps & { showStrength?: boolean }>;
export declare const CopyButton: Factory<AnyProps & { text: unknown; label?: unknown; copiedLabel?: unknown }>;
export declare const ColorPicker: Factory<ModelProps & { swatches?: string[] }>;
export declare const Listbox: Factory<ModelProps & { options?: Array<unknown>; label?: string }>;
export declare const MultiSelect: Factory<ModelProps & { options?: Array<unknown>; placeholder?: string; label?: string }>;

export declare const Calendar: Factory<AnyProps & { model?: unknown; value?: unknown; defaultValue?: unknown; min?: unknown; max?: unknown; weekStartsOn?: number; onChange?: (date: Date, iso: string) => void }>;
export declare const DatePicker: Factory<ModelProps & { placeholder?: string; label?: string }>;
export declare const TimeAgo: Factory<AnyProps & { date?: unknown; value?: unknown; interval?: number }>;
export declare const CountdownTimer: Factory<AnyProps & { to?: unknown; seconds?: number; onComplete?: () => void }>;

export declare const DataTable: Factory<AnyProps & { columns?: Array<{ key: string; label: unknown; sortable?: boolean; render?: (value: any, row: any, index: number) => unknown }>; data?: unknown; rows?: unknown; pageSize?: number; empty?: unknown; onRowClick?: (row: any, index: number, event: Event) => void }>;
export declare const Tree: Factory<ModelProps & { items?: Array<{ label: unknown; value?: unknown; children?: Array<any> }>; defaultExpanded?: Array<unknown>; onSelect?: (value: any) => void }>;
export declare const VirtualList: Factory<AnyProps & { items?: unknown; itemHeight?: number; height?: number | string; overscan?: number; renderItem?: (item: any, index: number) => unknown }>;
export declare const InfiniteScroll: Factory<AnyProps & { onLoadMore?: () => void; loading?: unknown; hasMore?: unknown }>;
export declare const CommandPalette: Factory<AnyProps & { open?: unknown; defaultOpen?: boolean; trigger?: unknown; items?: Array<{ label: unknown; hint?: unknown; keywords?: string; onSelect?: (item: any) => void }>; placeholder?: string; onSelect?: (item: any) => void; onOpenChange?: (open: boolean) => void }>;

export declare const ContextMenu: Factory<AnyProps & { items?: Array<{ label: unknown; onSelect?: (item: any) => void; disabled?: boolean }>; onSelect?: (item: any) => void }>;
export declare const NavigationMenu: Factory<AnyProps & { items?: Array<{ label: unknown; href?: string; content?: unknown; links?: Array<{ label: unknown; href?: string }> }> }>;
export declare const HoverCard: Factory<AnyProps & { trigger?: unknown; content?: unknown; delay?: number }>;
export declare const SplitPane: Factory<ModelProps & { first?: unknown; second?: unknown; direction?: 'horizontal' | 'vertical'; defaultRatio?: number; min?: number; max?: number }>;
export declare const Editable: Factory<ModelProps & { placeholder?: string; label?: string }>;
export declare const Lightbox: Factory<AnyProps & { images?: Array<string | { src: string; alt?: string }> }>;
export declare const FileList: Factory<AnyProps & { files?: Array<{ name: string; size?: number; progress?: number; status?: string; error?: string }>; onRemove?: (file: any, index: number) => void }>;
export declare const Wizard: Factory<AnyProps & { steps?: Array<{ label: unknown; content?: unknown }>; defaultStep?: number; onChange?: (step: number) => void; onFinish?: (event: Event) => void; finishLabel?: unknown }>;

export declare const Toolbar: Factory<AnyProps & { label?: string }>;
export declare const Navbar: Factory<AnyProps & { brand?: unknown; links?: Array<{ label: unknown; href?: string; current?: boolean }>; actions?: unknown }>;
export declare const AppShell: Factory<AnyProps & { header?: unknown; sidebar?: unknown; footer?: unknown; main?: unknown }>;
export declare const Timeline: Factory<AnyProps & { items?: Array<{ title: unknown; time?: unknown; description?: unknown }> }>;
