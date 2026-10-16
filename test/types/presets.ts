import { usePreactSignals } from "uele/adapters/preact";
import { useVue } from "uele/adapters/vue";
import { useSolid } from "uele/adapters/solid";
import { useSwapdom } from "uele/diffs/swapdom";
import { useBuiltinDiff } from "uele/diffs/builtin";

// every preset is `(target?) => target`, fully typed
const api: object = {};
usePreactSignals();
useVue(api);
useSolid();
useSwapdom();
useBuiltinDiff(api);
