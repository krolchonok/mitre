(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});

  // Centralized mutable app state, shared via the Mitre.state namespace
  // object so every module always reads the current value off the object
  // (never destructure the mutable fields below into local bindings).

  const state = {
    tacticsData: [],
    isSyncingScroll: false,
    previewMode: "mitre",
    presets: {},
    greenTechniques: new Set(),
    greenSubtechniques: new Set(),

    codeIndexMap: {
      tactics: new Map(),
      techniques: new Map(),
      subtechniques: new Map(),
    },

    tacticCollapseState: new Map(),
  };

  state.setTacticsData = function (data) {
    state.tacticsData = data;
  };

  state.setSyncingScroll = function (value) {
    state.isSyncingScroll = value;
  };

  state.setPreviewModeState = function (mode) {
    state.previewMode = mode;
  };

  state.replacePresets = function (newPresets) {
    Object.keys(state.presets).forEach((key) => delete state.presets[key]);
    Object.assign(state.presets, newPresets || {});
  };

  state.setGreenCodeLists = function (techniques, subtechniques) {
    state.greenTechniques = techniques;
    state.greenSubtechniques = subtechniques;
  };

  // Minimal pub/sub so unrelated modules (selection state, live preview)
  // don't need to import each other directly.
  const selectionChangeListeners = [];
  state.onSelectionChanged = function (listener) {
    selectionChangeListeners.push(listener);
  };
  state.emitSelectionChanged = function () {
    selectionChangeListeners.forEach((listener) => listener());
  };

  Mitre.state = state;
})();
