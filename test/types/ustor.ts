import { api, type Api } from 'uele';
import { api as liteApi } from 'uele/lite';
import { store, api as storeApi } from 'ustor';
import { preactSignals } from 'uele/signals/preact';

preactSignals();
const { signal, get, set, is, computed } = api;
Object.assign(storeApi, { signal, get, set, is, computed, getComputed: get });
const constructor: NonNullable<typeof storeApi.computed> = computed!;
const getter: NonNullable<typeof storeApi.getComputed> = get!;
const state = store({ count: 0, profile: { name: 'Ada' }, get double() { return this.count * 2; } });
const doubled: number = state.double;
state.count++;
state.profile.name = 'Grace';
// @ts-expect-error UStor retains field value types
state.count = 'bad';
// @ts-expect-error derived was replaced by computed, not aliased
api.derived;
const supported: Pick<Api, 'signal' | 'computed' | 'set'> = api;
liteApi.computed?.(() => 2);
void [doubled, supported, constructor, getter];
