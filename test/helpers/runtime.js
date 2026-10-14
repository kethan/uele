import { beforeEach, afterEach, vi } from 'vitest';
import { effect } from 'ulive';

// Isolate mutable adapters and dispose effects, rather than relying on GC timing.
export function setupRuntime({ api, props }) {
  let savedApi, savedProps, disposers;
  beforeEach(() => {
    savedApi = { ...api };
    savedProps = new Map(props);
    disposers = [];
    Object.keys(api).forEach(key => delete api[key]);
    Object.assign(api, {
      is: value => !!value?.peek,
      get: value => value.value,
      effect: fn => {
        const stop = effect(fn);
        disposers.push(stop);
        return stop;
      },
    });
    props.clear();
  });
  afterEach(() => {
    disposers.forEach(stop => stop?.());
    Object.keys(api).forEach(key => delete api[key]);
    Object.assign(api, savedApi);
    props.clear();
    savedProps.forEach((value, key) => props.set(key, value));
    document.body.replaceChildren();
    vi.useRealTimers();
  });
}

export function mount(...nodes) {
  const host = document.createElement('main');
  host.append(...nodes.flat(Infinity));
  document.body.append(host);
  return host;
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// An actual DOM reconciler with the same integration signature as api.diff.
export function reconcile(parent, oldNodes, newNodes, end) {
  for (const node of oldNodes) if (!newNodes.includes(node)) node.remove();
  for (const node of newNodes) parent.insertBefore(node, end);
}
