import { preactSignals } from "uele/signals/preact";
import { vue } from "uele/signals/vue";
import { solid } from "uele/signals/solid";
import { swapdom } from "uele/diffs/swapdom";
import { builtinDiff } from "uele/diffs/builtin";

// every preset is `(target?) => target`, fully typed
const api: object = {};
preactSignals();
vue(api);
solid();
swapdom();
builtinDiff(api);

import { spect } from 'uele/diffs/spect';
spect();
spect({});
import { snabbdom } from 'uele/diffs/snabbdom';
snabbdom();
snabbdom({});
import { stage0 } from 'uele/diffs/stage0';
stage0();
stage0({});

import { heckel } from 'uele/diffs/heckel';
heckel();
heckel({});

import { listDifference } from 'uele/diffs/list-difference';
listDifference();
listDifference({});

import { reflex } from 'uele/signals/reflex';
reflex();
reflex({});
import { reactively } from 'uele/signals/reactively';
reactively();
reactively({});
import { liteSignal } from 'uele/signals/lite-signal';
liteSignal();
liteSignal({});
import { rescriptSignals } from 'uele/signals/rescript-signals';
rescriptSignals();
rescriptSignals({});
import { maverick } from 'uele/signals/maverick';
maverick();
maverick({});
import { oby } from 'uele/signals/oby';
oby();
oby({});
import { anod } from 'uele/signals/anod';
anod();
anod({});
