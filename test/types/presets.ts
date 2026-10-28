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

import { useReflex } from 'uele/adapters/reflex';
useReflex();
useReflex({});
import { useReactively } from 'uele/adapters/reactively';
useReactively();
useReactively({});
import { useLiteSignal } from 'uele/adapters/lite-signal';
useLiteSignal();
useLiteSignal({});
import { useRescriptSignals } from 'uele/adapters/rescript-signals';
useRescriptSignals();
useRescriptSignals({});
import { useMaverick } from 'uele/adapters/maverick';
useMaverick();
useMaverick({});
import { useOby } from 'uele/adapters/oby';
useOby();
useOby({});
import { useAnod } from 'uele/adapters/anod';
useAnod();
useAnod({});
