(function () {
  "use strict";
  const Mitre = (window.Mitre = window.Mitre || {});
  const { config, state } = Mitre;

  function loadJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Не удалось прочитать сохранённые данные", error);
      return null;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Не удалось сохранить данные", error);
    }
  }

  function loadPresetsFromStorage() {
    state.replacePresets(loadJSON(config.PRESETS_STORAGE_KEY) || {});
  }

  function savePresetsToStorage() {
    saveJSON(config.PRESETS_STORAGE_KEY, state.presets);
  }

  function loadTacticState() {
    const saved = loadJSON(config.TACTIC_STATE_STORAGE_KEY);
    if (saved && typeof saved === "object") {
      Object.entries(saved).forEach(([code, value]) => {
        if (value) {
          state.tacticCollapseState.set(code, true);
        }
      });
    }
  }

  function persistTacticState() {
    const payload = {};
    state.tacticCollapseState.forEach((value, code) => {
      if (value) payload[code] = true;
    });
    saveJSON(config.TACTIC_STATE_STORAGE_KEY, payload);
  }

  function loadGreenFilterState() {
    return loadJSON(config.GREEN_FILTER_STORAGE_KEY) === true;
  }

  function saveGreenFilterState(enabled) {
    saveJSON(config.GREEN_FILTER_STORAGE_KEY, enabled);
  }

  function loadSettingsPanelState() {
    return loadJSON(config.SETTINGS_STATE_STORAGE_KEY) === true;
  }

  function saveSettingsPanelState(isOpen) {
    saveJSON(config.SETTINGS_STATE_STORAGE_KEY, isOpen);
  }

  function loadLastSelection() {
    return loadJSON(config.LAST_SELECTION_STORAGE_KEY);
  }

  function saveLastSelection(selection) {
    saveJSON(config.LAST_SELECTION_STORAGE_KEY, selection);
  }

  Mitre.storage = {
    loadJSON,
    saveJSON,
    loadPresetsFromStorage,
    savePresetsToStorage,
    loadTacticState,
    persistTacticState,
    loadGreenFilterState,
    saveGreenFilterState,
    loadSettingsPanelState,
    saveSettingsPanelState,
    loadLastSelection,
    saveLastSelection,
  };
})();
