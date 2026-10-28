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

import { useSpect } from 'uele/diffs/spect';
useSpect();
useSpect({});
import { useSnabbdom } from 'uele/diffs/snabbdom';
useSnabbdom();
useSnabbdom({});
import { useStage0 } from 'uele/diffs/stage0';
useStage0();
useStage0({});

import { useHeckel } from 'uele/diffs/heckel';
useHeckel();
useHeckel({});

import { useListDifference } from 'uele/diffs/list-difference';
useListDifference();
useListDifference({});
