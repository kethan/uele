import { signal, computed, read, type Cell } from 'uele/reactive';
import { signal as nativeSignal } from '@preact/signals-core';
import { useCounter, useToggle, useAsync, useFetch, useLocalStorage, useWindowSize, usePrevious, useLatest, useForm, useLongPress } from 'uele/hooks';

const counter = useCounter(0);
const count: number = read(counter.count);
// @ts-expect-error counter setters only accept numeric values
counter.set('bad');
const toggle = useToggle();
toggle.set(true);
// @ts-expect-error toggle state is boolean
toggle.set(1);
const value = signal(1);
const doubled: Cell<number> = computed(() => read(value) * 2);
const native = nativeSignal(1);
const nativeValue: number = read(native);
usePrevious(native).dispose();
const latest: Cell<number> = useLatest(value).latest;
const viewport = useWindowSize();
const width: number = read(viewport.size).width;
viewport.dispose();
const storage = useLocalStorage('typed', { count: 1 });
storage.set({ count: 2 }); storage.dispose();
// @ts-expect-error persisted object shape is inferred
storage.set({ count: 'bad' });
const request = useAsync(async (id: number) => ({ id }));
request.run(1); request.dispose();
// @ts-expect-error async arguments are inferred
request.run('bad');
const fetcher = useFetch<{ name: string }>('/user');
const data: { name: string } | null = read(fetcher.data);
fetcher.dispose();
const form = useForm({ initialValues: { name: '' } });
form.setValue('name', 'Ada');
// @ts-expect-error form field value types are inferred
form.setValue('name', 1);
form.dispose();
const press = useLongPress(() => {}); press.props.onmousedown(); press.dispose();
// @ts-expect-error primitive wrappers are no longer exported from hooks
import { useSignal } from 'uele/hooks';
// @ts-expect-error hooks no longer re-export the reactive facade
import { read as hookRead } from 'uele/hooks';
// @ts-expect-error fake mount state was removed
import { useIsMounted } from 'uele/hooks';
void [count, doubled, nativeValue, latest, width, data];
