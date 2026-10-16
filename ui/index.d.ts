// `src/` is not published: the shipped types live next to the bundle
// Factory, not Component: `Component` is a union with `Node`, and TypeScript
// rejects a union without call signatures as a JSX element type (TS2604)
import type { Factory } from '../dist/index.d.ts';

type AnyProps = Record<string, unknown> & { children?: unknown };

export declare const Form: Factory<AnyProps & { onSubmit?: (event: Event) => void }>;
export declare const Field: Factory<AnyProps & { label?: unknown }>;
export declare const Label: Factory<AnyProps>;
export declare const Button: Factory<AnyProps>;
export declare const Input: Factory<AnyProps & { model?: unknown }>;
export declare const Textarea: Factory<AnyProps & { model?: unknown }>;
export declare const Checkbox: Factory<AnyProps & { model?: unknown }>;
export declare const Option: Factory<AnyProps>;
export declare const Select: Factory<AnyProps & { model?: unknown; options?: Array<unknown> }>;
export declare const Card: Factory<AnyProps>;
export declare const Stack: Factory<AnyProps>;
export declare const Row: Factory<AnyProps>;
