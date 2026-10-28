import { title as introduction, markdown as introductionMd } from "./introduction.js";
import { title as installation, markdown as installationMd } from "./installation.js";
import { title as helloWorld, markdown as helloWorldMd } from "./hello-world.js";
import { title as elements, markdown as elementsMd } from "./elements.js";
import { title as components, markdown as componentsMd } from "./components.js";
import { title as state, markdown as stateMd } from "./state.js";
import { title as events, markdown as eventsMd } from "./events.js";
import { title as conditional, markdown as conditionalMd } from "./conditional.js";
import { title as lists, markdown as listsMd } from "./lists.js";
import { title as asyncPage, markdown as asyncMd } from "./async.js";
import { title as signals, markdown as signalsMd } from "./signals.js";
import { title as diffing, markdown as diffingMd } from "./diffing.js";
import { title as api, markdown as apiMd } from "./api.js";
import { title as uiKit, markdown as uiKitMd } from "./ui-kit.js";
import { title as playground, markdown as playgroundMd } from "./playground.js";
import { title as uiComponents, markdown as uiComponentsMd } from "./ui-components.js";
import { title as reactive, markdown as reactiveMd } from "./reactive.js";
import { title as presets, markdown as presetsMd } from "./presets.js";
import { title as diffs, markdown as diffsMd } from "./diffs.js";
import { title as themes, markdown as themesMd } from "./themes.js";
import { title as tutorial, markdown as tutorialMd } from "./tutorial.js";

export const PAGES = {
  introduction: { title: introduction, markdown: introductionMd },
  installation: { title: installation, markdown: installationMd },
  "hello-world": { title: helloWorld, markdown: helloWorldMd },
  playground: { title: playground, markdown: playgroundMd },
  elements: { title: elements, markdown: elementsMd },
  components: { title: components, markdown: componentsMd },
  state: { title: state, markdown: stateMd },
  events: { title: events, markdown: eventsMd },
  conditional: { title: conditional, markdown: conditionalMd },
  lists: { title: lists, markdown: listsMd },
  async: { title: asyncPage, markdown: asyncMd },
  signals: { title: signals, markdown: signalsMd },
  diffing: { title: diffing, markdown: diffingMd },
  api: { title: api, markdown: apiMd },
  "ui-kit": { title: uiKit, markdown: uiKitMd },
  "ui-components": { title: uiComponents, markdown: uiComponentsMd },
  reactive: { title: reactive, markdown: reactiveMd },
  presets: { title: presets, markdown: presetsMd },
  diffs: { title: diffs, markdown: diffsMd },
  themes: { title: themes, markdown: themesMd },
  tutorial: { title: tutorial, markdown: tutorialMd },
};
