import type { Cell, Readable } from 'uele/reactive';

/** An opaque native cell. Use read/write from uele/reactive for portable access. */
export type { Cell } from 'uele/reactive';
export interface Disposable { dispose(): void }
export type Setter<T> = (value: T | ((previous: T) => T)) => void;
export type Target = EventTarget | (() => EventTarget | null) | { current: EventTarget | null } | null;
export interface ValueState<T> { value: Cell<T>; set: Setter<T> }
export type BindProps = Record<string, (event?: Event) => void>;
export type ElementTarget = Element | (() => Element | null) | { current: Element | null };
export declare function useId(prefix?: string): string;
export declare function useToggle(initial?: boolean): ValueState<boolean> & { toggle(value?: boolean): void };
export declare function useDisclosure(initial?: boolean): { open: Cell<boolean>; toggle(value?: boolean): void; setOpen: Setter<boolean>; show(): void; hide(): void; onOpenChange: Setter<boolean> };
export declare function useCounter(initial?: number, options?: { min?: number; max?: number; step?: number }): { count: Cell<number>; set: Setter<number>; inc(by?: number): void; dec(by?: number): void; reset(): void };
export declare function useControllable<T>(controlled: Readable<T> | T | null | undefined, initial: T, onChange?: (value: T) => void): ValueState<T>;
export declare function usePrevious<T>(source: Readable<T>): Disposable & { previous: Cell<T | undefined> };
export interface AsyncState<T, Args extends unknown[]> extends Disposable {
    data: Cell<T | null>; error: Cell<unknown>; loading: Cell<boolean>;
    run(...args: Args): Promise<T | undefined>;
    reset(): void;
    cancel(): void;
}
export declare function useAsync<Args extends unknown[], T>(fn: (...args: Args) => PromiseLike<T> | T, options?: { immediate?: boolean; initialData?: T | null }): AsyncState<T, Args>;
export declare function useHistory<T>(initial: T, capacity?: number): ValueState<T> & { undo(): void; redo(): void; canUndo: Cell<boolean>; canRedo: Cell<boolean>; clear(): void; past(): T[]; future(): T[] };
export declare function useList<T>(initial?: T[]): { list: Cell<T[]>; set: Setter<T[]>; push(...items: T[]): void; insert(index: number, ...items: T[]): void; removeAt(index: number): void; updateAt(index: number, item: T | ((previous: T) => T)): void; clear(): void };
export declare function useDebounce<T>(source: Readable<T>, delay?: number): Disposable & { value: Cell<T> };
export declare function useThrottle<T>(source: Readable<T>, interval?: number): Disposable & { value: Cell<T> };
export type ScheduledFunction<Args extends unknown[]> = ((...args: Args) => void) & Disposable & { cancel(): void };
export declare function useDebounceFn<Args extends unknown[]>(fn: (...args: Args) => void, delay?: number): ScheduledFunction<Args> & { flush(): void };
export declare function useThrottleFn<Args extends unknown[]>(fn: (...args: Args) => void, interval?: number): ScheduledFunction<Args>;
export interface Timer extends Disposable { start(): void; stop(): void; reset(): void; active(): boolean }
export declare function useInterval(callback: () => void, delay?: number | null): Timer;
export declare function useTimeout(callback: () => void, delay?: number | null): Timer;
export declare function useCountdown(seconds?: number, options?: { onComplete?: () => void }): Disposable & { count: Cell<number>; running: Cell<boolean>; start(): void; pause(): void; stop(): void; reset(to?: number): void };
export interface StorageState<T> extends Disposable { value: Cell<T | null>; set: Setter<T | null>; remove(): void }
export declare function useLocalStorage<T = unknown>(key: string, initial?: T): StorageState<T>;
export declare function useSessionStorage<T = unknown>(key: string, initial?: T): StorageState<T>;
export declare function useEventListener(target: Target, event: string, handler: EventListener, options?: boolean | AddEventListenerOptions): Disposable;
export declare function useMediaQuery(query: string): Disposable & { matches: Cell<boolean> };
export declare function useOnline(): Disposable & { online: Cell<boolean> };
export declare function useWindowSize(): Disposable & { size: Cell<{ width: number; height: number }> };
export declare function useKeyPress(key: string, handler?: (event: KeyboardEvent) => void): Disposable & { pressed: Cell<boolean> };
export declare function useHotkey(combo: string, handler: (event: KeyboardEvent) => void): Disposable;
export declare function useClickOutside(element: ElementTarget, handler: (event: Event) => void): Disposable;
export declare function useHover(): { hovered: Cell<boolean>; props: BindProps };
export declare function useFocus(): { focused: Cell<boolean>; props: BindProps };
export declare function useClipboard(options?: { timeout?: number }): Disposable & { copied: Cell<boolean>; copy(text: unknown): Promise<boolean | undefined> };
export declare function useIntersectionObserver(options?: IntersectionObserverInit): Disposable & { visible: Cell<boolean>; entry: Cell<IntersectionObserverEntry | null>; ref(el: Element | null): void; disconnect(): void };
export declare function useResizeObserver(): Disposable & { size: Cell<{ width: number; height: number }>; ref(el: Element | null): void; disconnect(): void };
export declare function paginationRange(page: number, totalPages: number, siblingCount?: number): Array<number | '…'>;
export declare function usePagination(options?: { total?: number | Readable<number>; pageSize?: number; initialPage?: number; page?: Readable<number>; siblingCount?: number; onChange?: (page: number) => void }): { page: Cell<number>; totalPages: Cell<number> | (() => number); range: Cell<Array<number | '…'>> | (() => Array<number | '…'>); canNext: Cell<boolean> | (() => boolean); canPrev: Cell<boolean> | (() => boolean); goTo(page: number): void; next(): void; prev(): void; first(): void; last(): void };
export declare function useOTP(length?: number, options?: { onComplete?: (code: string) => void }): { digits: Cell<string>[]; code(): string; setDigit(index: number, ch: string | null): void; clear(): void; isComplete(): boolean };
export declare function useForm<T extends Record<string, unknown> = Record<string, unknown>>(options?: { initialValues?: T; validate?: (values: T) => Record<string, string>; onSubmit?: (values: T) => unknown }): Disposable & {
    field<K extends keyof T & string>(name: K): Cell<T[K]>;
    register<K extends keyof T & string>(name: K): { model: Cell<T[K]>; name: K; onblur(): void } | undefined;
    values(): T; errors: Cell<Record<string, string>>; touched: Cell<Record<string, boolean>>; submitting: Cell<boolean>;
    validate(): Record<string, string> | undefined; handleSubmit(event?: Event): false | Promise<unknown> | undefined;
    setValue<K extends keyof T & string>(name: K, value: T[K]): void; setError(name: string, message: string): void;
    reset(next?: T): void; isValid(): boolean;
};
export declare function useNow(interval?: number | null): Disposable & { now: Cell<Date> };
export declare function useStopwatch(): Disposable & { elapsed: Cell<number>; running: Cell<boolean>; start(): void; pause(): void; reset(): void; lap(): number[] | undefined; laps(): number[] };
export declare function useWebSocket<T = unknown>(url: string, options?: { onMessage?: (data: T, event: MessageEvent) => void; protocols?: string | string[]; json?: boolean }): Disposable & { status: Cell<'connecting' | 'open' | 'closed' | 'error'>; lastMessage: Cell<T | null>; messages: Cell<T[]>; send(data: unknown): boolean | undefined; close(): void; open(): WebSocket | null | undefined; socket(): WebSocket | null };
export declare function useEventSource<T = unknown>(url: string, options?: { onMessage?: (data: T, event: MessageEvent) => void; withCredentials?: boolean }): Disposable & { status: Cell<'connecting' | 'open' | 'closed' | 'error'>; lastMessage: Cell<T | null>; messages: Cell<T[]>; close(): void; source(): EventSource | null };
export declare function useBroadcastChannel<T = unknown>(name: string, options?: { onMessage?: (data: T, event: MessageEvent) => void }): Disposable & { supported: boolean; lastMessage: Cell<T | null>; messages: Cell<T[]>; post(data: unknown): boolean | undefined; close(): void };
export declare function useFetch<T = unknown>(url?: string, options?: RequestInit): AsyncState<T, [url?: string, options?: RequestInit]> & { abort(): void };
export declare function useGeolocation(options?: { immediate?: boolean }): Disposable & { position: Cell<GeolocationPosition | null>; error: Cell<GeolocationPositionError | null>; loading: Cell<boolean>; refresh(): void; supported: boolean };
export declare function useDocumentVisibility(): Disposable & { visibility: Cell<DocumentVisibilityState> };
export declare function useWindowFocus(): Disposable & { focused: Cell<boolean> };
export declare function useScrollPosition(): Disposable & { position: Cell<{ x: number; y: number; direction: 'none' | 'up' | 'down' }> };
export declare function useScrollLock(): Disposable & { locked: Cell<boolean>; lock(): void; unlock(): void };
export declare function useFocusTrap(): Disposable & { ref(el: Element | null): void; activate(el?: Element): void; deactivate(): void; active(): boolean };
export declare function useFullscreen(target?: ElementTarget): Disposable & { fullscreen: Cell<boolean>; supported: boolean; enter(): unknown; exit(): unknown; toggle(): unknown };
export declare function useBreakpoint(breakpoints?: Record<string, number>): Disposable & { breakpoint: Cell<string> };
export declare function useColorScheme(options?: { persist?: boolean; key?: string; initial?: string }): Disposable & { scheme: Cell<string>; dark: Cell<boolean>; setScheme: Setter<string>; toggle(): void };
export declare function useQueryParam(key: string, initial?: string): Disposable & ValueState<string>;
export declare function useCookie(name: string, initial?: string): { value: Cell<string>; set(value: string | null | ((previous: string) => string), days?: number): void };
export declare function useIdle(timeout?: number): Disposable & { idle: Cell<boolean> };
export declare function useLongPress(handler: () => void, delay?: number): Disposable & { props: BindProps };
export interface SwipeInfo { dx: number; dy: number }
export declare function useSwipe(handlers?: { threshold?: number; onSwipeLeft?: (info: SwipeInfo) => void; onSwipeRight?: (info: SwipeInfo) => void; onSwipeUp?: (info: SwipeInfo) => void; onSwipeDown?: (info: SwipeInfo) => void }): { ontouchstart(event: TouchEvent): void; ontouchend(event: TouchEvent): void };
export declare function useAnimationFrame(callback: (time: number, delta: number) => void): Disposable & { start(): void; stop(): void; running: Cell<boolean> };
export declare function useInView(target?: ElementTarget, options?: IntersectionObserverInit): Disposable & { visible: Cell<boolean> };
export declare function useTitle(title: unknown): Disposable;
export declare function useLatest<T>(source: Readable<T>): Disposable & { latest: Cell<T> };
